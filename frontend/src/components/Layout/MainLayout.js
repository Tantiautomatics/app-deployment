import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useLocation } from 'react-router-dom';

export const MainLayout = ({ children }) => {
  const location = useLocation();

  // Generate breadcrumb from path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      label: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
      path: '/' + paths.slice(0, index + 1).join('/')
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />
      
      {/* Main Content Area */}
      <div className="ml-64 mt-16 p-4">
        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600" data-testid="breadcrumb">
            <span className="hover:text-slate-900 cursor-pointer">Home</span>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <span>/</span>
                <span
                  className={index === breadcrumbs.length - 1 ? 'text-slate-900 font-medium' : 'hover:text-slate-900 cursor-pointer'}
                  data-testid={`breadcrumb-${crumb.label.toLowerCase().replace(/ /g, '-')}`}
                >
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
        
        {/* Page Content */}
        <div>{children}</div>
      </div>
    </div>
  );
};
