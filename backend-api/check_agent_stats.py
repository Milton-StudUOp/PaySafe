"""Check agent statistics calculation"""
from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL.replace('+aiomysql', '+pymysql'))
conn = engine.connect()

# Check Agent 23 transactions today
print("=" * 60)
print("AGENT 23 TRANSACTIONS TODAY:")
print("=" * 60)
result = conn.execute(text("""
    SELECT SUM(amount) as total, COUNT(*) as count 
    FROM transactions 
    WHERE agent_id = 23 AND status = 'SUCESSO' AND DATE(created_at) = CURDATE()
"""))
row = result.fetchone()
print(f"  Today Total: {row[0]}, Count: {row[1]}")

# Check All Transactions with agent_id
print("\n" + "=" * 60)
print("TRANSACTION DISTRIBUTION BY AGENT:")
print("=" * 60)
result = conn.execute(text("""
    SELECT agent_id, COUNT(*) as count, SUM(amount) as total 
    FROM transactions 
    WHERE status = 'SUCESSO' 
    GROUP BY agent_id
    ORDER BY count DESC
    LIMIT 10
"""))
for row in result.fetchall():
    print(f"  Agent {row[0]}: {row[1]} transactions, Total: {row[2]}")

conn.close()
print("\nDone!")
