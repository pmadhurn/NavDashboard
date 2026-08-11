import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from core.config import settings
from core.database import Base

# Model imports for autogenerate
from shared.audit import AuditLog  # noqa
from modules.auth.models import User  # noqa
from modules.devices.models import Device, DeviceStatusHistory  # noqa
from modules.personnel.models import Person, AssignmentHistory  # noqa
from modules.inventory.models import FittingMaterial, MaterialTemplate  # noqa
from modules.locations.models import Location, LocationHistory  # noqa
from modules.couples.models import Couple  # noqa
from modules.pairs.models import Pair  # noqa
from modules.troubleshooting.models import ErrorLog, TroubleshootEntry  # noqa
from modules.status.models import StatusChangeLog  # noqa
from modules.documents.models import Document  # noqa
from modules.ai_assistant.models import ChatSession, ChatMessage, EmbeddingDocument  # noqa
from modules.settings.models import SystemSetting  # noqa

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name == "spatial_ref_sys":
        return False
    if type_ == "table" and reflected and compare_to is None:
        return False
    return True


def run_migrations_offline() -> None:
    url = settings.async_database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(
        settings.async_database_url,
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()