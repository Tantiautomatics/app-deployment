#!/usr/bin/env python3
"""Apply fixes and start servers"""

import re
import subprocess
import sys
import os

print("📦 Reading backup file...")
with open('backend_build/server.py', 'r', encoding='utf-8') as f:
    content = f.read()

print("🔧 Applying fixes...")

# 1. Update import
content = content.replace(
    'from models import User, Project, Milestone as MilestoneModel, ScopeItem as ScopeItemModel, MilestoneGrid, Notification',
    'from models import User, Project, Milestone as MilestoneModel, ScopeItem as ScopeItemModel, MilestoneGrid, SiteExecutionMilestoneGrid, Notification'
)

# 2. Add response model
model_pos = content.find('class TaskCreate(BaseModel):')
if model_pos != -1:
    response_model = '''class SiteExecutionMilestoneGridResponse(BaseModel):
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
    content = content[:model_pos] + response_model + content[model_pos:]

# 3. Fix CORS to include port 3001
content = content.replace(
    'allow_origins=["http://localhost:3000"]',
    'allow_origins=["http://localhost:3000", "http://localhost:3001"]'
)

# 4. Fix create_project
create_return = content.find('    return ProjectResponse.model_validate(new_project)', content.find('def create_project'))
if create_return != -1:
    site_exec_code = '''
    
    # Also create a Site Execution Milestone Grid row for the new project
    milestone_project_id = milestone_project_id if 'milestone_project_id' in locals() else None
    try:
        site_exec_project_id = milestone_project_id
        if not site_exec_project_id:
            existing_count = db.query(SiteExecutionMilestoneGrid).count()
            site_exec_project_id = f"TAPL{str(existing_count + 1).zfill(3)}"
            while db.query(SiteExecutionMilestoneGrid).filter(SiteExecutionMilestoneGrid.project_id == site_exec_project_id).first():
                existing_count += 1
                site_exec_project_id = f"TAPL{str(existing_count + 1).zfill(3)}"
        
        new_site_exec_row = SiteExecutionMilestoneGrid(
            project_id=site_exec_project_id,
            project_name=new_project.name,
            branch=new_project.region,
            priority="Low",
            progress_pct=0.0,
            status="Active"
        )
        db.add(new_site_exec_row)
        db.commit()
        db.refresh(new_site_exec_row)
        logging.info(f"Created site execution milestone grid row for project '{new_project.name}' with ID '{site_exec_project_id}'")
    except Exception as e:
        logging.error(f"Failed to create site execution milestone grid row: {e}")
'''
    content = content[:create_return] + site_exec_code + content[create_return:]

# 5. Fix get_projects
old_get_projects = r'(# Recalculate progress from milestone grid for all projects\s+for project in projects:\s+all_milestones = db\.query\(MilestoneGrid\)\.filter\(\s+func\.lower\(MilestoneGrid\.project_name\) == func\.lower\(project\.name\)\s+\)\.all\(\)\s+if all_milestones:\s+avg_progress = sum\(m\.progress_pct or 0 for m in all_milestones\) / len\(all_milestones\)\s+project\.progress = round\(avg_progress, 2\))'
new_get_projects = '''# Recalculate progress from both milestone grids for all projects
    for project in projects:
        all_milestones = db.query(MilestoneGrid).filter(
            func.lower(MilestoneGrid.project_name) == func.lower(project.name)
        ).all()
        all_site_exec_milestones = db.query(SiteExecutionMilestoneGrid).filter(
            func.lower(SiteExecutionMilestoneGrid.project_name) == func.lower(project.name)
        ).all()
        
        all_progress_values = []
        if all_milestones:
            all_progress_values.extend([m.progress_pct or 0 for m in all_milestones])
        if all_site_exec_milestones:
            all_progress_values.extend([m.progress_pct or 0 for m in all_site_exec_milestones])
        
        if all_progress_values:
            avg_progress = sum(all_progress_values) / len(all_progress_values)
            project.progress = round(avg_progress, 2)'''
content = re.sub(old_get_projects, new_get_projects, content, flags=re.MULTILINE | re.DOTALL)

# 6. Fix get_project
old_get_project = r'(# Recalculate progress from milestone grid to ensure it\'s up-to-date\s+all_milestones = db\.query\(MilestoneGrid\)\.filter\(\s+func\.lower\(MilestoneGrid\.project_name\) == func\.lower\(project\.name\)\s+\)\.all\(\)\s+if all_milestones:\s+avg_progress = sum\(m\.progress_pct or 0 for m in all_milestones\) / len\(all_milestones\)\s+old_progress = project\.progress\s+project\.progress = round\(avg_progress, 2\)\s+db\.commit\(\)\s+db\.refresh\(project\)\s+logging\.info\(f"Project \'\{project\.name\}\': Updated progress from \{old_progress\}% to \{project\.progress\}% \(from \{len\(all_milestones\)\} milestone rows\)"\)\s+else:\s+logging\.warning\(f"Project \'\{project\.name\}\': No milestone grid rows found matching this project name"\))'
new_get_project = '''# Recalculate progress from both milestone grids to ensure it's up-to-date
    all_milestones = db.query(MilestoneGrid).filter(
        func.lower(MilestoneGrid.project_name) == func.lower(project.name)
    ).all()
    all_site_exec_milestones = db.query(SiteExecutionMilestoneGrid).filter(
        func.lower(SiteExecutionMilestoneGrid.project_name) == func.lower(project.name)
    ).all()
    
    all_progress_values = []
    if all_milestones:
        all_progress_values.extend([m.progress_pct or 0 for m in all_milestones])
    if all_site_exec_milestones:
        all_progress_values.extend([m.progress_pct or 0 for m in all_site_exec_milestones])
    
    if all_progress_values:
        avg_progress = sum(all_progress_values) / len(all_progress_values)
        old_progress = project.progress
        project.progress = round(avg_progress, 2)
        db.commit()
        db.refresh(project)
        logging.info(f"Project '{project.name}': Updated progress from {old_progress}% to {project.progress}% (from {len(all_milestones)} secondary sales + {len(all_site_exec_milestones)} site execution milestone rows)")
    else:
        logging.warning(f"Project '{project.name}': No milestone grid rows found matching this project name")'''
content = re.sub(old_get_project, new_get_project, content, flags=re.MULTILINE | re.DOTALL)

# 7. Add endpoints
endpoint_pos = content.find('# =========================\n# SIMPLE MILESTONES AND SCOPE LISTING')
if endpoint_pos != -1:
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
    new_milestone = SiteExecutionMilestoneGrid(**milestone_data)
    db.add(new_milestone)
    db.commit()
    db.refresh(new_milestone)
    return SiteExecutionMilestoneGridResponse.model_validate(new_milestone).model_dump()

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
    content = content[:endpoint_pos] + endpoints + content[endpoint_pos:]

# Write file
print("💾 Writing fixed server.py...")
with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ All fixes applied!")
print("🚀 Starting backend server...")

# Start backend server
backend_process = subprocess.Popen([sys.executable, 'server.py'], 
                                   cwd=os.getcwd(),
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)

print(f"✅ Backend server started (PID: {backend_process.pid})")
print("🌐 Backend running on http://localhost:8010")
print("")
print("📝 To start frontend, run:")
print("   cd ../frontend")
print("   npm start")
print("")
print("✅ Application ready!")





