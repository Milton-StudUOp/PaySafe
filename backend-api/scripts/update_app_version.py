"""
Script to update app_versions table with new APK release.
Called by deploy_apk.bat
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import text

async def update_version(version, version_code, min_version, filename, url, sha256, size, notes, force):
    from app.database import engine
    
    async with engine.begin() as conn:
        # Deactivate old versions
        await conn.execute(text("UPDATE app_versions SET is_active = FALSE WHERE is_active = TRUE"))
        
        # Insert or update version (UPSERT)
        await conn.execute(
            text("""
                INSERT INTO app_versions 
                (version, version_code, min_required_version, apk_filename, apk_url, sha256_hash, file_size_bytes, release_notes, force_update, is_active)
                VALUES (:v, :vc, :mv, :fn, :url, :hash, :size, :notes, :force, TRUE)
                ON DUPLICATE KEY UPDATE
                    version_code = :vc,
                    min_required_version = :mv,
                    apk_filename = :fn,
                    apk_url = :url,
                    sha256_hash = :hash,
                    file_size_bytes = :size,
                    release_notes = :notes,
                    force_update = :force,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
            """),
            {
                "v": version,
                "vc": int(version_code),
                "mv": min_version,
                "fn": filename,
                "url": url,
                "hash": sha256,
                "size": int(size),
                "notes": notes,
                "force": bool(int(force))
            }
        )
        
    print("[OK] Database updated successfully!")
    print(f"    Version: {version}")
    print(f"    URL: {url}")

if __name__ == "__main__":
    if len(sys.argv) != 10:
        print("Usage: update_app_version.py <version> <version_code> <min_version> <filename> <url> <sha256> <size> <notes> <force>")
        sys.exit(1)
    
    asyncio.run(update_version(*sys.argv[1:]))
