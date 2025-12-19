import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FolderKanban, CheckCircle2, AlertTriangle, Clock, TrendingUp, FileText, Upload, Settings, ArrowRight, FolderOpen, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

// Normalize region names (shared function)
const normalizeRegion = (name) => {
  const raw = (name || 'Unknown').toString().trim().toLowerCase();
  const key = raw.replace(/[^a-z]/g, '');
  const map = {
    bengaluru: 'Bengaluru',
    bangalore: 'Bengaluru',
    mysore: 'Mysuru',
    mysuru: 'Mysuru',
    northkarnataka: 'North Karnataka',
    northkaranataka: 'North Karnataka',
    north: 'North Karnataka'
  };
  return map[key] || (name || 'Unknown');
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedRegion') || 'All Regions';
    }
    return 'All Regions';
  });

  useEffect(() => {
    fetchDashboardData();
  }, [selectedRegion]);

  // Listen for region changes from TopBar
  useEffect(() => {
    const handleRegionChange = () => {
      const region = localStorage.getItem('selectedRegion') || 'All Regions';
      setSelectedRegion(region);
    };
    window.addEventListener('regionChanged', handleRegionChange);
    return () => window.removeEventListener('regionChanged', handleRegionChange);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const safe = (promise) => promise.then(r => ({ ok: true, data: r.data })).catch(() => ({ ok: false, data: null }));
      const [summaryRes, projectsRes, logsRes, notifRes] = await Promise.all([
        safe(api.getDashboardStats()),
        safe(api.getProjects()),
        safe(api.getActivityLogs()),
        safe(api.getNotifications())
      ]);

      let projectsData = projectsRes.data || [];
      
      // Filter projects by selected region
      if (selectedRegion && selectedRegion !== 'All Regions') {
        const normalizedSelectedRegion = normalizeRegion(selectedRegion);
        projectsData = projectsData.filter(p => {
          if (!p.region) return false;
          const normalizedProjectRegion = normalizeRegion(p.region);
          return normalizedProjectRegion === normalizedSelectedRegion;
        });
      }
      
      setProjects(projectsData);

      // Prefer backend summary; if missing, derive from projects
      const summary = summaryRes.data || {};
      
      // Get all projects for region breakdown (not filtered)
      const allProjectsData = projectsRes.data || [];
      const knownRegions = ['Bengaluru', 'Mysuru', 'North Karnataka'];
      const projectsByRegion = summary.projects_by_region || allProjectsData.reduce((acc, p) => {
        const r = normalizeRegion(p.region);
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {});

      // Ensure known regions appear even if zero
      knownRegions.forEach(r => { if (projectsByRegion[r] == null) projectsByRegion[r] = 0; });
      
      // Calculate stats from filtered projects
      setStats({
        kpi: {
          total_projects: projectsData.length,
          active_projects: projectsData.filter(p => p.status === 'Active').length,
          completed_projects: projectsData.filter(p => p.status === 'Completed').length,
          at_risk_projects: projectsData.filter(p => p.status === 'At-Risk').length
        },
        projects_by_region: projectsByRegion,
        projects_by_status: {}
      });
      
      // Filter activity logs by region (if they have project_id, filter by project region)
      let filteredLogs = logsRes.data || [];
      if (selectedRegion && selectedRegion !== 'All Regions' && projectsData.length > 0) {
        const projectIds = new Set(projectsData.map(p => p.id));
        filteredLogs = filteredLogs.filter(log => !log.project_id || projectIds.has(log.project_id));
      }
      setActivityLogs(filteredLogs);
      
      // Filter pending tasks by region
      let filteredTasks = (notifRes.data || []).filter(n => !n.read);
      if (selectedRegion && selectedRegion !== 'All Regions' && projectsData.length > 0) {
        const projectIds = new Set(projectsData.map(p => p.id));
        filteredTasks = filteredTasks.filter(task => {
          // If task has project reference, filter by it
          if (task.project_id) {
            return projectIds.has(task.project_id);
          }
          return true; // Keep tasks without project reference
        });
      }
      setPendingTasks(filteredTasks);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="dashboard-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  // Get selected region for navigation
  const getRegionParam = () => {
    if (selectedRegion && selectedRegion !== 'All Regions') {
      return `region=${encodeURIComponent(selectedRegion)}`;
    }
    return '';
  };

  const kpiCards = [
    {
      title: 'Total Projects',
      value: stats?.kpi?.total_projects || 0,
      icon: FolderKanban,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-600',
      target: selectedRegion && selectedRegion !== 'All Regions' 
        ? `/projects?region=${encodeURIComponent(selectedRegion)}`
        : '/projects'
    },
    {
      title: 'Active Projects',
      value: stats?.kpi?.active_projects || 0,
      icon: Clock,
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-600',
      target: selectedRegion && selectedRegion !== 'All Regions'
        ? `/projects?status=Active&region=${encodeURIComponent(selectedRegion)}`
        : '/projects?status=Active'
    },
    {
      title: 'Completed Projects',
      value: stats?.kpi?.completed_projects || 0,
      icon: CheckCircle2,
      gradient: 'from-cyan-500 to-cyan-600',
      bg: 'bg-cyan-600',
      target: selectedRegion && selectedRegion !== 'All Regions'
        ? `/projects?status=Completed&region=${encodeURIComponent(selectedRegion)}`
        : '/projects?status=Completed'
    },
    {
      title: 'At-Risk Projects',
      value: stats?.kpi?.at_risk_projects || 0,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-600',
      target: selectedRegion && selectedRegion !== 'All Regions'
        ? `/projects?status=At-Risk&region=${encodeURIComponent(selectedRegion)}`
        : '/projects?status=At-Risk'
    }
  ];

  // Prepare status breakdown data with percentages
  const totalProjects = stats?.kpi?.total_projects || 1;
  const statusBreakdown = [
    { 
      name: 'Active', 
      count: stats?.kpi?.active_projects || 0, 
      percentage: Math.round(((stats?.kpi?.active_projects || 0) / totalProjects) * 100),
      color: 'bg-green-500'
    },
    { 
      name: 'Completed', 
      count: stats?.kpi?.completed_projects || 0, 
      percentage: Math.round(((stats?.kpi?.completed_projects || 0) / totalProjects) * 100),
      color: 'bg-blue-500'
    },
    { 
      name: 'At-Risk', 
      count: stats?.kpi?.at_risk_projects || 0, 
      percentage: Math.round(((stats?.kpi?.at_risk_projects || 0) / totalProjects) * 100),
      color: 'bg-red-500'
    },
    { 
      name: 'On Hold', 
      count: projects.filter(p => p.status === 'On-Hold').length, 
      percentage: Math.round((projects.filter(p => p.status === 'On-Hold').length / totalProjects) * 100),
      color: 'bg-yellow-500'
    }
  ];

  // Calculate region percentages - use normalized names for display
  const regionOrder = ['Bengaluru', 'Mysuru', 'North Karnataka'];
  const regionMap = stats?.projects_by_region || {};
  
  // Create a normalized map to handle "Mysore" vs "Mysuru"
  const normalizedRegionMap = {};
  Object.keys(regionMap).forEach(key => {
    const normalized = normalizeRegion(key);
    normalizedRegionMap[normalized] = (normalizedRegionMap[normalized] || 0) + regionMap[key];
  });
  
  const regionData = regionOrder
    .filter(name => name in normalizedRegionMap)
    .map((name) => ({
      name,
      count: normalizedRegionMap[name] || 0,
      percentage: Math.round(((normalizedRegionMap[name] || 0) / totalProjects) * 100)
    }));

  const quickActions = [
    { label: 'Create Project', icon: FolderKanban, path: '/projects/new' },
    { label: 'View All Projects', icon: FolderOpen, path: '/projects' },
    { label: 'Generate Report', icon: BarChart3, path: '/reports' }
  ];

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200"
              onClick={() => navigate(kpi.target)}
              data-testid={`kpi-card-${kpi.title.toLowerCase().replace(/ /g, '-')}`}
            >
              <div className={`h-2 bg-gradient-to-r ${kpi.gradient}`}></div>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">{kpi.title}</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900">{kpi.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${kpi.bg}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row - Status Breakdown & Region */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Project Status Breakdown - Horizontal Bars */}
        <Card className="border border-slate-200" data-testid="status-breakdown-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Project Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" style={{ height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
              {statusBreakdown.map((status, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{status.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{status.count} ({status.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full ${status.color} rounded-full transition-all duration-500`}
                      style={{ width: `${status.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Projects by Region - Percentage Cards */}
        <Card className="border border-slate-200" data-testid="region-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Projects by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" style={{ height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
              {regionData.map((region, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects?region=${encodeURIComponent(region.name)}`)}
                >
                  <div>
                    <p className="text-base font-bold text-slate-900 mb-0.5">{region.name}</p>
                    <p className="text-xs text-slate-600">{region.count} projects</p>
                  </div>
                  <div className="text-xl font-bold text-blue-600">{region.percentage}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Financial Summary, Quick Links & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Financial Summary */}
        <Card className="border border-slate-200" data-testid="financial-summary-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Financial Summary
              {selectedRegion && selectedRegion !== 'All Regions' && (
                <span className="text-sm font-normal text-slate-500">({selectedRegion})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Total Project Value</p>
                <p className="text-xl font-bold text-slate-900">
                  ₹{projects.reduce((sum, p) => sum + (p.value || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Active Value</p>
                <p className="text-xl font-bold text-green-600">
                  ₹{projects.filter(p => p.status === 'Active').reduce((sum, p) => sum + (p.value || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Completed Value</p>
                <p className="text-xl font-bold text-blue-600">
                  ₹{projects.filter(p => p.status === 'Completed').reduce((sum, p) => sum + (p.value || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Pending Tasks */}
        <Card className="border border-slate-200" data-testid="pending-tasks-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">My Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <div className="space-y-2">
                {[ 
                  { id: 'ex1', message: 'Share slab conduit layout for M1 (Tower A) — priority: High', created_at: new Date().toISOString() },
                  { id: 'ex2', message: 'Prepare BOQ for light fixtures (M8 & M9) — due: Friday', created_at: new Date(Date.now()-3600*1000*5).toISOString() },
                  { id: 'ex3', message: 'Schedule site walkthrough with client for handover checklist', created_at: new Date(Date.now()-3600*1000*24).toISOString() }
                ].map(t => (
                  <div key={t.id} className="p-3 border rounded-lg bg-white text-sm">
                    {t.message}
                    <div className="text-[10px] text-slate-500 mt-1">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="space-y-2">
                {pendingTasks.map(t => (
                  <div key={t.id} className="p-3 border rounded-lg bg-white text-sm">
                    {t.message}
                    <div className="text-[10px] text-slate-500 mt-1">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-slate-200" data-testid="activity-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-auto py-1 px-2" onClick={() => navigate('/projects')}>
              <span className="text-xs">View All</span> <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {activityLogs.length > 0 ? (
              <div className="space-y-2">
                {activityLogs.slice(0, 4).map((log, index) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => log.project_id && navigate(`/projects/${log.project_id}`)}
                    data-testid={`activity-log-${index}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                        {getInitials(user?.name || 'Admin User')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900">
                        {user?.name || 'Admin User'} <span className="font-normal text-slate-600">{log.action.toLowerCase()}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(log.created_at).toLocaleString('en-IN', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500" data-testid="no-activity-msg">
                <p className="text-xs">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links Row */}
      <Card className="border border-slate-200" data-testid="quick-links-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Create Project', icon: FolderKanban, path: '/projects/new' },
              { label: 'Reports', icon: FileText, path: '/reports' },
              { label: 'Upload Invoice', icon: Upload, path: '/documents' },
              { label: 'Manage Templates', icon: Settings, path: '/admin' }
            ].map((link, index) => {
              const Icon = link.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  onClick={() => navigate(link.path)}
                  data-testid={`quick-link-${link.label.toLowerCase().replace(/ /g, '-')}`}
                >
                  <Icon className="w-6 h-6 text-slate-600" />
                  <span className="text-xs font-medium text-slate-900">{link.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};