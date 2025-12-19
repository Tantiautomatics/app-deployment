import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Login } from '@/pages/Auth/Login';
import { Register } from '@/pages/Auth/Register';
import { Dashboard } from '@/pages/Dashboard/Dashboard';
import { Projects } from '@/pages/Projects/Projects';
import { CreateProject } from '@/pages/Projects/CreateProject';
import { ProjectWorkspace } from '@/pages/Projects/ProjectWorkspace';
import { Milestones } from '@/pages/Milestones/Milestones';
import MilestonesGrid from '@/pages/Milestones/MilestonesGrid';
import { Issues } from '@/pages/Issues/Issues';
import DesignDeliverables from '@/pages/Design/DesignDeliverables';
import Tasks from '@/pages/Tasks/Tasks';
import { Documents } from '@/pages/Documents/Documents';
import AdminTemplates from '@/pages/Admin/AdminTemplates';
import Materials from '@/pages/Materials/Materials';
import '@/App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return !user ? children : <Navigate to="/dashboard" />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Private Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <PrivateRoute>
            <MainLayout>
              <Projects />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/new"
        element={
          <PrivateRoute>
            <MainLayout>
              <CreateProject />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <PrivateRoute>
            <MainLayout>
              <ProjectWorkspace />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/milestones"
        element={
          <PrivateRoute>
            <MainLayout>
              <Milestones />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/milestones/list"
        element={
          <PrivateRoute>
            <MainLayout>
              <Milestones />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute>
            <MainLayout>
              <Tasks />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/design"
        element={
          <PrivateRoute>
            <MainLayout>
              <DesignDeliverables />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/:id/design"
        element={
          <PrivateRoute>
            <MainLayout>
              <DesignDeliverables />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/materials"
        element={
          <PrivateRoute>
            <MainLayout>
              <Materials />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/issues"
        element={
          <PrivateRoute>
            <MainLayout>
              <Issues />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/timesheets"
        element={
          <PrivateRoute>
            <MainLayout>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold">Timesheets</h2>
                <p className="text-slate-600 mt-2">Timesheet management coming soon...</p>
              </div>
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <PrivateRoute>
            <MainLayout>
              <Documents />
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <MainLayout>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold">Reports</h2>
                <p className="text-slate-600 mt-2">Advanced reports coming soon...</p>
              </div>
            </MainLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <MainLayout>
              <AdminTemplates />
            </MainLayout>
          </PrivateRoute>
        }
      />

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
