import sys
import os
import asyncio

# Add parent directory to path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from app.models.user import User, UserRole, UserStatus
from app.database import Base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
     DATABASE_URL = "mysql+aiomysql://root:password@localhost/paysafe_db"

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def create_admin():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            # Check if admin exists
            from sqlalchemy import select
            result = await session.execute(select(User).where(User.username == "admin"))
            existing_user = result.scalars().first()
            
            if existing_user:
                print("Admin user 'admin' already exists.")
                return

            print("Creating admin user...")
            new_admin = User(
                full_name="Administrator",
                email="admin@paysafe.co.mz",
                username="admin", 
                password_hash=pwd_context.hash("admin123"),
                role=UserRole.ADMIN,
                status=UserStatus.ATIVO
            )
            session.add(new_admin)
            print("Admin user created successfully.")
            print("Username: admin")
            print("Password: admin123")

if __name__ == "__main__":
    asyncio.run(create_admin())
