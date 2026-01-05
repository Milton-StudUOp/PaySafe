"""
Script to create app_versions and app_update_events tables.
Run this to set up the APK update system.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

async def create_tables():
    from app.database import engine
    
    async with engine.begin() as conn:
        # Create app_versions table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS app_versions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                version VARCHAR(20) NOT NULL UNIQUE,
                version_code INT NOT NULL,
                min_required_version VARCHAR(20) NOT NULL,
                apk_filename VARCHAR(255) NOT NULL,
                apk_url VARCHAR(500) NULL,
                sha256_hash VARCHAR(64) NOT NULL,
                file_size_bytes INT NULL,
                release_notes TEXT NULL,
                force_update BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_version (version),
                INDEX idx_version_code (version_code),
                INDEX idx_active (is_active)
            )
        """))
        print("[OK] Created app_versions table")
        
        # Create app_update_events table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS app_update_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pos_id INT NULL,
                device_serial VARCHAR(100) NULL,
                old_version VARCHAR(20) NOT NULL,
                new_version VARCHAR(20) NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                error_message TEXT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(255) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_pos_id (pos_id),
                INDEX idx_event_type (event_type),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            )
        """))
        print("[OK] Created app_update_events table")
        
        # Insert initial version (1.0.0)
        await conn.execute(text("""
            INSERT IGNORE INTO app_versions 
            (version, version_code, min_required_version, apk_filename, sha256_hash, release_notes, is_active)
            VALUES ('1.0.0', 1, '1.0.0', 'paysafe_pos_1.0.0.apk', 'pending', 'Versao inicial', TRUE)
        """))
        print("[OK] Inserted initial version 1.0.0")
        
    print("\n[DONE] Migration complete!")

if __name__ == "__main__":
    asyncio.run(create_tables())
