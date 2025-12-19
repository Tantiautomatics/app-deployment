from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import boto3
from botocore.exceptions import ClientError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# AWS S3 Configuration (will be set when user provides credentials)
S3_BUCKET = os.environ.get('S3_BUCKET', '')
AWS_ACCESS_KEY = os.environ.get('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

# Create the main app without a prefix
app = FastAPI(title="Tanti Projects API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# =========================
# MODELS
# =========================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str  # Admin, PM, Designer, Purchase, Finance, RegionHead
    region: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str
    region: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    client: str
    region: str
    value: float
    progress: float = 0.0
    status: str  # Planning, Active, On-Hold, Completed, At-Risk
    type: str
    start_date: datetime
    end_date: datetime
    days_remaining: Optional[int] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    client: str
    region: str
    value: float
    status: str = "Planning"
    type: str
    start_date: datetime
    end_date: datetime

class Milestone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    name: str
    start_date: datetime
    end_date: datetime
    status: str  # On-time, At-risk, Delayed, Completed
    progress: float = 0.0
    assignee: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MilestoneCreate(BaseModel):
    project_id: str
    name: str
    start_date: datetime
    end_date: datetime
    status: str = "On-time"
    assignee: Optional[str] = None

class ScopeItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    milestone_id: str
    sl_no: int
    description: str
    type: str
    status: str
    progress: float = 0.0
    remarks: Optional[str] = None
    drawings_url: Optional[str] = None
    bom_codes: Optional[str] = None
    documents: Optional[str] = None
    invoice: Optional[str] = None
    stock: Optional[str] = None
    po: Optional[str] = None
    delivery_date: Optional[datetime] = None
    collection: Optional[float] = None
    amount: Optional[float] = None
    last_edited_by: Optional[str] = None
    last_edited_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScopeItemCreate(BaseModel):
    project_id: str
    milestone_id: str
    sl_no: int
    description: str
    type: str
    status: str = "Pending"

class DesignDeliverable(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    milestone_id: str
    title: str
    status: str  # Pending, In-Review, Approved
    assignee: Optional[str] = None
    files: List[str] = []
    comments: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DesignDeliverableCreate(BaseModel):
    project_id: str
    milestone_id: str
    title: str
    status: str = "Pending"
    assignee: Optional[str] = None

class MaterialRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mr_number: str
    project_id: str
    items: List[Dict[str, Any]]
    need_by: datetime
    status: str  # Pending, Verified, Approved, PO-Created
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MaterialRequestCreate(BaseModel):
    project_id: str
    items: List[Dict[str, Any]]
    need_by: datetime

class PurchaseOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_number: str
    project_id: str
    vendor: str
    value: float
    status: str  # Pending, Dispatched, Delivered
    items: List[Dict[str, Any]]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PurchaseOrderCreate(BaseModel):
    project_id: str
    vendor: str
    value: float
    items: List[Dict[str, Any]]

class Issue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    title: str
    description: str
    severity: str  # Low, Med, High, Critical
    status: str  # Open, In-Progress, Resolved, Escalated
    assigned_to: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IssueCreate(BaseModel):
    project_id: str
    title: str
    description: str
    severity: str = "Med"
    assigned_to: Optional[str] = None

class Timesheet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    user_id: str
    week_start: datetime
    hours: Dict[str, float]  # {"Mon": 8, "Tue": 6, ...}
    status: str  # Draft, Submitted, Approved
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TimesheetCreate(BaseModel):
    project_id: str
    week_start: datetime
    hours: Dict[str, float]

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    type: str  # Drawings, Invoices, As-built, Handover
    name: str
    url: str
    version: int = 1
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentCreate(BaseModel):
    project_id: str
    type: str
    name: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: Optional[str] = None
    user_id: str
    action: str
    details: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =========================
# UTILITY FUNCTIONS
# =========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize_datetime(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj

def deserialize_datetime(obj: Any) -> Any:
    if isinstance(obj, str):
        try:
            return datetime.fromisoformat(obj)
        except:
            return obj
    elif isinstance(obj, dict):
        return {k: deserialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [deserialize_datetime(item) for item in obj]
    return obj

# =========================
# AUTH ENDPOINTS
# =========================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pw = hash_password(user_data.password)
    user_dict = user_data.model_dump(exclude={'password'})
    user_obj = User(**user_dict)
    
    doc = user_obj.model_dump()
    doc['password'] = hashed_pw
    doc = serialize_datetime(doc)
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['email'], user['role'])
    
    user_data = deserialize_datetime(user)
    return {
        "token": token,
        "user": User(**user_data).model_dump()
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_data = deserialize_datetime(current_user)
    return User(**user_data)

# =========================
# PROJECT ENDPOINTS
# =========================

@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    project_dict = project_data.model_dump()
    project_obj = Project(**project_dict, created_by=current_user['id'])
    
    doc = serialize_datetime(project_obj.model_dump())
    await db.projects.insert_one(doc)
    
    # Log activity
    activity = ActivityLog(
        user_id=current_user['id'],
        project_id=project_obj.id,
        action="Project Created",
        details={"name": project_obj.name}
    )
    await db.activity_logs.insert_one(serialize_datetime(activity.model_dump()))
    
    return project_obj

@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: dict = Depends(get_current_user)):
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    return [Project(**deserialize_datetime(p)) for p in projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return Project(**deserialize_datetime(project))

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: dict, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_data['updated_at'] = datetime.now(timezone.utc)
    await db.projects.update_one(
        {"id": project_id},
        {"$set": serialize_datetime(project_data)}
    )
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return Project(**deserialize_datetime(updated_project))

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

# =========================
# MILESTONE ENDPOINTS
# =========================

@api_router.post("/milestones", response_model=Milestone)
async def create_milestone(milestone_data: MilestoneCreate, current_user: dict = Depends(get_current_user)):
    milestone_obj = Milestone(**milestone_data.model_dump())
    doc = serialize_datetime(milestone_obj.model_dump())
    await db.milestones.insert_one(doc)
    return milestone_obj

@api_router.get("/milestones", response_model=List[Milestone])
async def get_milestones(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    milestones = await db.milestones.find(query, {"_id": 0}).to_list(1000)
    return [Milestone(**deserialize_datetime(m)) for m in milestones]

@api_router.put("/milestones/{milestone_id}", response_model=Milestone)
async def update_milestone(milestone_id: str, milestone_data: dict, current_user: dict = Depends(get_current_user)):
    milestone = await db.milestones.find_one({"id": milestone_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    await db.milestones.update_one(
        {"id": milestone_id},
        {"$set": serialize_datetime(milestone_data)}
    )
    
    updated_milestone = await db.milestones.find_one({"id": milestone_id}, {"_id": 0})
    return Milestone(**deserialize_datetime(updated_milestone))

@api_router.delete("/milestones/{milestone_id}")
async def delete_milestone(milestone_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.milestones.delete_one({"id": milestone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"message": "Milestone deleted successfully"}

# =========================
# MILESTONE GRID ENDPOINTS
# =========================

class MilestoneGrid(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    project_name: str
    branch: str
    priority: str
    sales_team: Optional[str] = None
    immediate_action: Optional[str] = None
    site_engineer: Optional[str] = None
    ongoing_milestone: Optional[str] = None
    upcoming_milestone: Optional[str] = None
    owner: Optional[str] = None
    progress_pct: float = 0.0
    status: str = "Active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.get("/milestones/grid")
async def get_milestones_grid(current_user: dict = Depends(get_current_user)):
    """Get all milestones in grid format with detailed columns"""
    milestones = await db.milestone_grid.find({}, {"_id": 0}).to_list(1000)
    return [MilestoneGrid(**deserialize_datetime(m)) for m in milestones]

@api_router.put("/milestones/grid/{milestone_id}")
async def update_milestone_grid_cell(milestone_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a single cell in the milestone grid and recalculate progress"""
    milestone = await db.milestone_grid.find_one({"id": milestone_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    field = update_data.get('field')
    value = update_data.get('value')
    
    if not field:
        raise HTTPException(status_code=400, detail="Field is required")
    
    # Update the field
    update_doc = {field: value, "updated_at": datetime.now(timezone.utc)}
    
    await db.milestone_grid.update_one(
        {"id": milestone_id},
        {"$set": serialize_datetime(update_doc)}
    )
    
    # Recalculate progress if milestone field was updated
    if field.startswith('m_') or any(field.startswith(f'm{i}_') for i in range(1, 11)):
        updated_milestone = await db.milestone_grid.find_one({"id": milestone_id})
        # Count all milestone checkboxes
        milestone_fields = [k for k in updated_milestone.keys() if k.startswith('m_') or any(k.startswith(f'm{i}_') for i in range(1, 11))]
        completed = sum(1 for k in milestone_fields if updated_milestone.get(k) is True)
        total = len(milestone_fields)
        progress_pct = round((completed / total * 100) if total > 0 else 0)
        
        await db.milestone_grid.update_one(
            {"id": milestone_id},
            {"$set": {"progress_pct": progress_pct}}
        )
    
    updated_milestone = await db.milestone_grid.find_one({"id": milestone_id}, {"_id": 0})
    return MilestoneGrid(**deserialize_datetime(updated_milestone))

@api_router.post("/milestones/grid")
async def create_milestone_grid(milestone_data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new milestone grid row"""
    milestone_obj = MilestoneGrid(**milestone_data)
    doc = serialize_datetime(milestone_obj.model_dump())
    await db.milestone_grid.insert_one(doc)
    return milestone_obj

# =========================
# SCOPE ENDPOINTS
# =========================

@api_router.post("/scope", response_model=ScopeItem)
async def create_scope_item(scope_data: ScopeItemCreate, current_user: dict = Depends(get_current_user)):
    scope_obj = ScopeItem(**scope_data.model_dump())
    doc = serialize_datetime(scope_obj.model_dump())
    await db.scope_items.insert_one(doc)
    return scope_obj

@api_router.get("/scope", response_model=List[ScopeItem])
async def get_scope_items(project_id: Optional[str] = None, milestone_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if milestone_id:
        query["milestone_id"] = milestone_id
    
    scope_items = await db.scope_items.find(query, {"_id": 0}).to_list(1000)
    return [ScopeItem(**deserialize_datetime(s)) for s in scope_items]

@api_router.put("/scope/{scope_id}", response_model=ScopeItem)
async def update_scope_item(scope_id: str, scope_data: dict, current_user: dict = Depends(get_current_user)):
    scope = await db.scope_items.find_one({"id": scope_id})
    if not scope:
        raise HTTPException(status_code=404, detail="Scope item not found")
    
    scope_data['last_edited_by'] = current_user['email']
    scope_data['last_edited_at'] = datetime.now(timezone.utc)
    
    await db.scope_items.update_one(
        {"id": scope_id},
        {"$set": serialize_datetime(scope_data)}
    )
    
    updated_scope = await db.scope_items.find_one({"id": scope_id}, {"_id": 0})
    return ScopeItem(**deserialize_datetime(updated_scope))

@api_router.delete("/scope/{scope_id}")
async def delete_scope_item(scope_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.scope_items.delete_one({"id": scope_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scope item not found")
    return {"message": "Scope item deleted successfully"}

# =========================
# DESIGN DELIVERABLES ENDPOINTS
# =========================

@api_router.post("/design-deliverables", response_model=DesignDeliverable)
async def create_design_deliverable(deliverable_data: DesignDeliverableCreate, current_user: dict = Depends(get_current_user)):
    deliverable_obj = DesignDeliverable(**deliverable_data.model_dump())
    doc = serialize_datetime(deliverable_obj.model_dump())
    await db.design_deliverables.insert_one(doc)
    return deliverable_obj

@api_router.get("/design-deliverables", response_model=List[DesignDeliverable])
async def get_design_deliverables(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    deliverables = await db.design_deliverables.find(query, {"_id": 0}).to_list(1000)
    return [DesignDeliverable(**deserialize_datetime(d)) for d in deliverables]

@api_router.put("/design-deliverables/{deliverable_id}", response_model=DesignDeliverable)
async def update_design_deliverable(deliverable_id: str, deliverable_data: dict, current_user: dict = Depends(get_current_user)):
    deliverable = await db.design_deliverables.find_one({"id": deliverable_id})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Design deliverable not found")
    
    await db.design_deliverables.update_one(
        {"id": deliverable_id},
        {"$set": serialize_datetime(deliverable_data)}
    )
    
    updated_deliverable = await db.design_deliverables.find_one({"id": deliverable_id}, {"_id": 0})
    return DesignDeliverable(**deserialize_datetime(updated_deliverable))

# =========================
# MATERIAL REQUEST ENDPOINTS
# =========================

@api_router.post("/material-requests", response_model=MaterialRequest)
async def create_material_request(mr_data: MaterialRequestCreate, current_user: dict = Depends(get_current_user)):
    # Generate MR number
    count = await db.material_requests.count_documents({})
    mr_number = f"MR{count + 1:05d}"
    
    mr_obj = MaterialRequest(**mr_data.model_dump(), mr_number=mr_number, created_by=current_user['id'], status="Pending")
    doc = serialize_datetime(mr_obj.model_dump())
    await db.material_requests.insert_one(doc)
    return mr_obj

@api_router.get("/material-requests", response_model=List[MaterialRequest])
async def get_material_requests(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    requests = await db.material_requests.find(query, {"_id": 0}).to_list(1000)
    return [MaterialRequest(**deserialize_datetime(r)) for r in requests]

@api_router.put("/material-requests/{mr_id}", response_model=MaterialRequest)
async def update_material_request(mr_id: str, mr_data: dict, current_user: dict = Depends(get_current_user)):
    mr = await db.material_requests.find_one({"id": mr_id})
    if not mr:
        raise HTTPException(status_code=404, detail="Material request not found")
    
    await db.material_requests.update_one(
        {"id": mr_id},
        {"$set": serialize_datetime(mr_data)}
    )
    
    updated_mr = await db.material_requests.find_one({"id": mr_id}, {"_id": 0})
    return MaterialRequest(**deserialize_datetime(updated_mr))

# =========================
# PURCHASE ORDER ENDPOINTS
# =========================

@api_router.post("/purchase-orders", response_model=PurchaseOrder)
async def create_purchase_order(po_data: PurchaseOrderCreate, current_user: dict = Depends(get_current_user)):
    # Generate PO number
    count = await db.purchase_orders.count_documents({})
    po_number = f"PO{count + 1:05d}"
    
    po_obj = PurchaseOrder(**po_data.model_dump(), po_number=po_number, status="Pending")
    doc = serialize_datetime(po_obj.model_dump())
    await db.purchase_orders.insert_one(doc)
    return po_obj

@api_router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def get_purchase_orders(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    pos = await db.purchase_orders.find(query, {"_id": 0}).to_list(1000)
    return [PurchaseOrder(**deserialize_datetime(p)) for p in pos]

@api_router.put("/purchase-orders/{po_id}", response_model=PurchaseOrder)
async def update_purchase_order(po_id: str, po_data: dict, current_user: dict = Depends(get_current_user)):
    po = await db.purchase_orders.find_one({"id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": serialize_datetime(po_data)}
    )
    
    updated_po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    return PurchaseOrder(**deserialize_datetime(updated_po))

# =========================
# ISSUE ENDPOINTS
# =========================

@api_router.post("/issues", response_model=Issue)
async def create_issue(issue_data: IssueCreate, current_user: dict = Depends(get_current_user)):
    issue_obj = Issue(**issue_data.model_dump(), created_by=current_user['id'], status="Open")
    doc = serialize_datetime(issue_obj.model_dump())
    await db.issues.insert_one(doc)
    return issue_obj

@api_router.get("/issues", response_model=List[Issue])
async def get_issues(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    issues = await db.issues.find(query, {"_id": 0}).to_list(1000)
    return [Issue(**deserialize_datetime(i)) for i in issues]

@api_router.put("/issues/{issue_id}", response_model=Issue)
async def update_issue(issue_id: str, issue_data: dict, current_user: dict = Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    issue_data['updated_at'] = datetime.now(timezone.utc)
    await db.issues.update_one(
        {"id": issue_id},
        {"$set": serialize_datetime(issue_data)}
    )
    
    updated_issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    return Issue(**deserialize_datetime(updated_issue))

# =========================
# TIMESHEET ENDPOINTS
# =========================

@api_router.post("/timesheets", response_model=Timesheet)
async def create_timesheet(timesheet_data: TimesheetCreate, current_user: dict = Depends(get_current_user)):
    timesheet_obj = Timesheet(**timesheet_data.model_dump(), user_id=current_user['id'], status="Draft")
    doc = serialize_datetime(timesheet_obj.model_dump())
    await db.timesheets.insert_one(doc)
    return timesheet_obj

@api_router.get("/timesheets", response_model=List[Timesheet])
async def get_timesheets(project_id: Optional[str] = None, user_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if user_id:
        query["user_id"] = user_id
    elif current_user['role'] not in ['Admin', 'PM']:
        query["user_id"] = current_user['id']
    
    timesheets = await db.timesheets.find(query, {"_id": 0}).to_list(1000)
    return [Timesheet(**deserialize_datetime(t)) for t in timesheets]

@api_router.put("/timesheets/{timesheet_id}", response_model=Timesheet)
async def update_timesheet(timesheet_id: str, timesheet_data: dict, current_user: dict = Depends(get_current_user)):
    timesheet = await db.timesheets.find_one({"id": timesheet_id})
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    await db.timesheets.update_one(
        {"id": timesheet_id},
        {"$set": serialize_datetime(timesheet_data)}
    )
    
    updated_timesheet = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    return Timesheet(**deserialize_datetime(updated_timesheet))

# =========================
# DOCUMENT ENDPOINTS
# =========================

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    doc_type: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    # For MVP, we'll store files locally instead of S3
    # This can be easily swapped to S3 later
    upload_dir = Path("/app/uploads")
    upload_dir.mkdir(exist_ok=True)
    
    file_path = upload_dir / f"{uuid.uuid4()}_{file.filename}"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Create document record
    doc_obj = Document(
        project_id=project_id,
        type=doc_type,
        name=file.filename,
        url=str(file_path),
        uploaded_by=current_user['id']
    )
    
    await db.documents.insert_one(serialize_datetime(doc_obj.model_dump()))
    
    return {
        "id": doc_obj.id,
        "url": f"/api/documents/download/{doc_obj.id}",
        "name": file.filename
    }

@api_router.get("/documents", response_model=List[Document])
async def get_documents(project_id: Optional[str] = None, doc_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if doc_type:
        query["type"] = doc_type
    
    documents = await db.documents.find(query, {"_id": 0}).to_list(1000)
    return [Document(**deserialize_datetime(d)) for d in documents]

# =========================
# NOTIFICATION ENDPOINTS
# =========================

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    return [Notification(**deserialize_datetime(n)) for n in notifications]

@api_router.put("/notifications/mark-read")
async def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user['id'], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# =========================
# ACTIVITY LOG ENDPOINTS
# =========================

@api_router.get("/activity-logs", response_model=List[ActivityLog])
async def get_activity_logs(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"project_id": project_id} if project_id else {}
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    return [ActivityLog(**deserialize_datetime(log)) for log in logs]

# =========================
# DASHBOARD / STATS ENDPOINTS
# =========================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Count projects by status
    total_projects = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"status": "Active"})
    completed_projects = await db.projects.count_documents({"status": "Completed"})
    at_risk_projects = await db.projects.count_documents({"status": "At-Risk"})
    
    # Get projects by region
    projects_by_region = {}
    all_projects = await db.projects.find({}, {"_id": 0, "region": 1}).to_list(1000)
    for p in all_projects:
        region = p.get('region', 'Unknown')
        projects_by_region[region] = projects_by_region.get(region, 0) + 1
    
    # Get projects by status for donut chart
    projects_by_status = {}
    all_projects = await db.projects.find({}, {"_id": 0, "status": 1}).to_list(1000)
    for p in all_projects:
        status = p.get('status', 'Unknown')
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
