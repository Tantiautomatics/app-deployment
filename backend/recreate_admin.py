"""
Script to recreate the admin user if it doesn't exist.
"""
from database import get_db
from models import User
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def recreate_admin():
    """Recreate admin user if it doesn't exist"""
    db = next(get_db())
    try:
        admin_email = "admin@tantiautomatics.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        
        if admin:
            print(f"Admin user already exists: {admin_email}")
            return
        
        # Create admin user
        password_hash = hash_password("admin123")
        admin = User(
            full_name="Admin User",
            email=admin_email,
            password_hash=password_hash,
            role="Admin",
            region="Headquarters",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print(f"Admin user created successfully: {admin_email}")
        print("Password: admin123")
        
    except Exception as e:
        db.rollback()
        print(f"Error recreating admin user: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Recreating admin user...")
    print("=" * 50)
    recreate_admin()
    print("=" * 50)
    print("Done!")







