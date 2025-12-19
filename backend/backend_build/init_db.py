"""Initialize database with admin user and sample data"""
from database import init_db, SessionLocal
from models import User, Project, MilestoneGrid, Notification, ActivityLog
import bcrypt
from datetime import datetime, timedelta

def init_database():
    # Initialize database tables
    init_db()
    
    # Create session
    db = SessionLocal()
    
    try:
        # Check if admin user exists
        admin = db.query(User).filter(User.email == "admin@tantiprojects.com").first()
        if not admin:
            # Create admin user
            password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            admin = User(
                full_name="Admin User",
                email="admin@tantiprojects.com",
                password_hash=password_hash,
                role="Admin",
                region="Headquarters"
            )
            db.add(admin)
            db.commit()
            print("[OK] Admin user created")
        else:
            print("[INFO] Admin user already exists")
        
        # Create sample projects
        projects_data = [
            {
                "name": "Skyline Residential Complex",
                "client": "Skyline Developers",
                "region": "Bengaluru",
                "value": 50000000.0,
                "progress": 65.0,
                "status": "Active",
                "type": "Residential",
                "start_date": datetime.utcnow() - timedelta(days=180),
                "end_date": datetime.utcnow() + timedelta(days=180),
                "days_remaining": 180,
                "created_by": 1
            },
            {
                "name": "Tech Park Phase 2",
                "client": "TechCorp Industries",
                "region": "Bengaluru",
                "value": 75000000.0,
                "progress": 15.0,
                "status": "Planning",
                "type": "Commercial",
                "start_date": datetime.utcnow() - timedelta(days=30),
                "end_date": datetime.utcnow() + timedelta(days=330),
                "days_remaining": 330,
                "created_by": 1
            },
            {
                "name": "Green Valley Villas",
                "client": "Green Valley Builders",
                "region": "Mysore",
                "value": 35000000.0,
                "progress": 100.0,
                "status": "Completed",
                "type": "Residential",
                "start_date": datetime.utcnow() - timedelta(days=365),
                "end_date": datetime.utcnow() - timedelta(days=30),
                "days_remaining": 0,
                "created_by": 1
            }
        ]
        
        for project_data in projects_data:
            existing = db.query(Project).filter(Project.name == project_data["name"]).first()
            if not existing:
                project = Project(**project_data)
                db.add(project)
        
        db.commit()
        print("[OK] Sample projects created")
        
        # Create sample milestone grid entries
        milestone_grids_data = [
            {
                "project_id": "TAPL001",
                "project_name": "Raghu & Shalini HSR Layout",
                "branch": "Bengaluru",
                "priority": "Low",
                "sales_team": "Vignesh",
                "immediate_action": "",
                "site_engineer": "Sr Kiran",
                "ongoing_milestone": "",
                "upcoming_milestone": "",
                "owner": "Zeenath",
                "progress_pct": 15.0,
                "status": "Active",
                "m_entry_electrical_labour": True,
                "m_entry_electrical_design": False,
                "m_entry_essential": False,
                "m_entry_automation": False
            },
            {
                "project_id": "TAPL002",
                "project_name": "Dr Venu Residence",
                "branch": "Mysore",
                "priority": "Low",
                "sales_team": "",
                "immediate_action": "",
                "site_engineer": "",
                "ongoing_milestone": "",
                "upcoming_milestone": "",
                "owner": "Likith",
                "progress_pct": 5.0,
                "status": "Planning"
            }
        ]
        
        for grid_data in milestone_grids_data:
            existing = db.query(MilestoneGrid).filter(MilestoneGrid.project_id == grid_data["project_id"]).first()
            if not existing:
                milestone_grid = MilestoneGrid(**grid_data)
                db.add(milestone_grid)
        
        db.commit()
        print("[OK] Sample milestone grid entries created")

        # Create sample notifications
        if not db.query(Notification).first():
            db.add_all([
                Notification(user_id=1, message="Welcome to Tanti Projects!", link="/dashboard"),
                Notification(user_id=1, message="2 projects updated milestones", link="/milestones")
            ])
            db.commit()
            print("[OK] Sample notifications created")

        # Create sample activity logs
        if not db.query(ActivityLog).first():
            db.add_all([
                ActivityLog(project_id=1, user_id=1, action="Project Created", details="Skyline Residential Complex"),
                ActivityLog(project_id=1, user_id=1, action="Milestone Updated", details="Entry Point → Electrical Labour"),
                ActivityLog(project_id=2, user_id=1, action="Project Created", details="Tech Park Phase 2")
            ])
            db.commit()
            print("[OK] Sample activity logs created")
        
        print("\n[SUCCESS] Database initialized successfully!")
        print("\nDefault Login Credentials:")
        print("Email: admin@tantiprojects.com")
        print("Password: admin123")
        
    except Exception as e:
        print(f"[ERROR] Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()

