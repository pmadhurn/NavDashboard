import io
import logging
from datetime import timedelta

from minio import Minio
from minio.error import S3Error

from core.config import settings

logger = logging.getLogger(__name__)


class MinIOStorage:
    def __init__(self):
        endpoint = getattr(settings, "MINIO_ENDPOINT", "minio:9000")
        access_key = getattr(settings, "MINIO_ROOT_USER", "navdashboard")
        secret_key = getattr(settings, "MINIO_ROOT_PASSWORD", "navdashboard_minio_secret")
        self.bucket = getattr(settings, "MINIO_BUCKET", "navdashboard-files")
        self.client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=False,
        )

    async def ensure_bucket(self):
        """Create bucket if it doesn't exist."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except Exception as e:
            logger.error(f"Failed to ensure MinIO bucket: {e}")
            raise RuntimeError(f"MinIO connection failed: {e}")

    async def upload_file(self, file_data: bytes, object_name: str, content_type: str) -> str:
        """Upload file bytes to MinIO. Returns the object name (storage path)."""
        self.client.put_object(
            self.bucket,
            object_name,
            io.BytesIO(file_data),
            length=len(file_data),
            content_type=content_type,
        )
        return object_name

    async def download_file(self, object_name: str) -> bytes:
        """Download file from MinIO. Returns bytes."""
        response = self.client.get_object(self.bucket, object_name)
        data = response.read()
        response.close()
        response.release_conn()
        return data

    async def delete_file(self, object_name: str):
        """Delete file from MinIO."""
        self.client.remove_object(self.bucket, object_name)

    async def get_presigned_url(self, object_name: str, expires_hours: int = 1) -> str:
        """Generate presigned download URL."""
        return self.client.presigned_get_object(
            self.bucket, object_name, expires=timedelta(hours=expires_hours)
        )


def get_storage() -> MinIOStorage:
    """Dependency for FastAPI."""
    return MinIOStorage()