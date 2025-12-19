import React, { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Issues = ({ projectId }) => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    project_id: projectId ? String(projectId) : '',
    title: '',
    description: '',
    severity: 'Med',
    assigned_to: ''
  });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  // Normalize region names
  const normalizeRegion = (name) => {
    if (!name) return '';
    const raw = name.toString().trim().toLowerCase();
    if (raw === 'bengaluru' || raw === 'bangalore') return 'bengaluru';
    if (raw === 'mysore' || raw === 'mysuru') return 'mysuru';
    if (raw.includes('north') && raw.includes('karnataka')) return 'north karnataka';
    return raw;
  };

  // Get selected region from localStorage (global region filter)
  const getSelectedRegion = () => {
    if (typeof window !== 'undefined') {
      const region = localStorage.getItem('selectedRegion') || 'All Regions';
      return region === 'All Regions' ? null : region;
    }
    return null;
  };

  const fetchData = async () => {
    try {
      const [issuesRes, projectsRes] = await Promise.all([
        api.getIssues(projectId),
        api.getProjects()
      ]);
      
      let issues = issuesRes.data || [];
      let projects = projectsRes.data || [];
      
      // Filter by region if selected
      const selectedRegion = getSelectedRegion();
      if (selectedRegion) {
        const normalizedFilterRegion = normalizeRegion(selectedRegion);
        projects = projects.filter(p => {
          if (!p.region) return false;
          const normalizedProjectRegion = normalizeRegion(p.region);
          return normalizedProjectRegion === normalizedFilterRegion;
        });
        
        // Filter issues by project region
        const projectIds = new Set(projects.map(p => p.id));
        issues = issues.filter(i => !i.project_id || projectIds.has(i.project_id));
      }
      
      setIssues(issues);
      setProjects(projects);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  // Listen for global region changes
  useEffect(() => {
    const handleRegionChange = () => {
      fetchData();
    };
    window.addEventListener('regionChanged', handleRegionChange);
    return () => window.removeEventListener('regionChanged', handleRegionChange);
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        project_id: parseInt(formData.project_id)
      };
      await api.createIssue(payload);
      toast.success('Issue created successfully!');
      setDialogOpen(false);
      fetchData();
      setFormData({
        project_id: '',
        title: '',
        description: '',
        severity: 'Med',
        assigned_to: ''
      });
    } catch (error) {
      console.error('Failed to create issue:', error);
      toast.error('Failed to create issue');
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'Low': 'bg-blue-100 text-blue-700 border-blue-300',
      'Med': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'High': 'bg-orange-100 text-orange-700 border-orange-300',
      'Critical': 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[severity] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Open': 'bg-blue-100 text-blue-700',
      'In-Progress': 'bg-yellow-100 text-yellow-700',
      'Resolved': 'bg-green-100 text-green-700',
      'Escalated': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="issues-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Issues & SLA</h1>
          <p className="text-slate-600 mt-1">Track and manage project issues</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600" data-testid="create-issue-btn">
              <Plus className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report New Issue</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <SelectItem value="none" disabled>No projects available</SelectItem>
                    ) : (
                      projects.map((project) => (
                        <SelectItem key={project.id} value={String(project.id)}>{project.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Issue Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter issue title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the issue in detail"
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity *</Label>
                  <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Med">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Input
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    placeholder="Assignee name or email"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Report Issue</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No issues reported</h3>
            <p className="text-slate-500 mb-6">Great! All projects are running smoothly</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => {
            const project = projects.find(p => p.id === issue.project_id);
            return (
              <Card key={issue.id} className="hover:shadow-lg transition-shadow" data-testid={`issue-card-${issue.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getSeverityColor(issue.severity)} border-2`}>
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{issue.title}</h3>
                          <p className="text-sm text-slate-600">{project?.name || 'Unknown Project'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                          <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mb-4">{issue.description}</p>
                      <div className="flex items-center gap-6 text-sm text-slate-600">
                        <div>
                          <span className="font-medium">Assigned to:</span> {issue.assigned_to || 'Unassigned'}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(issue.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Updated:</span> {new Date(issue.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
