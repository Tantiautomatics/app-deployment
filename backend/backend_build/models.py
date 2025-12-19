from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from database import Base
from datetime import datetime
from typing import Optional

# User Model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Admin, PM, Designer, Purchase, Finance, RegionHead
    region = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Project Model
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    client = Column(String, nullable=False)
    region = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    progress = Column(Float, default=0.0)
    status = Column(String, nullable=False)  # Planning, Active, On-Hold, Completed, At-Risk
    type = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    days_remaining = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Milestone Model
class Milestone(Base):
    __tablename__ = "milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(String, default="On-time")  # On-time, At-risk, Delayed, Completed
    progress = Column(Float, default=0.0)
    assignee = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Scope Item Model
class ScopeItem(Base):
    __tablename__ = "scope_items"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    milestone_id = Column(Integer, ForeignKey("milestones.id"))
    sl_no = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, default="Pending")
    progress = Column(Float, default=0.0)
    remarks = Column(Text, nullable=True)
    drawings_url = Column(String, nullable=True)
    bom_codes = Column(String, nullable=True)
    documents = Column(String, nullable=True)
    invoice = Column(String, nullable=True)
    stock = Column(String, nullable=True)
    po = Column(String, nullable=True)
    delivery_date = Column(DateTime, nullable=True)
    collection = Column(Float, nullable=True)
    amount = Column(Float, nullable=True)
    last_edited_by = Column(String, nullable=True)
    last_edited_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Issue Model
class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=False)  # Low, Med, High, Critical
    status = Column(String, default="Open")  # Open, In-Progress, Resolved, Escalated
    assigned_to = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Document Model
class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    type = Column(String, nullable=False)  # Drawings, Invoices, As-built, Handover
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    version = Column(Integer, default=1)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

# Material Request Model
class MaterialRequest(Base):
    __tablename__ = "material_requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    items = Column(Text, nullable=True)
    needed_by = Column(DateTime, nullable=True)
    status = Column(String, default="Pending")
    assignee_email = Column(String, nullable=True)
    requested_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Purchase Order Model
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    vendor = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    items = Column(Text, nullable=True)
    status = Column(String, default="Draft")
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Design Deliverable Model
class DesignDeliverable(Base):
    __tablename__ = "design_deliverables"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    type = Column(String, nullable=False)  # To Do, In Progress, Done
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    version = Column(Integer, default=1)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

# Notification Model
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text, nullable=False)
    link = Column(String, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# Activity Log Model
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Milestone Grid Model (Excel-like tracking)
class MilestoneGrid(Base):
    __tablename__ = "milestone_grid"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, nullable=False, unique=True)
    project_name = Column(String, nullable=False)
    branch = Column(String, nullable=False)
    priority = Column(String, default="Low")
    sales_team = Column(String, nullable=True)
    immediate_action = Column(Text, nullable=True)
    site_engineer = Column(String, nullable=True)
    ongoing_milestone = Column(String, nullable=True)
    upcoming_milestone = Column(String, nullable=True)
    owner = Column(String, nullable=True)
    progress_pct = Column(Float, default=0.0)
    status = Column(String, default="Active")
    
    # Entry Point Milestones
    m_entry_electrical_labour = Column(Boolean, default=False)
    m_entry_electrical_design = Column(Boolean, default=False)
    m_entry_essential = Column(Boolean, default=False)
    m_entry_automation = Column(Boolean, default=False)
    
    # Milestone 1 - Slab Conduits
    m1_slab1 = Column(Boolean, default=False)
    m1_slab2 = Column(Boolean, default=False)
    m1_slab3 = Column(Boolean, default=False)
    m1_slab4 = Column(Boolean, default=False)
    
    # Milestone 2 - Wall Chipping
    m2_conduits = Column(Boolean, default=False)
    m2_db_wall_boxes = Column(Boolean, default=False)
    
    # Milestone 3 - Wiring
    m3_wires = Column(Boolean, default=False)
    m3_comm_cables = Column(Boolean, default=False)
    
    # Milestone 4 - DB Dressing
    m4_mcbs = Column(Boolean, default=False)
    m4_automation_backend = Column(Boolean, default=False)
    m4_networking_passive = Column(Boolean, default=False)
    
    # Milestone 5 - Infrastructure
    m5_power_panels = Column(Boolean, default=False)
    m5_earthing = Column(Boolean, default=False)
    m5_gate_motor = Column(Boolean, default=False)
    m5_stabilizer = Column(Boolean, default=False)
    m5_ups = Column(Boolean, default=False)
    m5_solar = Column(Boolean, default=False)
    
    # Milestone 6 - Switches
    m6_switches_int = Column(Boolean, default=False)
    m6_switches_ind = Column(Boolean, default=False)
    m6_frontend = Column(Boolean, default=False)
    
    # Milestone 7 - Essentials
    m7_cctv = Column(Boolean, default=False)
    m7_vdp = Column(Boolean, default=False)
    m7_networking_active = Column(Boolean, default=False)
    m7_wifi = Column(Boolean, default=False)
    m7_digital_locks = Column(Boolean, default=False)
    m7_security_basic = Column(Boolean, default=False)
    m7_security_advanced = Column(Boolean, default=False)
    m7_intercomm = Column(Boolean, default=False)
    m7_motion_sensors = Column(Boolean, default=False)
    m7_water_mgmt = Column(Boolean, default=False)
    
    # Milestone 8 - Light Fixtures
    m8_light_fixtures = Column(Boolean, default=False)
    m8_curtain_motor = Column(Boolean, default=False)
    m8_zonal_audio = Column(Boolean, default=False)
    m8_home_theater = Column(Boolean, default=False)
    
    # Milestone 9 - Visualization
    m9_mobile_control = Column(Boolean, default=False)
    m9_hvac = Column(Boolean, default=False)
    m9_socket_timer = Column(Boolean, default=False)
    m9_heat_pump = Column(Boolean, default=False)
    m9_voice_control = Column(Boolean, default=False)
    
    # Milestone 10 - Handover
    m10_handover = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

