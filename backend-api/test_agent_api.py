"""Test API response for agent"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, time
from sqlalchemy import func, and_
from app.config import settings
from app.models import Agent as AgentModel, Transaction

async def test_agent_stats():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        agent_id = 23
        
        # Get agent
        result = await db.execute(
            select(AgentModel).where(AgentModel.id == agent_id)
        )
        agent = result.scalar_one_or_none()
        
        if not agent:
            print(f"Agent {agent_id} not found")
            return
            
        print(f"Agent: {agent.full_name} (ID: {agent.id})")
        
        # Calculate stats
        now = datetime.now()
        today_start = datetime.combine(now.date(), time.min)
        month_start = datetime(now.year, now.month, 1)
        
        # Today's stats
        today_stats = await db.execute(
            select(
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count")
            ).where(
                and_(
                    Transaction.agent_id == agent_id,
                    Transaction.created_at >= today_start,
                    Transaction.status == "SUCESSO"
                )
            )
        )
        today_row = today_stats.one()
        print(f"\nCalculated Stats:")
        print(f"  total_collected_today: {float(today_row.total or 0)}")
        print(f"  transactions_count_today: {int(today_row.count or 0)}")
        
        # Month's stats
        month_stats = await db.execute(
            select(func.sum(Transaction.amount))
            .where(
                and_(
                    Transaction.agent_id == agent_id,
                    Transaction.created_at >= month_start,
                    Transaction.status == "SUCESSO"
                )
            )
        )
        print(f"  total_collected_month: {float(month_stats.scalar() or 0)}")

if __name__ == "__main__":
    asyncio.run(test_agent_stats())
