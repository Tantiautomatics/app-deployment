#!/usr/bin/env python3
"""Add SiteExecutionMilestoneGrid endpoints to server.py"""

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

print("Adding SiteExecutionMilestoneGrid support...")

# Fix 1: Add SiteExecutionMilestoneGrid to imports
if 'SiteExecutionMilestoneGrid' not in content:
    content = content.replace(
        'from models import User, Project, Milestone as MilestoneModel, ScopeItem as ScopeItemModel, MilestoneGrid, Notification, ActivityLog, MaterialRequest, PurchaseOrder, Issue, DesignDeliverable, Document',
        'from models import User, Project, Milestone as MilestoneModel, ScopeItem as ScopeItemModel, MilestoneGrid, SiteExecutionMilestoneGrid, Notification, ActivityLog, MaterialRequest, PurchaseOrder, Issue, DesignDeliverable, Document'
    )
    print("✅ Added SiteExecutionMilestoneGrid to imports")

# Fix 2: Add SiteExecutionMilestoneGridResponse Pydantic model
if 'class SiteExecutionMilestoneGridResponse' not in content:
    insert_pos = content.find('class TaskCreate(BaseModel):')
    if insert_pos != -1:
        new_model = '''class SiteExecutionMilestoneGridResponse(BaseModel):
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

'''
        content = content[:insert_pos] + new_model + content[insert_pos:]
        print("✅ Added SiteExecutionMilestoneGridResponse model")

# Fix 3: Add SiteExecutionMilestoneGrid endpoints
if '@api_router.get("/milestones/site-execution-grid")' not in content:
    insert_pos = content.find('# =========================\n# SIMPLE MILESTONES AND SCOPE LISTING')
    if insert_pos != -1:
        endpoints = '''
# =========================
# SITE EXECUTION MILESTONE GRID ENDPOINTS
# =========================

@api_router.get("/milestones/site-execution-grid")
def get_site_execution_milestones_grid(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all site execution milestones in grid format"""
    milestones = db.query(SiteExecutionMilestoneGrid).all()
    return [SiteExecutionMilestoneGridResponse.model_validate(m).model_dump() for m in milestones]

@api_router.put("/milestones/site-execution-grid/{milestone_id}")
def update_site_execution_milestone_grid_cell(
    milestone_id: int,
    update_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a single cell in the site execution milestone grid and recalculate progress"""
    milestone = db.query(SiteExecutionMilestoneGrid).filter(SiteExecutionMilestoneGrid.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    field = update_data.get('field')
    value = update_data.get('value')
    
    if not field:
        raise HTTPException(status_code=400, detail="Field is required")
    
    if field.startswith('m'):
        setattr(milestone, field, normalize_bool(value))
    else:
        setattr(milestone, field, value)
    milestone.updated_at = datetime.utcnow()
    
    if field.startswith('m'):
        prefixes = ['m_entry_'] + [f"m{i}_" for i in range(1, 11)]
        keys = [c for c in SiteExecutionMilestoneGrid.__table__.columns.keys() if any(c.startswith(p) for p in prefixes)]
        total = len(keys)
        completed = sum(1 for k in keys if normalize_bool(getattr(milestone, k)))
        milestone.progress_pct = round((completed / total * 100) if total > 0 else 0)
    
    db.commit()
    db.refresh(milestone)
    return SiteExecutionMilestoneGridResponse.model_validate(milestone).model_dump()

@api_router.post("/milestones/site-execution-grid")
def create_site_execution_milestone_grid(
    milestone_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new site execution milestone grid row"""
    # Generate unique project_id if not provided or if it already exists
    project_id = milestone_data.get('project_id')
    if not project_id or db.query(SiteExecutionMilestoneGrid).filter(SiteExecutionMilestoneGrid.project_id == project_id).first():
        # Find the next available ID
        existing_count = db.query(SiteExecutionMilestoneGrid).count()
        project_id = f"TAPL{str(existing_count + 1).zfill(3)}"
        # Check if this ID exists, if so, find next available
        while db.query(SiteExecutionMilestoneGrid).filter(SiteExecutionMilestoneGrid.project_id == project_id).first():
            existing_count += 1
            project_id = f"TAPL{str(existing_count + 1).zfill(3)}"
        milestone_data['project_id'] = project_id
    
    try:
        new_milestone = SiteExecutionMilestoneGrid(**milestone_data)
        db.add(new_milestone)
        db.commit()
        db.refresh(new_milestone)
        return SiteExecutionMilestoneGridResponse.model_validate(new_milestone).model_dump()
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating site execution milestone grid row: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to create row: {str(e)}")

@api_router.delete("/milestones/site-execution-grid/{milestone_id}")
def delete_site_execution_milestone_grid_row(
    milestone_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        row = db.query(SiteExecutionMilestoneGrid).filter(SiteExecutionMilestoneGrid.id == milestone_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Milestone not found")
        db.delete(row)
        db.commit()
        return {"status": "deleted", "id": milestone_id}
    except Exception as e:
        db.rollback()
        logging.error(f"Error deleting site execution milestone grid row {milestone_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete row: {str(e)}")

'''
        content = content[:insert_pos] + endpoints + content[insert_pos:]
        print("✅ Added SiteExecutionMilestoneGrid endpoints")

# Write the fixed content
with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ All fixes applied! File size: {len(content)} bytes")

