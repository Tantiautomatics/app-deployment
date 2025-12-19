import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/utils/api';
import { Plus, CheckSquare, ClipboardCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const Tasks = () => {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('mine');
  const [assignedByMe, setAssignedByMe] = useState([]);
  const [googleTasks, setGoogleTasks] = useState([]);
  const [loadingGoogleTasks, setLoadingGoogleTasks] = useState(false);
  const listRef = React.useRef(null);
  const [statFilter, setStatFilter] = useState(null); // 'all' | 'mine' | 'pending' | 'completed'
  const handleStatClick = (filter) => {
    setActiveTab('mine');
    setStatFilter(filter);
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  };
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssigneeEmail, setTaskAssigneeEmail] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const isValidEmail = (email) => {
    if (!email) return false;
    // Basic RFC5322-like email check; good enough for client validation
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  useEffect(() => {
    load();
  }, []);

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

  // 🌐 Fetch Google Tasks
  const fetchGoogleTasks = async () => {
    try {
      setLoadingGoogleTasks(true);
      const res = await fetch("/tasks/google/items");
      const data = await res.json();
      setGoogleTasks(data.tasks || []);
    } catch (err) {
      console.error("Error loading Google Tasks:", err);
      setGoogleTasks([]);
    } finally {
      setLoadingGoogleTasks(false);
    }
  };

  // 🟢 Mark Google Task as complete
  const markGoogleTaskComplete = async (taskId) => {
    try {
      await fetch(`/tasks/google/complete/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      setGoogleTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast.success('Google Task marked as complete');
    } catch (err) {
      console.error("Error completing Google Task:", err);
      toast.error('Failed to complete task');
    }
  };

  const load = async () => {
    try {
      const res = await api.getNotifications();
      let notifications = res.data || [];
      
      // Filter by region if selected
      const selectedRegion = getSelectedRegion();
      if (selectedRegion) {
        // Get projects to filter tasks by region
        const projectsRes = await api.getProjects();
        const normalizedFilterRegion = normalizeRegion(selectedRegion);
        const filteredProjectIds = new Set(
          (projectsRes.data || [])
            .filter(p => {
              if (!p.region) return false;
              const normalizedProjectRegion = normalizeRegion(p.region);
              return normalizedProjectRegion === normalizedFilterRegion;
            })
            .map(p => p.id)
        );
        
        notifications = notifications.filter(n => 
          !n.project_id || filteredProjectIds.has(n.project_id)
        );
      }
      
      setNotifications(notifications);
      
      const assigned = await api.getTasksAssignedByMe();
      let assignedTasks = assigned.data || [];
      
      // Filter assigned tasks by region
      if (selectedRegion) {
        const projectsRes = await api.getProjects();
        const normalizedFilterRegion = normalizeRegion(selectedRegion);
        const filteredProjectIds = new Set(
          (projectsRes.data || [])
            .filter(p => {
              if (!p.region) return false;
              const normalizedProjectRegion = normalizeRegion(p.region);
              return normalizedProjectRegion === normalizedFilterRegion;
            })
            .map(p => p.id)
        );
        
        assignedTasks = assignedTasks.filter(t => 
          !t.project_id || filteredProjectIds.has(t.project_id)
        );
      }
      
      setAssignedByMe(assignedTasks);
      
      // Fetch Google Tasks
      await fetchGoogleTasks();
    } catch (e) {
      console.error('Failed to load tasks', e);
    }
  };

  // Listen for global region changes
  useEffect(() => {
    const handleRegionChange = () => {
      load();
    };
    window.addEventListener('regionChanged', handleRegionChange);
    return () => window.removeEventListener('regionChanged', handleRegionChange);
  }, []);

  const stats = useMemo(() => {
    const total = notifications.length;
    const mine = notifications.length; // notifications are for current user
    const completed = 0; // completion flow not implemented yet
    const pending = Math.max(total - completed, 0);
    if (total === 0) {
      return { total: 4, mine: 2, pending: 2, completed: 0 }; // examples when empty
    }
    return { total, mine, pending, completed };
  }, [notifications]);

  const submitTask = async () => {
    try {
      if (!taskAssigneeEmail || !taskTitle) {
        toast.error('Provide assignee email and task title');
        return;
      }
      if (!isValidEmail(taskAssigneeEmail)) {
        toast.error('Enter a valid email address (e.g., user@example.com)');
        return;
      }
      const meta = [];
      if (taskPriority) meta.push(`priority: ${taskPriority}`);
      if (taskDueDate) meta.push(`due: ${taskDueDate}`);
      const message = `${taskTitle}${taskDescription ? ' — ' + taskDescription : ''}${meta.length ? ' (' + meta.join(', ') + ')' : ''}`;
      const link = taskProject || undefined;
      await api.createTask({ assignee_email: taskAssigneeEmail, message, link });
      toast.success('Task sent');
      setTaskOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskAssigneeEmail('');
      setTaskProject('');
      setTaskPriority('Medium');
      setTaskDueDate('');
      await load();
    } catch (e) {
      let msg = 'Failed to send task';
      const detail = e?.response?.data?.detail;
      if (detail) {
        if (Array.isArray(detail)) {
          msg = detail.map(err => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof detail === 'string') {
          msg = detail;
        } else {
          msg = JSON.stringify(detail);
        }
      }
      console.error('Failed to create task', e);
      toast.error(msg);
    }
  };

  const openGoogleChat = () => {
    window.open("https://mail.google.com/mail/u/0/#chat/home", "_blank");
  };

  return (
    <div className="flex flex-col items-center justify-center" style={{ 
      height: 'calc(100vh - 80px)',
      width: '100%',
      transform: 'translateY(-80px)'
    }}>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Tasks</h1>
          <p className="text-slate-600 mt-1">Manage and track all your tasks</p>
      </div>
      <Button
        onClick={openGoogleChat}
        className="bg-black hover:bg-gray-800 text-white"
      >
        💬 Click here to open Google Chat
      </Button>
    </div>
  );
};

export default Tasks;


