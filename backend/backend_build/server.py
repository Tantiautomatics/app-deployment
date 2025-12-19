from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Form, Body
import os
import smtplib
from email.mime.text import MIMEText
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import bcrypt
import jwt
import logging

from database import get_db, init_db, engine
from sqlalchemy import text, func, or_
from models import User, Project, Milestone as MilestoneModel, ScopeItem as ScopeItemModel, MilestoneGrid, Notification, ActivityLog, MaterialRequest, PurchaseOrder, Issue, DesignDeliverable, Document
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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

# Serve uploaded files (for downloads)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
    project_id: Optional[str] = None

class ProjectUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    client: Optional[str] = None
    region: Optional[str] = None
    value: Optional[float] = None
    type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

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

class TaskCreate(BaseModel):
    assignee_id: Optional[int] = None
    assignee_email: Optional[EmailStr] = None
    message: str
    link: Optional[str] = None

class MaterialRequestCreate(BaseModel):
    title: str
    items: Optional[str] = None
    needed_by: Optional[datetime] = None
    status: Optional[str] = "Pending"
    assignee_email: Optional[EmailStr] = None

class MaterialRequestResponse(BaseModel):
    id: int
    title: str
    items: Optional[str]
    needed_by: Optional[datetime]
    status: str
    assignee_email: Optional[str]
    requested_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PurchaseOrderCreate(BaseModel):
    title: str
    vendor: Optional[str] = None
    amount: Optional[float] = None
    items: Optional[str] = None
    status: Optional[str] = "Draft"

class PurchaseOrderResponse(BaseModel):
    id: int
    title: str
    vendor: Optional[str]
    amount: Optional[float]
    items: Optional[str]
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class IssueCreate(BaseModel):
    project_id: int
    title: str
    description: str
    severity: str
    assigned_to: Optional[str] = None

class IssueResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    severity: str
    status: str
    assigned_to: Optional[str]
    created_by: int
    created_at: datetime
    updated_at: datetime

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

def normalize_bool(value: Any) -> bool:
    """Normalize various checkbox representations to a strict boolean.
    Accepts True/False, 1/0, 'true'/'false', '1'/'0', 'yes'/'no', 'on'/'off'.
    """
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    if isinstance(value, str):
        v = value.strip().lower()
        return v in {"true", "1", "yes", "on"}
    return False

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
    
    return UserResponse.model_validate(new_user)

@api_router.post("/auth/login")
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_token(user.id, user.email, user.role)
        
        return {
            "token": token,
            "user": UserResponse.model_validate(user)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

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
    
    # Automatically create a milestone grid row for the new project
    try:
        # Use provided project_id or generate a unique one (format: TAPL001, TAPL002, etc.)
        if project_data.project_id:
            milestone_project_id = project_data.project_id
            # Check if this ID already exists
            if db.query(MilestoneGrid).filter(MilestoneGrid.project_id == milestone_project_id).first():
                logging.warning(f"Project ID '{milestone_project_id}' already exists, generating new one")
                milestone_project_id = None
        
        if not milestone_project_id:
            existing_count = db.query(MilestoneGrid).count()
            milestone_project_id = f"TAPL{str(existing_count + 1).zfill(3)}"
            
            # Check if this ID already exists, if so, increment
            while db.query(MilestoneGrid).filter(MilestoneGrid.project_id == milestone_project_id).first():
                existing_count += 1
                milestone_project_id = f"TAPL{str(existing_count + 1).zfill(3)}"
        
        new_milestone_row = MilestoneGrid(
            project_id=milestone_project_id,
            project_name=new_project.name,
            branch=new_project.region,
            priority="Low",
            progress_pct=0.0,
            status="Active"
        )
        db.add(new_milestone_row)
        db.commit()
        db.refresh(new_milestone_row)
        logging.info(f"Created milestone grid row for project '{new_project.name}' with ID '{milestone_project_id}'")
    except Exception as e:
        logging.error(f"Failed to create milestone grid row for project '{new_project.name}': {e}")
        # Don't fail project creation if milestone grid creation fails
        # Project is already committed, so we just log the error
    
    return ProjectResponse.model_validate(new_project)

@api_router.get("/projects", response_model=List[ProjectResponse])
def get_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    
    # Recalculate progress from milestone grid for all projects
    for project in projects:
        all_milestones = db.query(MilestoneGrid).filter(
            func.lower(MilestoneGrid.project_name) == func.lower(project.name)
        ).all()
        if all_milestones:
            avg_progress = sum(m.progress_pct or 0 for m in all_milestones) / len(all_milestones)
            project.progress = round(avg_progress, 2)
    
    db.commit()
    return [ProjectResponse.model_validate(p) for p in projects]

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Recalculate progress from milestone grid to ensure it's up-to-date
    all_milestones = db.query(MilestoneGrid).filter(
        func.lower(MilestoneGrid.project_name) == func.lower(project.name)
    ).all()
    if all_milestones:
        avg_progress = sum(m.progress_pct or 0 for m in all_milestones) / len(all_milestones)
        old_progress = project.progress
        project.progress = round(avg_progress, 2)
        db.commit()
        db.refresh(project)
        logging.info(f"Project '{project.name}': Updated progress from {old_progress}% to {project.progress}% (from {len(all_milestones)} milestone rows)")
    else:
        logging.warning(f"Project '{project.name}': No milestone grid rows found matching this project name")
    
    return ProjectResponse.model_validate(project)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    update_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project fields (status, etc.)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update only provided fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(project, key, value)
    
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    
    return ProjectResponse.model_validate(project)

# =========================
# MILESTONE GRID ENDPOINTS
# =========================

@api_router.get("/milestones/grid")
def get_milestones_grid(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all milestones in grid format"""
    milestones = db.query(MilestoneGrid).all()
    return [MilestoneGridResponse.model_validate(m).model_dump() for m in milestones]

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
    
    # Update the field (normalize boolean inputs for checkbox fields)
    if field.startswith('m'):
        setattr(milestone, field, normalize_bool(value))
    else:
        setattr(milestone, field, value)
    milestone.updated_at = datetime.utcnow()
    
    # Recalculate progress if milestone field was updated
    if field.startswith('m'):
        # Equal-weight across all checkboxes from entry point and milestones 1..10
        prefixes = ['m_entry_'] + [f"m{i}_" for i in range(1, 11)]
        keys = [c for c in MilestoneGrid.__table__.columns.keys() if any(c.startswith(p) for p in prefixes)]
        total = len(keys)
        completed = sum(1 for k in keys if normalize_bool(getattr(milestone, k)))
        milestone.progress_pct = round((completed / total * 100) if total > 0 else 0)
    
    # Update project progress based on milestone grid progress (for any milestone-related update)
    if field.startswith('m') or field == 'progress_pct':
        # Find project by matching project_name (case-insensitive using func.lower)
        project = db.query(Project).filter(
            func.lower(Project.name) == func.lower(milestone.project_name)
        ).first()
        if project:
            # Calculate average progress of all milestone grid rows for this project
            all_milestones = db.query(MilestoneGrid).filter(
                func.lower(MilestoneGrid.project_name) == func.lower(project.name)
            ).all()
            if all_milestones:
                avg_progress = sum(m.progress_pct or 0 for m in all_milestones) / len(all_milestones)
                project.progress = round(avg_progress, 2)
                logging.info(f"Updated project '{project.name}' progress to {project.progress}% based on {len(all_milestones)} milestone rows")
    
    db.commit()
    db.refresh(milestone)
    
    return MilestoneGridResponse.model_validate(milestone).model_dump()

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
    
    return MilestoneGridResponse.model_validate(new_milestone).model_dump()

@api_router.delete("/milestones/grid/{milestone_id}")
def delete_milestone_grid_row(
    milestone_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        row = db.query(MilestoneGrid).filter(MilestoneGrid.id == milestone_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Milestone not found")
        db.delete(row)
        db.commit()
        return {"status": "deleted", "id": milestone_id}
    except Exception as e:
        db.rollback()
        logging.error(f"Error deleting milestone grid row {milestone_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete row: {str(e)}")

# =========================
# SIMPLE MILESTONES AND SCOPE LISTING (for Project Workspace)
# =========================

@api_router.get("/milestones")
def list_milestones(project_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(MilestoneModel)
    if project_id is not None:
        query = query.filter(MilestoneModel.project_id == project_id)
    items = query.all()
    # Shape minimal response used by UI
    return [
        {
            "id": m.id,
            "name": m.name,
            "start_date": m.start_date,
            "end_date": m.end_date,
            "status": m.status,
            "progress": m.progress,
        }
        for m in items
    ]

@api_router.get("/scope")
def list_scope_items(project_id: Optional[int] = None, milestone_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ScopeItemModel)
    if project_id is not None:
        query = query.filter(ScopeItemModel.project_id == project_id)
    if milestone_id is not None:
        query = query.filter(ScopeItemModel.milestone_id == milestone_id)
    items = query.all()
    return [
        {
            "id": s.id,
            "sl_no": s.sl_no,
            "description": s.description,
            "type": s.type,
            "status": s.status,
            "progress": s.progress,
            "remarks": s.remarks,
        }
        for s in items
    ]

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

# =========================
# PROJECT SUMMARY (for Dashboard)
# =========================

@api_router.get("/projects/summary")
def get_projects_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get projects summary for dashboard"""
    try:
        total_projects = db.query(Project).count()
        active_projects = db.query(Project).filter(Project.status == "Active").count()
        completed_projects = db.query(Project).filter(Project.status == "Completed").count()
        at_risk_projects = db.query(Project).filter(Project.status == "At-Risk").count()
        on_hold_projects = db.query(Project).filter(Project.status == "On-Hold").count()

        # Financials
        all_projects = db.query(Project).all()
        total_value = float(sum(p.value or 0 for p in all_projects))
        active_value = float(sum((p.value or 0) for p in all_projects if p.status == "Active"))
        completed_value = float(sum((p.value or 0) for p in all_projects if p.status == "Completed"))

        # By region
        projects_by_region = {}
        for p in all_projects:
            region = p.region or "Bengaluru"
            projects_by_region[region] = projects_by_region.get(region, 0) + 1

        return {
            "total_projects": int(total_projects),
            "active_projects": int(active_projects),
            "completed_projects": int(completed_projects),
            "at_risk_projects": int(at_risk_projects),
            "on_hold_projects": int(on_hold_projects),
            "financial_summary": {
                "total_value": total_value,
                "active_value": active_value,
                "completed_value": completed_value,
            },
            "projects_by_region": projects_by_region,
        }
    except Exception as e:
        logging.error(f"Error in get_projects_summary: {e}")
        import traceback
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/activity-logs")
def get_activity_logs(project_id: Optional[int] = None, limit: int = 20, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ActivityLog)
    if project_id is not None:
        query = query.filter(ActivityLog.project_id == project_id)
    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "project_id": l.project_id,
            "user_id": l.user_id,
            "action": l.action,
            "details": l.details,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]

@api_router.get("/notifications")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": n.id,
            "message": n.message,
            "link": n.link,
            "read": n.read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]

@api_router.put("/notifications/mark-read")
def mark_notifications_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.read == False
    ).update({Notification.read: True})
    db.commit()
    return {"message": "All notifications marked as read"}

# =========================
# TASKS (lightweight via notifications)
# =========================

@api_router.post("/tasks")
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a simple task by sending a notification to an assignee.
    This leverages the existing Notification table and shows up in the UI popups.
    """
    if not task.assignee_id and not task.assignee_email:
        raise HTTPException(status_code=400, detail="Assignee id or email is required")

    assignee = None
    if task.assignee_id:
        assignee = db.query(User).filter(User.id == task.assignee_id).first()
    elif task.assignee_email:
        assignee = db.query(User).filter(User.email == task.assignee_email).first()
    if not assignee and task.assignee_email and task.assignee_email == current_user.email:
        assignee = current_user
    if not assignee:
        # If the assignee is not in the system, try sending a direct email.
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")
        smtp_from = os.getenv("SMTP_FROM", smtp_user or "")
        if not (smtp_host and smtp_user and smtp_pass and smtp_from):
            raise HTTPException(
                status_code=404,
                detail="Assignee not found. Invite or register the user first, or assign to yourself."
            )
        # Compose email
        subject = f"Task from {current_user.full_name}"
        body = f"""{task.message}

Link: {task.link or '/tasks'}
"""
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = smtp_from
        msg["To"] = task.assignee_email
        try:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_from, [task.assignee_email], msg.as_string())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
        # Also log activity even for external email
        log = ActivityLog(
            project_id=None,
            user_id=current_user.id,
            action="assign_task",
            details=f"Assigned task via email to {task.assignee_email}: {task.message}",
            created_at=datetime.utcnow(),
        )
        db.add(log)
        db.commit()
        return {
            "id": None,
            "message": f"Email sent to {task.assignee_email}",
            "link": task.link or "/tasks",
            "read": True,
            "created_at": datetime.utcnow().isoformat(),
            "assignee_email": task.assignee_email,
            "sent_email": True,
        }

    notif = Notification(
        user_id=assignee.id,
        message=f"Task from {current_user.full_name}: {task.message}",
        link=task.link or "/tasks",
        read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    # Optional activity log
    log = ActivityLog(
        project_id=None,
        user_id=current_user.id,
        action="assign_task",
        details=f"Assigned task to {assignee.email}: {task.message}",
        created_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    db.refresh(notif)
    return {
        "id": notif.id,
        "message": notif.message,
        "link": notif.link,
        "read": notif.read,
        "created_at": notif.created_at.isoformat(),
        "assignee_id": assignee.id,
    }

@api_router.get("/tasks/assigned-by-me")
def get_tasks_assigned_by_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return tasks the current user assigned (based on activity logs)."""
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id, ActivityLog.action == "assign_task")
        .order_by(ActivityLog.created_at.desc())
        .all()
    )
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "message": l.details,
            "created_at": l.created_at.isoformat(),
        })
    return results

# =========================
# MATERIAL REQUESTS
# =========================

@api_router.get("/material-requests", response_model=List[MaterialRequestResponse])
def list_material_requests(project_id: Optional[int] = None, mine: Optional[bool] = False, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # project_id not used yet as schema doesn't link requests to projects; reserved for future
    query = db.query(MaterialRequest)
    if mine:
        query = query.filter(MaterialRequest.requested_by == current_user.id)
    requests = query.order_by(MaterialRequest.created_at.desc()).all()
    return [MaterialRequestResponse.model_validate(r) for r in requests]

@api_router.post("/material-requests", response_model=MaterialRequestResponse)
def create_material_request(req: MaterialRequestCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mr = MaterialRequest(
        title=req.title,
        items=req.items,
        needed_by=req.needed_by,
        status=req.status or "Pending",
        assignee_email=req.assignee_email,
        requested_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(mr)
    db.commit()
    db.refresh(mr)
    # Optional notification to assignee if user exists
    if req.assignee_email:
        assignee = db.query(User).filter(User.email == req.assignee_email).first()
        if assignee:
            notif = Notification(
                user_id=assignee.id,
                message=f"Material Request from {current_user.full_name}: {req.title}",
                link="/materials",
                read=False,
                created_at=datetime.utcnow(),
            )
            db.add(notif)
            db.commit()
    return MaterialRequestResponse.model_validate(mr)

@api_router.put("/material-requests/{request_id}", response_model=MaterialRequestResponse)
def update_material_request(request_id: int, data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mr = db.query(MaterialRequest).filter(MaterialRequest.id == request_id).first()
    if not mr:
        raise HTTPException(status_code=404, detail="Material Request not found")
    # Update allowed fields
    for key in ["title", "items", "needed_by", "status"]:
        if key in data:
            setattr(mr, key, data[key])
    mr.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(mr)
    return MaterialRequestResponse.model_validate(mr)

# =========================
# PURCHASE ORDERS
# =========================

@api_router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(mine: Optional[bool] = False, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(PurchaseOrder)
    if mine:
        query = query.filter(PurchaseOrder.created_by == current_user.id)
    orders = query.order_by(PurchaseOrder.created_at.desc()).all()
    return [PurchaseOrderResponse.model_validate(p) for p in orders]

@api_router.post("/purchase-orders", response_model=PurchaseOrderResponse)
def create_purchase_order(po: PurchaseOrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = PurchaseOrder(
        title=po.title,
        vendor=po.vendor,
        amount=po.amount,
        items=po.items,
        status=po.status or "Draft",
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return PurchaseOrderResponse.model_validate(order)

# =========================
# ISSUES
# =========================

@api_router.get("/issues", response_model=List[IssueResponse])
def list_issues(project_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Issue)
    if project_id is not None:
        query = query.filter(Issue.project_id == project_id)
    issues = query.order_by(Issue.created_at.desc()).all()
    return [IssueResponse.model_validate(i) for i in issues]

@api_router.post("/issues", response_model=IssueResponse)
def create_issue(issue_data: IssueCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    issue = Issue(
        project_id=issue_data.project_id,
        title=issue_data.title,
        description=issue_data.description,
        severity=issue_data.severity,
        assigned_to=issue_data.assigned_to,
        status="Open",
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return IssueResponse.model_validate(issue)

# =========================
# DESIGN DELIVERABLES
# =========================

class DesignDeliverableResponse(BaseModel):
    id: int
    project_id: int
    type: str
    name: str
    url: str
    version: int
    uploaded_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: int
    project_id: int
    type: str
    name: str
    url: str
    version: int
    uploaded_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

@api_router.get("/design-deliverables", response_model=List[DesignDeliverableResponse])
def list_design_deliverables(project_id: Optional[int] = None, type: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        query = db.query(DesignDeliverable)
        if project_id is not None:
            query = query.filter(DesignDeliverable.project_id == project_id)
        if type is not None:
            query = query.filter(DesignDeliverable.type == type)
        deliverables = query.order_by(DesignDeliverable.created_at.desc()).all()
        return [DesignDeliverableResponse.model_validate(d) for d in deliverables]
    except Exception as e:
        logging.error(f"Error fetching design deliverables: {e}")
        return []

@api_router.post("/design-deliverables/upload")
async def upload_design_deliverable(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    deliverable_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        project_id_int = int(project_id)
        import os
        import uuid
        from pathlib import Path
        
        upload_dir = Path("uploads/design-deliverables")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")
        
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    
        # Store a web-friendly relative URL so frontend can open via /uploads
        saved_url = f"uploads/design-deliverables/{unique_filename}"
        deliverable = DesignDeliverable(
            project_id=project_id_int,
            type=deliverable_type,
            name=file.filename,
            url=saved_url,
            version=1,
            uploaded_by=current_user.id,
            created_at=datetime.utcnow()
        )
        db.add(deliverable)
        db.commit()
        db.refresh(deliverable)
        return DesignDeliverableResponse.model_validate(deliverable)
    except Exception as e:
        logging.error(f"Error uploading design deliverable: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload design deliverable: {str(e)}")

# =========================
# DOCUMENTS ENDPOINTS
# =========================

@api_router.get("/documents", response_model=List[DocumentResponse])
def list_documents(project_id: Optional[int] = None, type: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        query = db.query(Document)
        if project_id is not None:
            query = query.filter(Document.project_id == project_id)
        if type is not None:
            query = query.filter(Document.type == type)
        documents = query.all()
        return [DocumentResponse.model_validate(d) for d in documents]
    except Exception as e:
        logging.error(f"Error fetching documents: {e}")
        return []

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    doc_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        project_id_int = int(project_id)
        import os
        import uuid
        from pathlib import Path
        
        upload_dir = Path("uploads/documents")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name is required")
        
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    
        # Store a web-friendly relative URL so frontend can open via /uploads
        saved_url = f"uploads/documents/{unique_filename}"
        document = Document(
            project_id=project_id_int,
            type=doc_type,
            name=file.filename,
            url=saved_url,
            version=1,
            uploaded_by=current_user.id,
            created_at=datetime.utcnow()
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        return DocumentResponse.model_validate(document)
    except Exception as e:
        logging.error(f"Error uploading document: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

# Download a design deliverable file by id
@api_router.get("/design-deliverables/{deliverable_id}/download")
def download_design_deliverable(deliverable_id: int, db: Session = Depends(get_db)):
    deliverable = db.query(DesignDeliverable).filter(DesignDeliverable.id == deliverable_id).first()
    if not deliverable:
        raise HTTPException(status_code=404, detail="Design deliverable not found")
    import os
    # Resolve stored URL (relative under uploads or absolute)
    stored = deliverable.url
    if os.path.isabs(stored):
        file_path = stored
    else:
        file_path = os.path.abspath(os.path.join(os.getcwd(), stored))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    filename = deliverable.name or os.path.basename(file_path)
    return FileResponse(path=file_path, filename=filename)

# Include the router in the main app
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Tanti Project Management API...")
    logger.info("Database: SQLite (tanti.db)")
    # Lightweight migration: ensure new columns exist
    try:
        with engine.begin() as conn:
            cols = conn.execute(text("PRAGMA table_info(material_requests)")).fetchall()
            names = {c[1] for c in cols}
            if "assignee_email" not in names:
                conn.execute(text("ALTER TABLE material_requests ADD COLUMN assignee_email VARCHAR NULL"))
                logger.info("Added column material_requests.assignee_email")
    except Exception as e:
        logger.warning(f"Startup migration skipped or failed: {e}")
    
    # Create admin user if it doesn't exist
    try:
        db = next(get_db())
        admin_email = "admin@tantiautomatics.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
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
            logger.info(f"Admin user created: {admin_email}")
        else:
            logger.info(f"Admin user already exists: {admin_email}")
        db.close()
    except Exception as e:
        logger.warning(f"Failed to create admin user: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)

