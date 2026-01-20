import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  ClipboardList, 
  FileText, 
  Users,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { mockSubjects, mockAssignments, mockSubmissions } from '@/lib/mockData';
import { format } from 'date-fns';

export function FacultyDashboard() {
  const mySubjects = mockSubjects.filter(s => s.facultyId === '2');
  const myAssignments = mockAssignments.filter(a => a.facultyId === '2');
  const pendingReviews = mockSubmissions.filter(s => s.status === 'pending');
  const totalStudents = 45; // Mock data

  // Group submissions by assignment for quick overview
  const assignmentStats = myAssignments.map(assignment => {
    const submissions = mockSubmissions.filter(s => s.assignmentId === assignment.id);
    const evaluated = submissions.filter(s => s.status === 'evaluated').length;
    const pending = submissions.filter(s => s.status === 'pending').length;
    return {
      ...assignment,
      submissions: submissions.length,
      evaluated,
      pending,
      totalExpected: totalStudents,
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Faculty Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your courses, assignments, and student submissions
            </p>
          </div>
          <Button variant="hero">
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="My Subjects"
            value={mySubjects.length}
            subtitle="Currently teaching"
            icon={BookOpen}
            variant="primary"
          />
          <StatCard
            title="Active Assignments"
            value={myAssignments.length}
            subtitle="Across all subjects"
            icon={ClipboardList}
          />
          <StatCard
            title="Pending Reviews"
            value={pendingReviews.length}
            subtitle="Awaiting evaluation"
            icon={FileText}
            variant={pendingReviews.length > 5 ? 'warning' : 'default'}
          />
          <StatCard
            title="Total Students"
            value={totalStudents}
            subtitle="Enrolled in your courses"
            icon={Users}
            variant="success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* My Subjects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">My Subjects</CardTitle>
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {mySubjects.map((subject) => (
                <div 
                  key={subject.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground">{subject.code}</p>
                    </div>
                    <Badge variant="outline">{subject.credits} Credits</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {subject.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <ClipboardList className="h-4 w-4" />
                      {myAssignments.filter(a => a.subjectId === subject.id).length} Assignments
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {totalStudents} Students
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Assignment Overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Assignment Overview</h2>
              <Button variant="outline" size="sm">
                Manage All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="grid gap-4">
              {assignmentStats.map((assignment) => {
                const submissionRate = (assignment.submissions / assignment.totalExpected) * 100;
                const isDeadlinePassed = new Date(assignment.deadline) < new Date();

                return (
                  <Card key={assignment.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{assignment.title}</h3>
                          <p className="text-sm text-muted-foreground">{assignment.subjectName}</p>
                        </div>
                        <Badge 
                          variant={isDeadlinePassed ? 'secondary' : 'outline'}
                          className="shrink-0"
                        >
                          {isDeadlinePassed ? 'Closed' : 'Active'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-success mb-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-lg font-bold">{assignment.evaluated}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Evaluated</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-warning mb-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-lg font-bold">{assignment.pending}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-lg font-bold">
                              {assignment.totalExpected - assignment.submissions}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Not Submitted</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Submission Rate</span>
                          <span className="font-medium">{Math.round(submissionRate)}%</span>
                        </div>
                        <Progress value={submissionRate} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <span className="text-sm text-muted-foreground">
                          Deadline: {format(new Date(assignment.deadline), 'MMM d, yyyy h:mm a')}
                        </span>
                        <Button size="sm">
                          Review Submissions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
