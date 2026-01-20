import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PriorityAssignmentCard } from '@/components/dashboard/PriorityAssignmentCard';
import { RecentSubmissionCard } from '@/components/dashboard/RecentSubmissionCard';
import { SubmissionForm } from '@/components/submissions/SubmissionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  BookOpen,
  GraduationCap,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { usePrioritizedAssignments, useSubmissions, useAcademicRecords, useSubjects } from '@/hooks/useData';
import { useQueryClient } from '@tanstack/react-query';

interface PrioritizedAssignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  max_marks: number;
  late_submission_allowed: boolean;
  late_submission_penalty: number;
  created_at: string;
  subject?: {
    id: string;
    name: string;
    code: string;
    difficulty: number;
  };
  priority?: {
    score: number;
    level: 'high' | 'medium' | 'low';
    deadline_proximity: number;
    subject_difficulty: number;
    task_volume: number;
  };
}

export function StudentDashboard() {
  const { role, isLoading: authLoading } = useAuth();
  const { data: prioritizedAssignments, isLoading: assignmentsLoading } = usePrioritizedAssignments();
  const { data: submissions, isLoading: submissionsLoading } = useSubmissions();
  const { data: academicRecords, isLoading: recordsLoading } = useAcademicRecords();
  const { data: subjects } = useSubjects();
  const [selectedAssignment, setSelectedAssignment] = useState<PrioritizedAssignment | null>(null);
  const queryClient = useQueryClient();

  // Redirect non-students
  if (!authLoading && role && role !== 'student') {
    return <Navigate to={`/${role}`} replace />;
  }

  const pendingCount = prioritizedAssignments?.length || 0;
  const overdueCount = prioritizedAssignments?.filter(a => new Date(a.deadline) < new Date()).length || 0;
  const submittedCount = submissions?.filter(s => s.status !== 'resubmit').length || 0;
  const evaluatedCount = submissions?.filter(s => s.status === 'evaluated').length || 0;

  // Calculate overall academic progress
  const totalCredits = academicRecords?.reduce((sum, r) => sum + (r.credits_earned || 0), 0) || 0;
  const eligibleSubjects = academicRecords?.filter(r => r.exam_eligible).length || 0;
  const averageScore = academicRecords && academicRecords.length > 0
    ? Math.round(academicRecords.reduce((sum, r) => sum + Number(r.average_score || 0), 0) / academicRecords.length)
    : 0;

  const recentSubmissions = submissions
    ?.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 3) || [];

  const isLoading = assignmentsLoading || submissionsLoading || recordsLoading;

  const handleSubmissionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['submissions'] });
    queryClient.invalidateQueries({ queryKey: ['prioritized-assignments'] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your assignments, submissions, and academic progress
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Pending Assignments"
                value={pendingCount}
                subtitle={`${overdueCount} overdue`}
                icon={ClipboardList}
                variant={overdueCount > 0 ? 'warning' : 'default'}
              />
              <StatCard
                title="Submitted"
                value={submittedCount}
                subtitle="Awaiting evaluation"
                icon={Clock}
                variant="primary"
              />
              <StatCard
                title="Evaluated"
                value={evaluatedCount}
                subtitle="Check your feedback"
                icon={CheckCircle2}
                variant="success"
              />
              <StatCard
                title="Average Score"
                value={`${averageScore}%`}
                subtitle="Across all subjects"
                icon={TrendingUp}
                trend={{ value: 5, isPositive: true }}
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Priority Assignments */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Priority Assignments
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  AI Prioritized
                </Badge>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/student/assignments">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : prioritizedAssignments && prioritizedAssignments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {prioritizedAssignments.slice(0, 4).map((assignment) => (
                  <PriorityAssignmentCard
                    key={assignment.id}
                    assignment={{
                      id: assignment.id,
                      title: assignment.title,
                      description: assignment.description || '',
                      subjectId: assignment.subject?.id || '',
                      subjectName: assignment.subject?.name || '',
                      facultyId: '',
                      deadline: new Date(assignment.deadline),
                      maxMarks: assignment.max_marks,
                      createdAt: new Date(assignment.created_at),
                      lateSubmissionAllowed: assignment.late_submission_allowed,
                      lateSubmissionPenalty: assignment.late_submission_penalty,
                    }}
                    priority={{
                      assignmentId: assignment.id,
                      score: assignment.priority?.score || 0,
                      level: assignment.priority?.level || 'low',
                      deadlineProximity: assignment.priority?.deadline_proximity || 0,
                      subjectDifficulty: assignment.priority?.subject_difficulty || 0,
                      taskVolume: assignment.priority?.task_volume || 0,
                    }}
                    onSubmit={() => setSelectedAssignment(assignment)}
                    onView={() => {}}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                  <h3 className="font-semibold text-lg">All caught up!</h3>
                  <p className="text-muted-foreground">No pending assignments. Enroll in subjects to see assignments.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Academic Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Credits Earned</span>
                    <span className="text-lg font-bold text-primary">{totalCredits}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Exam Eligible Subjects</span>
                    <span>{eligibleSubjects}/{subjects?.length || 0}</span>
                  </div>
                </div>

                {recordsLoading ? (
                  <Skeleton className="h-32" />
                ) : academicRecords && academicRecords.length > 0 ? (
                  academicRecords.map((record) => {
                    const progress = record.total_assignments > 0 
                      ? (record.assignments_completed / record.total_assignments) * 100 
                      : 0;

                    return (
                      <div key={record.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{record.subject?.name}</span>
                          <Badge 
                            variant={record.exam_eligible ? 'success' : 'destructive'}
                            className="text-xs"
                          >
                            {record.exam_eligible ? 'Eligible' : 'At Risk'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            {record.assignments_completed}/{record.total_assignments}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No academic records yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Submissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Recent Submissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submissionsLoading ? (
                  <Skeleton className="h-32" />
                ) : recentSubmissions.length > 0 ? (
                  recentSubmissions.map((submission) => (
                    <RecentSubmissionCard
                      key={submission.id}
                      submission={{
                        id: submission.id,
                        assignmentId: submission.assignment_id,
                        studentId: submission.student_id,
                        submittedAt: new Date(submission.submitted_at),
                        content: submission.content || '',
                        isLate: submission.is_late,
                        status: submission.status as 'pending' | 'evaluated' | 'resubmit',
                        marks: submission.marks || undefined,
                        feedback: submission.feedback || undefined,
                      }}
                      assignment={{
                        id: submission.assignment.id,
                        title: submission.assignment.title,
                        description: '',
                        subjectId: submission.assignment.subject.id,
                        subjectName: submission.assignment.subject.name,
                        facultyId: '',
                        deadline: new Date(),
                        maxMarks: submission.assignment.max_marks,
                        createdAt: new Date(),
                        lateSubmissionAllowed: false,
                        lateSubmissionPenalty: 0,
                      }}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No submissions yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submission Form Dialog */}
        {selectedAssignment && (
          <SubmissionForm
            assignment={{
              id: selectedAssignment.id,
              title: selectedAssignment.title,
              description: selectedAssignment.description,
              deadline: selectedAssignment.deadline,
              max_marks: selectedAssignment.max_marks,
              late_submission_allowed: selectedAssignment.late_submission_allowed,
              late_submission_penalty: selectedAssignment.late_submission_penalty,
              subject: {
                id: selectedAssignment.subject?.id || '',
                name: selectedAssignment.subject?.name || '',
                code: selectedAssignment.subject?.code || '',
              },
            }}
            open={!!selectedAssignment}
            onOpenChange={(open) => !open && setSelectedAssignment(null)}
            onSuccess={handleSubmissionSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
