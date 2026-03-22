import asyncio
import sys

from core.database import async_session_factory
from modules.auth.models import User
from core.security import hash_password
from sqlalchemy import select

async def main():
    async with async_session_factory() as db:
        result = await db.execute(select(User).filter(User.username == "admin"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                email="admin@navdashboard.local",
                username="admin",
                hashed_password=hash_password("admin123"),
                full_name="Madhur",
                role="ADMIN"
            )
            db.add(user)
            await db.commit()
            print("Admin user created successfully! (admin@navdashboard.com / admin123)")
        else:
            print("Admin user already exists!")

if __name__ == "__main__":
    asyncio.run(main())
