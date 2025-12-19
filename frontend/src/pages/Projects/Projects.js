import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/utils/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';

export const Projects = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get selected region from localStorage (global region filter)
  const getSelectedRegion = () => {
    if (typeof window !== 'undefined') {
      const region = localStorage.getItem('selectedRegion') || 'All Regions';
      return region === 'All Regions' ? 'all' : region;
    }
    return 'all';
  };

  const [filters, setFilters] = useState({
    region: getSelectedRegion(),
    status: 'all',
    type: 'all'
  });

  const normalizeStatus = (s) => (s || '').toLowerCase().replace(/-/g, ' ').trim();

  const normalizeRegion = (name) => {
    if (!name) return '';
    const raw = name.toString().trim();
    // Try exact match first (case-insensitive)
    const lower = raw.toLowerCase();
    if (lower === 'bengaluru' || lower === 'bangalore') return 'Bengaluru';
    if (lower === 'mysore' || lower === 'mysuru') return 'Mysuru';
    if (lower.includes('north') && lower.includes('karnataka')) return 'North Karnataka';
    // Return original if no match
    return raw;
  };

  const applyFilters = useCallback(() => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Region filter (case-insensitive with normalization)
    if (filters.region && filters.region !== 'all') {
      const normalizedFilterRegion = normalizeRegion(filters.region);
      filtered = filtered.filter(p => {
        if (!p || !p.region) return false;
        const normalizedProjectRegion = normalizeRegion(p.region);
        const matches = normalizedProjectRegion === normalizedFilterRegion;
        return matches;
      });
    }

    // Status filter (case-insensitive, normalize hyphens/spaces)
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(p => normalizeStatus(p.status) === normalizeStatus(filters.status));
    }

    // Type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, filters]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      const response = await Promise.race([
        api.getProjects(),
        timeoutPromise
      ]);
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      if (error.message === 'Request timeout') {
        toast.error('Request timed out. Please check your connection.');
      } else {
        toast.error('Failed to load projects');
      }
      setProjects([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Apply initial filters from query params and global region selection
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qStatus = params.get('status');
    const qRegion = params.get('region');
    
    // Get global region from localStorage
    const globalRegion = getSelectedRegion();
    
    setFilters(prev => {
      const newFilters = { ...prev };
      if (qStatus) {
        newFilters.status = qStatus;
      } else if (!params.has('status')) {
        newFilters.status = 'all';
      }
      
      // Use URL region if provided, otherwise use global region selection
      if (qRegion) {
        newFilters.region = qRegion;
      } else {
        newFilters.region = globalRegion;
      }
      
      return newFilters;
    });
  }, [location.search]);

  // Listen for global region changes from TopBar
  useEffect(() => {
    const handleRegionChange = () => {
      const globalRegion = getSelectedRegion();
      setFilters(prev => ({ ...prev, region: globalRegion }));
    };
    window.addEventListener('regionChanged', handleRegionChange);
    return () => window.removeEventListener('regionChanged', handleRegionChange);
  }, []);

  useEffect(() => {
    // Always apply filters when projects, filters, or search query changes
    setIsFiltering(true);
    const id = setTimeout(() => {
      applyFilters();
      setIsFiltering(false);
    }, 10);
    return () => clearTimeout(id);
  }, [projects, searchQuery, filters, applyFilters]);

  const getStatusColor = (status) => {
    const key = normalizeStatus(status);
    const map = {
      'planning': 'bg-gray-100 text-gray-700',
      'active': 'bg-green-100 text-green-700',
      'on hold': 'bg-yellow-100 text-yellow-700',
      'completed': 'bg-blue-100 text-blue-700',
      'at risk': 'bg-red-100 text-red-700'
    };
    return map[key] || 'bg-gray-100 text-gray-700';
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading || isFiltering) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="projects-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="projects-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Projects</h1>
          <p className="text-slate-600 mt-1">Manage and monitor all your projects</p>
        </div>
        <Button
          onClick={() => navigate('/projects/new')}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          data-testid="create-project-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <Card data-testid="projects-filters-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search projects or clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="projects-search-input"
              />
            </div>
            <Select 
              value={filters.region} 
              onValueChange={(value) => {
                setFilters({ ...filters, region: value });
                // Update global region in localStorage
                if (value === 'all') {
                  localStorage.setItem('selectedRegion', 'All Regions');
                } else {
                  localStorage.setItem('selectedRegion', value);
                }
                window.dispatchEvent(new Event('regionChanged'));
                // Update URL when region filter changes
                const params = new URLSearchParams(location.search);
                if (value === 'all') {
                  params.delete('region');
                } else {
                  params.set('region', value);
                }
                navigate(`/projects?${params.toString()}`, { replace: true });
              }}
            >
              <SelectTrigger data-testid="filter-region">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="Bengaluru">Bengaluru</SelectItem>
                <SelectItem value="Mysuru">Mysuru</SelectItem>
                <SelectItem value="North Karnataka">North Karnataka</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="At-Risk">At-Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
              <SelectTrigger data-testid="filter-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card data-testid="no-projects-msg">
          <CardContent className="py-12 text-center">
            <div className="text-slate-400 mb-4">
              <Filter className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No projects found</h3>
            <p className="text-slate-500 mb-6">Try adjusting your filters or create a new project</p>
            <Button
              onClick={() => navigate('/projects/new')}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              data-testid="create-first-project-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const daysRemaining = getDaysRemaining(project.end_date);
            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden group"
                onClick={() => navigate(`/projects/${project.id}`)}
                data-testid={`project-card-${project.id}`}
              >
                <div className={`h-2 bg-gradient-to-r ${project.status === 'Active' ? 'from-green-500 to-green-600' : project.status === 'At-Risk' ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'}`}></div>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-cyan-600 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm text-slate-600">{project.client}</p>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Region</span>
                      <span className="font-medium text-slate-900">{project.region}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Value</span>
                      <span className="font-medium text-slate-900">₹{project.value?.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium text-slate-900">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                      <span className="text-slate-600">Days Remaining</span>
                      <span className={`font-medium ${daysRemaining < 0 ? 'text-red-600' : daysRemaining < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
                      </span>
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
