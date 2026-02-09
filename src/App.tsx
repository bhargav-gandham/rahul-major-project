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
import { ComparativeAnalytics } from "./pages/teacher/ComparativeAnalytics";
import { ExplainableAI } from "./pages/teacher/ExplainableAI";
import { DropoutPrediction } from "./pages/teacher/DropoutPrediction";
import { StudentDashboard } from "./pages/student/StudentDashboard";
import { GoalTracker } from "./pages/student/GoalTracker";
import { WeeklyPlan } from "./pages/student/WeeklyPlan";
import { AiTutor } from "./pages/student/AiTutor";
import { PersonalizedRecommendations } from "./pages/student/PersonalizedRecommendations";
import ResearchPaper from "./pages/ResearchPaper";
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
      <Route path="/teacher/analytics" element={<ProtectedRoute allowedRoles={['faculty']}><ComparativeAnalytics /></ProtectedRoute>} />
      <Route path="/teacher/student/:studentId" element={<ProtectedRoute allowedRoles={['faculty']}><StudentAnalytics /></ProtectedRoute>} />
      <Route path="/teacher/explainable-ai" element={<ProtectedRoute allowedRoles={['faculty']}><ExplainableAI /></ProtectedRoute>} />
      <Route path="/teacher/dropout-prediction" element={<ProtectedRoute allowedRoles={['faculty']}><DropoutPrediction /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/goals" element={<ProtectedRoute allowedRoles={['student']}><GoalTracker /></ProtectedRoute>} />
      <Route path="/student/plan" element={<ProtectedRoute allowedRoles={['student']}><WeeklyPlan /></ProtectedRoute>} />
      <Route path="/student/tutor" element={<ProtectedRoute allowedRoles={['student']}><AiTutor /></ProtectedRoute>} />
      <Route path="/student/recommendations" element={<ProtectedRoute allowedRoles={['student']}><PersonalizedRecommendations /></ProtectedRoute>} />

      <Route path="/research-paper" element={<ResearchPaper />} />
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
