import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AuthPage from "./pages/auth/AuthPage";
import { TeacherDashboard } from "./pages/teacher/TeacherDashboard";
import { UploadData } from "./pages/teacher/UploadData";
import { StudentAnalytics } from "./pages/teacher/StudentAnalytics";
import { ManageStudents } from "./pages/teacher/ManageStudents";
import { StudentDashboard } from "./pages/student/StudentDashboard";
import { GoalTracker } from "./pages/student/GoalTracker";
import { WeeklyPlan } from "./pages/student/WeeklyPlan";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (role && !allowedRoles.includes(role)) return <Navigate to={`/${role === 'faculty' ? 'teacher' : role}`} replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Teacher Routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['faculty']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/upload" element={<ProtectedRoute allowedRoles={['faculty']}><UploadData /></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['faculty']}><ManageStudents /></ProtectedRoute>} />
      <Route path="/teacher/student/:studentId" element={<ProtectedRoute allowedRoles={['faculty']}><StudentAnalytics /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/goals" element={<ProtectedRoute allowedRoles={['student']}><GoalTracker /></ProtectedRoute>} />
      <Route path="/student/plan" element={<ProtectedRoute allowedRoles={['student']}><WeeklyPlan /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
