import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Upload, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';

export function TeacherDashboard() {
  const { user } = useAuth();

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['teacher-performance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_performance')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['teacher-recommendations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_recommendations')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get unique students
  const uniqueStudents = [...new Set(performanceData?.map(p => p.student_id) || [])];
  const totalRecords = performanceData?.length || 0;
  const avgScore = performanceData && performanceData.length > 0
    ? Math.round(performanceData.reduce((sum, p) => sum + (Number(p.marks) / Number(p.max_marks)) * 100, 0) / performanceData.length)
    : 0;
  const pendingRecs = recommendations?.filter(r => r.status === 'pending').length || 0;

  // Get student profiles for the list
  const { data: studentProfiles } = useQuery({
    queryKey: ['student-profiles', uniqueStudents],
    queryFn: async () => {
      if (uniqueStudents.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', uniqueStudents);
      if (error) throw error;
      return data;
    },
    enabled: uniqueStudents.length > 0,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Teacher Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage student performance and analytics</p>
          </div>
          <Button asChild>
            <Link to="/teacher/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted"><Users className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="text-2xl font-bold">{uniqueStudents.length}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted"><BarChart3 className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalRecords}</p>
                  <p className="text-xs text-muted-foreground">Records</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted"><TrendingUp className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="text-2xl font-bold">{avgScore}%</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted"><BarChart3 className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="text-2xl font-bold">{pendingRecs}</p>
                  <p className="text-xs text-muted-foreground">Pending Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Students</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : studentProfiles && studentProfiles.length > 0 ? (
              <div className="divide-y">
                {studentProfiles.map(student => {
                  const studentData = performanceData?.filter(p => p.student_id === student.user_id) || [];
                  const studentAvg = studentData.length > 0
                    ? Math.round(studentData.reduce((s, p) => s + (Number(p.marks) / Number(p.max_marks)) * 100, 0) / studentData.length)
                    : 0;

                  return (
                    <Link
                      key={student.user_id}
                      to={`/teacher/student/${student.user_id}`}
                      className="flex items-center justify-between py-3 px-1 hover:bg-muted/50 rounded-md transition-colors -mx-1 px-2"
                    >
                      <div>
                        <p className="font-medium text-sm">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{studentAvg}%</p>
                          <p className="text-xs text-muted-foreground">{studentData.length} records</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No student data yet.</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/teacher/upload">Upload student data</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
