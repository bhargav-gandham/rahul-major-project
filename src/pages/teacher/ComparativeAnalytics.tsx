import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Award, Users, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ComparativeAnalytics() {
  const { user } = useAuth();

  const { data: allPerformance, isLoading } = useQuery({
    queryKey: ['all-performance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_performance')
        .select('*')
        .eq('teacher_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const analytics = useMemo(() => {
    if (!allPerformance || allPerformance.length === 0) return null;

    // Group by student
    const byStudent: Record<string, { name: string; id: string; subjects: Record<string, number[]>; attendance: number[] }> = {};
    allPerformance.forEach(p => {
      const key = p.student_id;
      if (!byStudent[key]) {
        byStudent[key] = { name: p.student_name || 'Unknown', id: key, subjects: {}, attendance: [] };
      }
      const pct = p.marks != null ? (Number(p.marks) / Number(p.max_marks)) * 100 : null;
      if (pct !== null) {
        if (!byStudent[key].subjects[p.subject]) byStudent[key].subjects[p.subject] = [];
        byStudent[key].subjects[p.subject].push(pct);
      }
      if (p.attendance_percentage != null) byStudent[key].attendance.push(Number(p.attendance_percentage));
    });

    // Student averages
    const studentStats = Object.entries(byStudent).map(([id, s]) => {
      const allScores = Object.values(s.subjects).flat();
      const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
      const avgAttendance = s.attendance.length > 0 ? s.attendance.reduce((a, b) => a + b, 0) / s.attendance.length : 0;
      return { id, name: s.name, avg: Math.round(avg), attendance: Math.round(avgAttendance), subjectCount: Object.keys(s.subjects).length };
    });

    // Subject averages
    const bySubject: Record<string, number[]> = {};
    allPerformance.forEach(p => {
      if (p.marks != null) {
        const pct = (Number(p.marks) / Number(p.max_marks)) * 100;
        if (!bySubject[p.subject]) bySubject[p.subject] = [];
        bySubject[p.subject].push(pct);
      }
    });
    const subjectAverages = Object.entries(bySubject).map(([subject, scores]) => ({
      subject,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      students: scores.length,
    })).sort((a, b) => b.average - a.average);

    // Top performers & at-risk
    const sorted = [...studentStats].sort((a, b) => b.avg - a.avg);
    const topPerformers = sorted.slice(0, 5);
    const atRisk = sorted.filter(s => s.avg < 50 || s.attendance < 60).sort((a, b) => a.avg - b.avg);

    // Class average
    const classAvg = studentStats.length > 0
      ? Math.round(studentStats.reduce((s, st) => s + st.avg, 0) / studentStats.length)
      : 0;
    const classAttendance = studentStats.length > 0
      ? Math.round(studentStats.reduce((s, st) => s + st.attendance, 0) / studentStats.length)
      : 0;

    return { studentStats, subjectAverages, topPerformers, atRisk, classAvg, classAttendance, totalStudents: studentStats.length };
  }, [allPerformance]);

  const getBarColor = (avg: number) => {
    if (avg >= 75) return 'hsl(var(--chart-2))';
    if (avg >= 50) return 'hsl(var(--chart-4))';
    return 'hsl(var(--chart-5))';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Comparative Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Compare class performance, identify trends and at-risk students</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5 h-20 animate-pulse bg-muted rounded" /></Card>)}
          </div>
        ) : !analytics ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No performance data yet. Upload student data to see analytics.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold mt-1">{analytics.totalStudents}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Class Average</p>
                  <p className="text-3xl font-bold mt-1">{analytics.classAvg}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Avg Attendance</p>
                  <p className="text-3xl font-bold mt-1">{analytics.classAttendance}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> At Risk</p>
                  <p className="text-3xl font-bold mt-1 text-destructive">{analytics.atRisk.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Subject Averages Chart */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Subject-wise Class Average</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.subjectAverages}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Average']}
                      contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="average" radius={[4, 4, 0, 0]} name="Class Average %">
                      {analytics.subjectAverages.map((entry, idx) => (
                        <Cell key={idx} fill={getBarColor(entry.average)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="h-4 w-4" /> Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.topPerformers.map((s, i) => (
                    <Link key={s.id} to={`/teacher/student/${s.id}`} className="block">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.subjectCount} subjects · {s.attendance}% attendance</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-bold text-sm">{s.avg}%</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {analytics.topPerformers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* At-Risk Students */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Needs Urgent Intervention
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.atRisk.map(s => (
                    <Link key={s.id} to={`/teacher/student/${s.id}`} className="block">
                      <div className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <div className="flex gap-2 mt-1">
                            {s.avg < 50 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Score: {s.avg}%</Badge>}
                            {s.attendance < 60 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/50 text-destructive">Attendance: {s.attendance}%</Badge>}
                          </div>
                        </div>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      </div>
                    </Link>
                  ))}
                  {analytics.atRisk.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">🎉 No at-risk students!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Full Student Rankings */}
            <Card>
              <CardHeader><CardTitle className="text-sm">All Student Rankings</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Rank</th>
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Student</th>
                        <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Average</th>
                        <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Attendance</th>
                        <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...analytics.studentStats].sort((a, b) => b.avg - a.avg).map((s, i) => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-medium text-muted-foreground">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <Link to={`/teacher/student/${s.id}`} className="hover:underline font-medium">{s.name}</Link>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">{s.avg}%</td>
                          <td className="py-2.5 px-3 text-center font-mono">{s.attendance}%</td>
                          <td className="py-2.5 px-3 text-center">
                            {s.avg >= 75 ? (
                              <Badge className="text-[10px] bg-green-100 text-green-700 border-0">Excellent</Badge>
                            ) : s.avg >= 50 ? (
                              <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border-0">Average</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">At Risk</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
