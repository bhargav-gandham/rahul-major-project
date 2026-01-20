import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { PriorityAssignmentCard } from '@/components/dashboard/PriorityAssignmentCard';
import { RecentSubmissionCard } from '@/components/dashboard/RecentSubmissionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  BookOpen,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { 
  getAssignmentPriorities, 
  mockSubmissions, 
  mockAssignments,
  mockAcademicRecords,
  mockSubjects,
} from '@/lib/mockData';

export function StudentDashboard() {
  const prioritizedAssignments = getAssignmentPriorities();
  const pendingCount = prioritizedAssignments.length;
  const submittedCount = mockSubmissions.filter(s => s.status !== 'resubmit').length;
  const evaluatedCount = mockSubmissions.filter(s => s.status === 'evaluated').length;
  const overdueCount = prioritizedAssignments.filter(a => new Date(a.deadline) < new Date()).length;

  const recentSubmissions = mockSubmissions
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 3);

  // Calculate overall academic progress
  const totalCredits = mockAcademicRecords.reduce((sum, r) => sum + r.credits, 0);
  const eligibleSubjects = mockAcademicRecords.filter(r => r.examEligible).length;
  const averageScore = mockAcademicRecords.length > 0
    ? Math.round(mockAcademicRecords.reduce((sum, r) => sum + r.averageScore, 0) / mockAcademicRecords.length)
    : 0;

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
              <Badge variant="outline" className="font-normal">
                AI Prioritized
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {prioritizedAssignments.slice(0, 4).map((assignment) => (
                <PriorityAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  priority={assignment.priority}
                  onSubmit={() => console.log('Submit', assignment.id)}
                  onView={() => console.log('View', assignment.id)}
                />
              ))}
            </div>

            {prioritizedAssignments.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                  <h3 className="font-semibold text-lg">All caught up!</h3>
                  <p className="text-muted-foreground">No pending assignments</p>
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
                    <span>{eligibleSubjects}/{mockSubjects.length}</span>
                  </div>
                </div>

                {mockAcademicRecords.map((record) => {
                  const subject = mockSubjects.find(s => s.id === record.subjectId);
                  if (!subject) return null;
                  
                  const progress = record.totalAssignments > 0 
                    ? (record.assignmentsCompleted / record.totalAssignments) * 100 
                    : 0;

                  return (
                    <div key={record.subjectId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{subject.name}</span>
                        <Badge 
                          variant={record.examEligible ? 'success' : 'destructive'}
                          className="text-xs"
                        >
                          {record.examEligible ? 'Eligible' : 'At Risk'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {record.assignmentsCompleted}/{record.totalAssignments}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                {recentSubmissions.map((submission) => {
                  const assignment = mockAssignments.find(a => a.id === submission.assignmentId);
                  if (!assignment) return null;
                  return (
                    <RecentSubmissionCard
                      key={submission.id}
                      submission={submission}
                      assignment={assignment}
                    />
                  );
                })}

                {recentSubmissions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No submissions yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
