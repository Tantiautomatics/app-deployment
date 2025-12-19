"""Verify and create admin user if needed"""
from database import SessionLocal
from models import User
from server import hash_password

db = SessionLocal()
try:
    admin_email = "admin@tantiautomatics.com"
    user = db.query(User).filter(User.email == admin_email).first()
    
    if not user:
        print(f"Creating user: {admin_email}")
        password_hash = hash_password("admin123")
        user = User(
            full_name="Admin User",
            email=admin_email,
            password_hash=password_hash,
            role="Admin",
            region="Headquarters",
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"User created successfully!")
    else:
        print(f"User exists: {admin_email}")
        print(f"Role: {user.role}")
        print(f"Is Active: {user.is_active}")
        # Reset password to ensure it's correct
        password_hash = hash_password("admin123")
        user.password_hash = password_hash
        user.is_active = True
        db.commit()
        print("Password reset to: admin123")
finally:
    db.close()


