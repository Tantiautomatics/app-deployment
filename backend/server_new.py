from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import bcrypt
import jwt
import logging

from database import get_db, init_db
from models import User, Project, Milestone as MilestoneModel, MilestoneGrid
from sqlalchemy.orm import Session

# Initialize database
init_db()

# JWT Configuration
JWT_SECRET = "your-super-secret-key-change-in-production"
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Tanti Projects API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# PYDANTIC MODELS
# =========================

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str
    region: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    region: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str
    client: str
    region: str
    value: float
    status: str = "Planning"
    type: str
    start_date: datetime
    end_date: datetime

class ProjectResponse(BaseModel):
    id: int
    name: str
    client: str
    region: str
    value: float
    progress: float
    status: str
    type: str
    start_date: datetime
    end_date: datetime
    days_remaining: Optional[int]
    created_by: int
    
    class Config:
        from_attributes = True

class MilestoneGridResponse(BaseModel):
    id: int
    project_id: str
    project_name: str
    branch: str
    priority: str
    sales_team: Optional[str]
    immediate_action: Optional[str]
    site_engineer: Optional[str]
    ongoing_milestone: Optional[str]
    upcoming_milestone: Optional[str]
    owner: Optional[str]
    progress_pct: float
    status: str
    
    class Config:
        from_attributes = True

# =========================
# UTILITY FUNCTIONS
# =========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: int, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = db.query(User).filter(User.id == payload['user_id']).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# =========================
# AUTH ENDPOINTS
# =========================

@api_router.post("/auth/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pw = hash_password(user_data.password)
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_pw,
        role=user_data.role,
        region=user_data.region
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserResponse.from_orm(new_user)

@api_router.post("/auth/login")
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user.id, user.email, user.role)
    
    return {
        "token": token,
        "user": UserResponse.from_orm(user)
    }

@api_router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)

# =========================
# PROJECT ENDPOINTS
# =========================

@api_router.post("/projects", response_model=ProjectResponse)
def create_project(project_data: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_project = Project(
        name=project_data.name,
        client=project_data.client,
        region=project_data.region,
        value=project_data.value,
        status=project_data.status,
        type=project_data.type,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        created_by=current_user.id
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return ProjectResponse.from_orm(new_project)

@api_router.get("/projects", response_model=List[ProjectResponse])
def get_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return [ProjectResponse.from_orm(p) for p in projects]

# =========================
# MILESTONE GRID ENDPOINTS
# =========================

@api_router.get("/milestones/grid")
def get_milestones_grid(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all milestones in grid format"""
    milestones = db.query(MilestoneGrid).all()
    return [MilestoneGridResponse.from_orm(m).dict() for m in milestones]

@api_router.put("/milestones/grid/{milestone_id}")
def update_milestone_grid_cell(
    milestone_id: int,
    update_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a single cell in the milestone grid and recalculate progress"""
    milestone = db.query(MilestoneGrid).filter(MilestoneGrid.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    field = update_data.get('field')
    value = update_data.get('value')
    
    if not field:
        raise HTTPException(status_code=400, detail="Field is required")
    
    # Update the field
    setattr(milestone, field, value)
    milestone.updated_at = datetime.utcnow()
    
    # Recalculate progress if milestone field was updated
    if field.startswith('m'):
        # Count all milestone checkboxes
        milestone_fields = [col for col in MilestoneGrid.__table__.columns.keys() if col.startswith('m')]
        completed = sum(1 for col in milestone_fields if getattr(milestone, col) is True)
        total = len(milestone_fields)
        milestone.progress_pct = round((completed / total * 100) if total > 0 else 0)
    
    db.commit()
    db.refresh(milestone)
    
    return MilestoneGridResponse.from_orm(milestone).dict()

@api_router.post("/milestones/grid")
def create_milestone_grid(
    milestone_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new milestone grid row"""
    new_milestone = MilestoneGrid(**milestone_data)
    db.add(new_milestone)
    db.commit()
    db.refresh(new_milestone)
    
    return MilestoneGridResponse.from_orm(new_milestone).dict()

# =========================
# DASHBOARD ENDPOINTS
# =========================

@api_router.get("/dashboard/stats")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_projects = db.query(Project).count()
    active_projects = db.query(Project).filter(Project.status == "Active").count()
    completed_projects = db.query(Project).filter(Project.status == "Completed").count()
    at_risk_projects = db.query(Project).filter(Project.status == "At-Risk").count()
    
    # Get projects by region
    all_projects = db.query(Project).all()
    projects_by_region = {}
    projects_by_status = {}
    
    for p in all_projects:
        region = p.region or 'Unknown'
        projects_by_region[region] = projects_by_region.get(region, 0) + 1
        
        status = p.status or 'Unknown'
        projects_by_status[status] = projects_by_status.get(status, 0) + 1
    
    return {
        "kpi": {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "completed_projects": completed_projects,
            "at_risk_projects": at_risk_projects
        },
        "projects_by_region": projects_by_region,
        "projects_by_status": projects_by_status
    }

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Tanti Project Management API...")
    logger.info("Database: SQLite (tanti.db)")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)







