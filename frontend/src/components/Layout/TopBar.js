import React, { useState, useEffect } from 'react';
import { Search, Plus, Bell, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

export const TopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    // Check if dark mode was previously set
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);
  const [notifications, setNotifications] = useState([]);
  const [region, setRegion] = useState(() => {
    // Get region from localStorage or default to 'All Regions'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedRegion') || 'All Regions';
    }
    return 'All Regions';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssigneeEmail, setTaskAssigneeEmail] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const isValidEmail = (email) => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 10000);
    return () => clearInterval(id);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.getNotifications();
      const fresh = response.data || [];
      // Show popup toasts for unread notifications
      fresh.filter(n => !n.read).forEach(n => {
        toast.info(n.message, { duration: 4000 });
      });
      setNotifications(fresh);
      // Mark as read after showing
      if (fresh.some(n => !n.read)) {
        await api.markNotificationsRead();
        setNotifications(fresh.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

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

  const unreadCount = notifications.filter(n => !n.read).length;

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 fixed top-0 left-64 right-0 z-10 shadow-sm" data-testid="top-bar">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left Section: Search */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search projects, scope items, POs, issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200"
              data-testid="global-search-input"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* +New Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="bg-cyan-600 hover:bg-cyan-700" data-testid="new-dropdown-trigger">
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid="new-dropdown-menu">
              <DropdownMenuItem onClick={() => navigate('/projects/new')} data-testid="new-project-option">Create Project</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTaskOpen(true)} data-testid="new-task-option">Task</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/materials/new')} data-testid="new-material-request-option">Material Request</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/issues/new')} data-testid="new-issue-option">Report Issue</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" data-testid="notifications-trigger">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500" data-testid="notifications-badge">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80" data-testid="notifications-dropdown">
              <div className="p-2 font-semibold border-b flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllRead} data-testid="mark-all-read-btn">
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500" data-testid="no-notifications-msg">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`p-3 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                      onClick={() => notification.link && navigate(notification.link)}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div>
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Region Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="region-switcher-trigger">
                {region}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid="region-switcher-menu">
              <DropdownMenuItem onClick={() => {
                setRegion('All Regions');
                localStorage.setItem('selectedRegion', 'All Regions');
                window.dispatchEvent(new Event('regionChanged'));
              }} data-testid="region-all">All Regions</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setRegion('Bengaluru');
                localStorage.setItem('selectedRegion', 'Bengaluru');
                window.dispatchEvent(new Event('regionChanged'));
              }} data-testid="region-bengaluru">Bengaluru</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setRegion('Mysuru');
                localStorage.setItem('selectedRegion', 'Mysuru');
                window.dispatchEvent(new Event('regionChanged'));
              }} data-testid="region-mysuru">Mysuru</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setRegion('North Karnataka');
                localStorage.setItem('selectedRegion', 'North Karnataka');
                window.dispatchEvent(new Event('regionChanged'));
              }} data-testid="region-north-karnataka">North Karnataka</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            data-testid="theme-toggle-btn"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-trigger">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-cyan-600 text-white text-sm">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.role}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid="user-menu">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500">{user?.email || ''}</p>
                <p className="text-xs text-slate-500">{user?.role || ''}</p>
                {user?.region && <p className="text-xs text-slate-500 mt-1">Region: {user.region}</p>}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} data-testid="user-logout-option">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-600 mb-1">Task Title</div>
              <Input placeholder="Enter task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Description</div>
              <Input placeholder="Description" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} />
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Assign To</div>
              <Input type="email" placeholder="Assignee email" value={taskAssigneeEmail} onChange={(e) => setTaskAssigneeEmail(e.target.value)} />
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Project (Optional)</div>
              <Input placeholder="/projects/123 or full link" value={taskProject} onChange={(e) => setTaskProject(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-slate-600 mb-1">Priority</div>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Due Date</div>
                <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button onClick={submitTask}>Create Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
