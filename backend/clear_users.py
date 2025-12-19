"""
Script to clear all user login data from the database.
This will delete all users except admin@tantiautomatics.com so you can register from scratch.
"""
from database import get_db, engine
from models import User
from sqlalchemy import text

def clear_all_users():
    """Delete all users from the database except admin@tantiautomatics.com"""
    db = next(get_db())
    try:
        # Count all users before deletion
        total_count = db.query(User).count()
        print(f"Found {total_count} user(s) in the database.")
        
        # Check if admin exists
        admin_user = db.query(User).filter(User.email == "admin@tantiautomatics.com").first()
        if admin_user:
            print(f"Preserving admin user: {admin_user.email}")
        
        # Count users to be deleted
        users_to_delete = db.query(User).filter(User.email != "admin@tantiautomatics.com").count()
        
        if users_to_delete == 0:
            print("No users to delete (only admin user exists).")
            return
        
        # Delete all users except admin
        deleted_count = db.query(User).filter(User.email != "admin@tantiautomatics.com").delete()
        db.commit()
        
        print(f"Successfully deleted {deleted_count} user(s) from the database.")
        print("Admin user (admin@tantiautomatics.com) has been preserved.")
        print("You can now register a new account from scratch.")
        
    except Exception as e:
        db.rollback()
        print(f"Error clearing users: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Clearing all user login data...")
    print("=" * 50)
    clear_all_users()
    print("=" * 50)
    print("Done!")

