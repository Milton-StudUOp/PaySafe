"""Check SUPERVISOR users and their scopes"""
from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL.replace('+aiomysql', '+pymysql'))
conn = engine.connect()

# Check SUPERVISOR users
print("=" * 60)
print("SUPERVISOR USERS:")
print("=" * 60)
result = conn.execute(text("""
    SELECT id, full_name, email, role, scope_province, scope_district 
    FROM users 
    WHERE role = 'SUPERVISOR'
    LIMIT 10
"""))
for row in result.fetchall():
    print(f"  ID={row[0]}, Name={row[1]}, Province={row[4]}, District={row[5]}")

# Check merchant 95
print("\n" + "=" * 60)
print("MERCHANT ID 95:")
print("=" * 60)
result = conn.execute(text("""
    SELECT m.id, m.full_name, m.market_id, mk.name as market_name, mk.province, mk.district 
    FROM merchants m 
    JOIN markets mk ON m.market_id = mk.id 
    WHERE m.id = 95
"""))
for row in result.fetchall():
    print(f"  ID={row[0]}, Name={row[1]}, Market={row[3]}, Province={row[4]}, District={row[5]}")

conn.close()
print("\nDone!")
