import logging
import os
import shutil
import subprocess
from datetime import datetime

from core.config import settings

logger = logging.getLogger(__name__)

BACKUP_DIR = "/backups"
SUBPROCESS_TIMEOUT = 120
RESTORE_TIMEOUT = 300

UNSUPPORTED_PARAMS = [
    "transaction_timeout",
]

UNSUPPORTED_METACOMMANDS = [
    "\\restrict",
    "\\allow",
]


def _sanitize_sql_file(filepath: str) -> str:
    """Remove unsupported commands from SQL dump for cross-version compatibility."""
    sanitized_path = filepath + ".sanitized"
    with open(filepath, "r") as infile, open(sanitized_path, "w") as outfile:
        for line in infile:
            skip = False
            stripped = line.strip()
            # Skip unsupported SET parameters (e.g. transaction_timeout from PG17)
            for param in UNSUPPORTED_PARAMS:
                if param in line and stripped.startswith("SET"):
                    skip = True
                    break
            # Skip unsupported metacommands (e.g. \restrict from pg_dump v17)
            if not skip:
                for meta in UNSUPPORTED_METACOMMANDS:
                    if stripped.startswith(meta):
                        skip = True
                        break
            if not skip:
                outfile.write(line)
    return sanitized_path


def _terminate_other_connections() -> tuple[bool, str]:
    """Terminate all other connections to the database so restore can acquire locks."""
    psql_path = shutil.which("psql")
    if not psql_path:
        for path in ["/usr/bin/psql", "/usr/local/bin/psql"]:
            if os.path.exists(path):
                psql_path = path
                break
    if not psql_path:
        return False, "psql not found"

    terminate_sql = (
        "SELECT pg_terminate_backend(pid) "
        "FROM pg_stat_activity "
        f"WHERE datname = '{settings.POSTGRES_DB}' "
        "AND pid <> pg_backend_pid();"
    )
    cmd = [
        psql_path,
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_USER,
        "-d", settings.POSTGRES_DB,
        "-c", terminate_sql,
    ]
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_PASSWORD
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=15)
        if result.returncode != 0:
            logger.warning(f"Failed to terminate connections: {result.stderr}")
            return False, result.stderr
        logger.info("Terminated other database connections for restore")
        return True, "OK"
    except Exception as e:
        logger.warning(f"Error terminating connections: {e}")
        return False, str(e)


async def create_pg_dump() -> str:
    """Run pg_dump and save to backup directory. Returns filename."""
    os.makedirs(BACKUP_DIR, exist_ok=True)

    pg_dump_path = shutil.which("pg_dump")
    if not pg_dump_path:
        for path in ["/usr/bin/pg_dump", "/usr/local/bin/pg_dump"]:
            if os.path.exists(path):
                pg_dump_path = path
                break

    if not pg_dump_path:
        raise RuntimeError(
            "pg_dump not available in container. "
            "Install postgresql-client in the backend Dockerfile."
        )

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"navdashboard_backup_{timestamp}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)

    cmd = [
        pg_dump_path,
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_USER,
        "-d", settings.POSTGRES_DB,
        "-f", filepath,
        "--no-owner",
        "--no-acl",
        "--clean",
        "--if-exists",
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, env=env,
            timeout=SUBPROCESS_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"pg_dump timed out after {SUBPROCESS_TIMEOUT}s")

    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed: {result.stderr}")

    logger.info(f"Backup created: {filename}")
    return filename


async def restore_pg_dump(filename: str) -> str:
    """Restore from a pg_dump file. Returns status message."""
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Backup file not found: {filename}")

    psql_path = shutil.which("psql")
    if not psql_path:
        for path in ["/usr/bin/psql", "/usr/local/bin/psql"]:
            if os.path.exists(path):
                psql_path = path
                break

    if not psql_path:
        raise RuntimeError(
            "psql not available in container. "
            "Install postgresql-client in the backend Dockerfile."
        )

    # Terminate other database connections so DROP/ALTER can acquire exclusive locks
    ok, msg = _terminate_other_connections()
    if not ok:
        logger.warning(f"Could not terminate DB connections (restore may be slow): {msg}")

    sanitized_path = _sanitize_sql_file(filepath)

    cmd = [
        psql_path,
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_USER,
        "-d", settings.POSTGRES_DB,
        "-f", sanitized_path,
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, env=env,
            timeout=RESTORE_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        if os.path.exists(sanitized_path):
            os.remove(sanitized_path)
        raise RuntimeError(
            f"psql restore timed out after {RESTORE_TIMEOUT}s. "
            "The database may have active connections holding locks. "
            "Try again or restart the backend service before restoring."
        )

    if os.path.exists(sanitized_path):
        os.remove(sanitized_path)

    if result.returncode != 0:
        error_msg = result.stderr[:500] if result.stderr else "Unknown error"
        # psql often returns non-zero for warnings; check if it's truly fatal
        if "FATAL" in (result.stderr or "") or "could not connect" in (result.stderr or ""):
            raise RuntimeError(f"psql restore failed: {error_msg}")
        logger.warning(f"psql restore completed with warnings: {error_msg}")

    logger.info(f"Restored from: {filename}")
    return f"Successfully restored from {filename}"


async def list_backups() -> list[dict]:
    """List all backup files in the backup directory."""
    backups = []
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        return backups

    for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if f.endswith((".sql", ".dump")):
            filepath = os.path.join(BACKUP_DIR, f)
            stat = os.stat(filepath)
            backups.append({
                "filename": f,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "backup_type": "pg_dump",
            })
    return backups


async def delete_backup(filename: str):
    """Delete a backup file."""
    filepath = os.path.join(BACKUP_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        logger.info(f"Backup deleted: {filename}")
    else:
        raise FileNotFoundError(f"Backup file not found: {filename}")