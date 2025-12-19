import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Target, FileText, Palette, ShoppingCart, AlertCircle, Clock, FileBox, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/milestones', icon: Target, label: 'Milestones' },
  { path: '/tasks', icon: FileText, label: 'Task' },
  { path: '/design', icon: Palette, label: 'Design Deliverables' },
  { path: '/materials', icon: ShoppingCart, label: 'Material Requests / POs' },
  { path: '/issues', icon: AlertCircle, label: 'Issues & SLA' },
  { path: '/timesheets', icon: Clock, label: 'Timesheets' },
  { path: '/documents', icon: FileBox, label: 'Documents' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/admin', icon: Settings, label: 'Admin / Templates' },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white fixed left-0 top-0 flex flex-col shadow-2xl border-r border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="sidebar-logo">Tanti Projects</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`sidebar-link-${item.label.toLowerCase().replace(/ /g, '-')}`}
              className={cn(
                'flex items-center gap-3 px-6 py-3 transition-all duration-200 border-l-4 hover:bg-slate-700/50',
                isActive
                  ? 'bg-slate-700/70 border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-300 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
