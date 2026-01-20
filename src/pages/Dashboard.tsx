import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function Dashboard() {
  const { role, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Redirect based on role
  switch (role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'faculty':
      return <Navigate to="/faculty" replace />;
    case 'parent':
      return <Navigate to="/parent" replace />;
    case 'student':
    default:
      return <Navigate to="/student" replace />;
  }
}
