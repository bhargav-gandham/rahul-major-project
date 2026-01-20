import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  GraduationCap, 
  ClipboardList, 
  TrendingUp, 
  AlertTriangle,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
} from 'lucide-react';
import { 
  mockAcademicRecords, 
  mockSubjects, 
  getAssignmentPriorities,
  mockSubmissions,
  mockAssignments,
} from '@/lib/mockData';
import { format, formatDistanceToNow } from 'date-fns';

export function ParentDashboard() {
  const studentName = "Alex Thompson";
  const prioritizedAssignments = getAssignmentPriorities();
  
  // Calculate overall stats
  const totalCredits = mockAcademicRecords.reduce((sum, r) => sum + r.credits, 0);
  const eligibleSubjects = mockAcademicRecords.filter(r => r.examEligible).length;
  const atRiskSubjects = mockAcademicRecords.filter(r => !r.examEligible).length;
  const averageScore = mockAcademicRecords.length > 0
    ? Math.round(mockAcademicRecords.reduce((sum, r) => sum + r.averageScore, 0) / mockAcademicRecords.length)
    : 0;

  const overdueAssignments = prioritizedAssignments.filter(a => new Date(a.deadline) < new Date());
  const upcomingDeadlines = prioritizedAssignments.filter(a => {
    const deadline = new Date(a.deadline);
    const now = new Date();
    return deadline > now && deadline.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000; // 3 days
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parent Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor {studentName}'s academic progress and assignments
          </p>
        </div>

        {/* Alerts Section */}
        {(atRiskSubjects > 0 || overdueAssignments.length > 0) && (
          <div className="space-y-3">
            {atRiskSubjects > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Exam Eligibility at Risk</AlertTitle>
                <AlertDescription>
                  {studentName} is at risk of losing exam eligibility in {atRiskSubjects} subject(s) 
                  due to incomplete assignments. Please ensure timely submission.
                </AlertDescription>
              </Alert>
            )}
            {overdueAssignments.length > 0 && (
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertTitle>Overdue Assignments</AlertTitle>
                <AlertDescription>
                  {overdueAssignments.length} assignment(s) are past their deadline. 
                  Some may still accept late submissions with penalty.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Average Score"
            value={`${averageScore}%`}
            subtitle="Overall performance"
            icon={TrendingUp}
            variant={averageScore >= 70 ? 'success' : averageScore >= 50 ? 'warning' : 'destructive'}
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard
            title="Credits Earned"
            value={totalCredits}
            subtitle="This semester"
            icon={GraduationCap}
            variant="primary"
          />
          <StatCard
            title="Pending Assignments"
            value={prioritizedAssignments.length}
            subtitle={`${overdueAssignments.length} overdue`}
            icon={ClipboardList}
            variant={overdueAssignments.length > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Exam Eligibility"
            value={`${eligibleSubjects}/${mockSubjects.length}`}
            subtitle={atRiskSubjects > 0 ? `${atRiskSubjects} at risk` : 'All clear'}
            icon={atRiskSubjects > 0 ? AlertTriangle : CheckCircle2}
            variant={atRiskSubjects > 0 ? 'destructive' : 'success'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Subject Performance */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subject Performance
            </h2>

            <div className="grid gap-4">
              {mockAcademicRecords.map((record) => {
                const subject = mockSubjects.find(s => s.id === record.subjectId);
                if (!subject) return null;

                const completionRate = record.totalAssignments > 0
                  ? (record.assignmentsCompleted / record.totalAssignments) * 100
                  : 0;

                return (
                  <Card key={record.subjectId}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{subject.name}</h3>
                          <p className="text-sm text-muted-foreground">{subject.code} • {subject.credits} Credits</p>
                        </div>
                        <Badge variant={record.examEligible ? 'success' : 'destructive'}>
                          {record.examEligible ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Eligible</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> At Risk</>
                          )}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-primary">{record.averageScore}%</p>
                          <p className="text-xs text-muted-foreground">Avg Score</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">{record.assignmentsCompleted}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold">{record.totalAssignments - record.assignmentsCompleted}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Assignment Completion</span>
                          <span className="font-medium">{Math.round(completionRate)}%</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((assignment) => (
                    <div 
                      key={assignment.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">{assignment.title}</h4>
                        <Badge 
                          variant={
                            assignment.priority.level === 'high' 
                              ? 'priority-high' 
                              : assignment.priority.level === 'medium'
                              ? 'priority-medium'
                              : 'priority-low'
                          }
                          className="text-xs shrink-0"
                        >
                          {assignment.priority.level}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{assignment.subjectName}</p>
                      <p className="text-xs text-warning font-medium">
                        Due {formatDistanceToNow(new Date(assignment.deadline), { addSuffix: true })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No urgent deadlines
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Feedback */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Recent Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockSubmissions
                  .filter(s => s.status === 'evaluated' && s.feedback)
                  .slice(0, 3)
                  .map((submission) => {
                    const assignment = mockAssignments.find(a => a.id === submission.assignmentId);
                    if (!assignment) return null;

                    return (
                      <div key={submission.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm line-clamp-1">{assignment.title}</h4>
                          <span className="text-lg font-bold text-primary">
                            {submission.marks}/{assignment.maxMarks}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{assignment.subjectName}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          "{submission.feedback}"
                        </p>
                      </div>
                    );
                  })}

                {mockSubmissions.filter(s => s.status === 'evaluated' && s.feedback).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No feedback available yet
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
