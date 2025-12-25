from sqlalchemy import Column, BigInteger, String, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Province(Base):
    __tablename__ = "provinces"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(10), nullable=False, unique=True)  # e.g., "MAP" for Maputo
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationship to municipalities
    municipalities = relationship("Municipality", back_populates="province", cascade="all, delete-orphan")


class Municipality(Base):
    __tablename__ = "municipalities"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    province_id = Column(BigInteger, ForeignKey("provinces.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationship to province
    province = relationship("Province", back_populates="municipalities")
