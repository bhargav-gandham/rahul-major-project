import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { TrendingUp, Brain, Target, CalendarDays, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function StudentDashboard() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['my-performance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_performance')
        .select('*')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['my-recommendations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_recommendations')
        .select('*')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const fetchInsights = async () => {
    if (!performanceData || performanceData.length === 0) return;
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-performance', {
        body: { studentId: user?.id, performanceData, mode: 'student' },
      });
      if (error) throw error;
      setInsights(data);
    } catch {
      // silently fail
    } finally {
      setLoadingInsights(false);
    }
  };

  // Compute stats
  const subjectStats = performanceData?.reduce((acc, p) => {
    if (!acc[p.subject]) acc[p.subject] = { scores: [], attendance: [] };
    acc[p.subject].scores.push((Number(p.marks) / Number(p.max_marks)) * 100);
    acc[p.subject].attendance.push(Number(p.attendance_percentage));
    return acc;
  }, {} as Record<string, { scores: number[]; attendance: number[] }>) || {};

  const subjectChartData = Object.entries(subjectStats).map(([subject, { scores, attendance }]) => ({
    subject,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    attendance: Math.round(attendance.reduce((a, b) => a + b, 0) / attendance.length),
  }));

  const overallAvg = subjectChartData.length > 0
    ? Math.round(subjectChartData.reduce((s, d) => s + d.score, 0) / subjectChartData.length)
    : 0;

  const overallAttendance = subjectChartData.length > 0
    ? Math.round(subjectChartData.reduce((s, d) => s + d.attendance, 0) / subjectChartData.length)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Performance</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your academic progress and insights</p>
          </div>
          <Button onClick={fetchInsights} disabled={loadingInsights || !performanceData?.length} variant="outline">
            {loadingInsights ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            Get Insights
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Overall Score</p>
              <p className="text-3xl font-bold mt-1">{overallAvg}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Attendance</p>
              <p className="text-3xl font-bold mt-1">{overallAttendance}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Subjects</p>
              <p className="text-3xl font-bold mt-1">{subjectChartData.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Assessments</p>
              <p className="text-3xl font-bold mt-1">{performanceData?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {subjectChartData.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Subject Performance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={subjectChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="score" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} name="Score %" />
                    <Bar dataKey="attendance" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Strengths & Weaknesses</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={subjectChartData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                    <Radar dataKey="score" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground))" fillOpacity={0.15} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Insights */}
        {insights && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" />Your Performance Insights</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {insights.summary && <p className="text-sm">{insights.summary}</p>}
              {insights.strengths && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Strengths</h4>
                  <p className="text-sm">{insights.strengths}</p>
                </div>
              )}
              {insights.improvements && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Areas to Improve</h4>
                  <p className="text-sm">{insights.improvements}</p>
                </div>
              )}
              {insights.prediction && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What to Expect</h4>
                  <p className="text-sm">{insights.prediction}</p>
                </div>
              )}
              {insights.keyFactors && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Factors</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {insights.keyFactors.map((f: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{f.factor}: {f.impact}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recommendations from teachers */}
        {recommendations && recommendations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Teacher Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map(rec => (
                <div key={rec.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{rec.intervention_type}</Badge>
                  </div>
                  <p className="text-sm">{rec.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow">
            <Link to="/student/goals">
              <CardContent className="p-5 flex items-center gap-3">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Goal Tracker</p>
                  <p className="text-xs text-muted-foreground">Set goals and track your progress</p>
                </div>
              </CardContent>
            </Link>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <Link to="/student/plan">
              <CardContent className="p-5 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Weekly Plan</p>
                  <p className="text-xs text-muted-foreground">Your personalized improvement plan</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* No data state */}
        {!isLoading && (!performanceData || performanceData.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No performance data yet. Your teacher will upload your scores.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
