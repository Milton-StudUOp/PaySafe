import asyncio
from sqlalchemy import text
from app.database import engine

async def add_approval_columns():
    async with engine.begin() as conn:
        print("Adding approval_status columns and creating jurisdiction_change_requests table...")
        
        # Add approval_status to markets
        try:
            await conn.execute(text("""
                ALTER TABLE markets 
                ADD COLUMN approval_status ENUM('APROVADO','PENDENTE','REJEITADO') 
                DEFAULT 'APROVADO'
            """))
            print("Added approval_status to markets.")
        except Exception as e:
            print(f"markets.approval_status might already exist: {e}")

        # Add approval_status to merchants
        try:
            await conn.execute(text("""
                ALTER TABLE merchants 
                ADD COLUMN approval_status ENUM('APROVADO','PENDENTE','REJEITADO') 
                DEFAULT 'APROVADO'
            """))
            print("Added approval_status to merchants.")
        except Exception as e:
            print(f"merchants.approval_status might already exist: {e}")

        # Add approval_status to agents
        try:
            await conn.execute(text("""
                ALTER TABLE agents 
                ADD COLUMN approval_status ENUM('APROVADO','PENDENTE','REJEITADO') 
                DEFAULT 'APROVADO'
            """))
            print("Added approval_status to agents.")
        except Exception as e:
            print(f"agents.approval_status might already exist: {e}")

        # Add approval_status to pos_devices
        try:
            await conn.execute(text("""
                ALTER TABLE pos_devices 
                ADD COLUMN approval_status ENUM('APROVADO','PENDENTE','REJEITADO') 
                DEFAULT 'APROVADO'
            """))
            print("Added approval_status to pos_devices.")
        except Exception as e:
            print(f"pos_devices.approval_status might already exist: {e}")

        # Create jurisdiction_change_requests table
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS jurisdiction_change_requests (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    entity_type ENUM('MARKET','MERCHANT','AGENT','POS') NOT NULL,
                    entity_id BIGINT NOT NULL,
                    current_province VARCHAR(100) NULL,
                    current_district VARCHAR(100) NULL,
                    requested_province VARCHAR(100) NOT NULL,
                    requested_district VARCHAR(100) NULL,
                    requested_by_user_id BIGINT NOT NULL,
                    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status ENUM('PENDENTE','APROVADO','REJEITADO') DEFAULT 'PENDENTE',
                    reviewed_by_admin_id BIGINT NULL,
                    reviewed_at TIMESTAMP NULL,
                    review_notes TEXT NULL,
                    FOREIGN KEY (requested_by_user_id) REFERENCES users(id),
                    FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id),
                    INDEX idx_status (status),
                    INDEX idx_entity (entity_type, entity_id)
                )
            """))
            print("Created jurisdiction_change_requests table.")
        except Exception as e:
            print(f"jurisdiction_change_requests table might already exist: {e}")
            
    print("Done.")

if __name__ == "__main__":
    asyncio.run(add_approval_columns())
