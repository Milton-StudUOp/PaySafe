from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False, # Set to True for debugging SQL
    pool_pre_ping=True,  # Test connection before using
    pool_recycle=300,    # Recycle connections every 5 mins (prevents MySQL timeout issues)
    pool_size=5,         # Smaller baseline pool
    max_overflow=15,     # Allow burst to 20 total
    pool_timeout=10,     # Wait max 10 seconds for connection
    connect_args={
        "connect_timeout": 10,  # MySQL connection timeout
    }
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
