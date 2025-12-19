"""
Migration Script: Migrate existing local files to S3
Run this script once to migrate all existing files from local storage to S3
"""
import asyncio
import os
from pathlib import Path
from sqlalchemy.orm import Session
from database_cloud import get_db, init_db
from models import DesignDeliverable
from storage_service import StorageService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_files_to_s3():
    """
    Migrate all existing local files to S3
    Updates database records with new S3 URLs
    """
    # Check if S3 is configured
    if os.environ.get("STORAGE_TYPE") != "s3":
        logger.error("STORAGE_TYPE is not set to 's3'. Set environment variables first.")
        return
    
    db: Session = next(get_db())
    
    try:
        # Get all design deliverables with local file paths
        deliverables = db.query(DesignDeliverable).filter(
            ~DesignDeliverable.url.startswith("s3://")
        ).all()
        
        logger.info(f"Found {len(deliverables)} files to migrate")
        
        migrated = 0
        failed = 0
        
        for deliverable in deliverables:
            try:
                # Read local file
                local_path = deliverable.url
                if not os.path.isabs(local_path):
                    local_path = os.path.join(os.getcwd(), local_path)
                
                if not os.path.exists(local_path):
                    logger.warning(f"File not found: {local_path}, skipping...")
                    failed += 1
                    continue
                
                # Read file content
                with open(local_path, "rb") as f:
                    file_content = f.read()
                
                # Upload to S3
                s3_url = await StorageService.upload_file(
                    file_content=file_content,
                    file_name=deliverable.name,
                    folder="design-deliverables"
                )
                
                # Update database record
                old_url = deliverable.url
                deliverable.url = s3_url
                db.commit()
                
                logger.info(f"Migrated: {deliverable.name} -> {s3_url}")
                migrated += 1
                
                # Optional: Delete local file after successful migration
                # os.remove(local_path)
                
            except Exception as e:
                logger.error(f"Failed to migrate {deliverable.name}: {e}")
                failed += 1
                db.rollback()
        
        logger.info(f"Migration complete! Migrated: {migrated}, Failed: {failed}")
        
    except Exception as e:
        logger.error(f"Migration error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting file migration to S3...")
    print("Make sure you have set the following environment variables:")
    print("  - STORAGE_TYPE=s3")
    print("  - S3_BUCKET=your-bucket-name")
    print("  - AWS_ACCESS_KEY_ID=your-key")
    print("  - AWS_SECRET_ACCESS_KEY=your-secret")
    print("  - AWS_REGION=us-east-1")
    print()
    
    response = input("Continue? (yes/no): ")
    if response.lower() == "yes":
        asyncio.run(migrate_files_to_s3())
    else:
        print("Migration cancelled.")




