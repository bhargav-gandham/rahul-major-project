import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  GraduationCap,
  Plus,
  ChevronRight,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { mockSubjects, mockAssignments, mockUsers } from '@/lib/mockData';

export function AdminDashboard() {
  const totalFaculty = mockUsers.filter(u => u.role === 'faculty').length;
  const totalStudents = 125; // Mock
  const totalParents = 98; // Mock

  const recentActivity = [
    { action: 'New assignment created', subject: 'Advanced Algorithms', user: 'Prof. Chen', time: '2 hours ago' },
    { action: 'Student submission', subject: 'Database Systems', user: 'Alex T.', time: '4 hours ago' },
    { action: 'Assignment evaluated', subject: 'Machine Learning', user: 'Prof. Chen', time: '5 hours ago' },
    { action: 'New user registered', subject: 'Student', user: 'Jordan K.', time: '1 day ago' },
    { action: 'Course material uploaded', subject: 'Software Engineering', user: 'Dr. Smith', time: '1 day ago' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage users, subjects, and system settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
            <Button variant="hero">
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={totalFaculty + totalStudents + totalParents + 1}
            subtitle={`${totalFaculty} Faculty, ${totalStudents} Students`}
            icon={Users}
            variant="primary"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Active Subjects"
            value={mockSubjects.length}
            subtitle="Across all departments"
            icon={BookOpen}
          />
          <StatCard
            title="Total Assignments"
            value={mockAssignments.length}
            subtitle="This semester"
            icon={ClipboardList}
            variant="success"
          />
          <StatCard
            title="Completion Rate"
            value="78%"
            subtitle="Average across all courses"
            icon={TrendingUp}
            trend={{ value: 5, isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Distribution */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">User Distribution</CardTitle>
              <Button variant="ghost" size="sm">
                Manage
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Faculty</p>
                    <p className="text-sm text-muted-foreground">Teaching staff</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary">{totalFaculty}</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Students</p>
                    <p className="text-sm text-muted-foreground">Enrolled students</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-success">{totalStudents}</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">Parents</p>
                    <p className="text-sm text-muted-foreground">Guardians</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-warning">{totalParents}</span>
              </div>
            </CardContent>
          </Card>

          {/* Subject Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Subject Overview</CardTitle>
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockSubjects.map((subject) => {
                const assignmentCount = mockAssignments.filter(a => a.subjectId === subject.id).length;
                return (
                  <div 
                    key={subject.id}
                    className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-sm">{subject.name}</h3>
                      <Badge variant="outline" className="text-xs">{subject.code}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{subject.credits} Credits</span>
                      <span>•</span>
                      <span>{assignmentCount} Assignments</span>
                      <span>•</span>
                      <span>Difficulty: {subject.difficulty}/5</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.subject} • {activity.user}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
