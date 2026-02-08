import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Brain, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function StudentAnalytics() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', studentId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['student-performance', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_performance')
        .select('*')
        .eq('student_id', studentId!)
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !!user?.id,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['student-recommendations', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_recommendations')
        .select('*')
        .eq('student_id', studentId!)
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentId && !!user?.id,
  });

  const runAnalysis = async () => {
    if (!performanceData || performanceData.length === 0) {
      toast.error('No performance data to analyze');
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-performance', {
        body: { studentId, performanceData, mode: 'teacher' },
      });
      if (error) throw error;
      setAnalysis(data);
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const approveRecommendation = async (recId: string) => {
    const { error } = await supabase
      .from('teacher_recommendations')
      .update({ status: 'approved' })
      .eq('id', recId);
    if (error) toast.error('Failed to approve');
    else {
      toast.success('Recommendation approved');
      queryClient.invalidateQueries({ queryKey: ['student-recommendations'] });
    }
  };

  const rejectRecommendation = async (recId: string) => {
    const { error } = await supabase
      .from('teacher_recommendations')
      .update({ status: 'rejected' })
      .eq('id', recId);
    if (error) toast.error('Failed to reject');
    else {
      toast.success('Recommendation rejected');
      queryClient.invalidateQueries({ queryKey: ['student-recommendations'] });
    }
  };

  // Build rich chart data from all available metrics
  const subjectData = performanceData?.reduce((acc, p) => {
    if (!acc[p.subject]) acc[p.subject] = { scores: [], attendance: [], midExam: [], semester: [], assignment: [], lab: [] };
    if (p.marks != null) acc[p.subject].scores.push((Number(p.marks) / Number(p.max_marks)) * 100);
    if (p.attendance_percentage != null) acc[p.subject].attendance.push(Number(p.attendance_percentage));
    if ((p as any).mid_exam_score != null) acc[p.subject].midExam.push((Number((p as any).mid_exam_score) / Number((p as any).mid_exam_total || 100)) * 100);
    if ((p as any).semester_score != null) acc[p.subject].semester.push((Number((p as any).semester_score) / Number((p as any).semester_total || 100)) * 100);
    if ((p as any).assignment_score != null) acc[p.subject].assignment.push((Number((p as any).assignment_score) / Number((p as any).assignment_total || 100)) * 100);
    if ((p as any).lab_score != null) acc[p.subject].lab.push((Number((p as any).lab_score) / Number((p as any).lab_total || 100)) * 100);
    return acc;
  }, {} as Record<string, { scores: number[]; attendance: number[]; midExam: number[]; semester: number[]; assignment: number[]; lab: number[] }>) || {};

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const subjectChartData = Object.entries(subjectData).map(([subject, d]) => ({
    subject,
    overall: avg(d.scores),
    attendance: avg(d.attendance),
    midExam: avg(d.midExam),
    semester: avg(d.semester),
    assignment: avg(d.assignment),
    lab: avg(d.lab),
  }));

  const chartData = performanceData?.map(p => ({
    label: `${p.subject} (${p.assessment_type})`,
    score: p.marks != null ? Math.round((Number(p.marks) / Number(p.max_marks)) * 100) : null,
    attendance: Number(p.attendance_percentage),
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{studentProfile?.full_name || 'Student'}</h1>
            <p className="text-muted-foreground text-sm">{studentProfile?.email}</p>
          </div>
          <Button onClick={runAnalysis} disabled={analyzing || isLoading}>
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            AI Analysis
          </Button>
        </div>

        {/* Charts */}
        {!isLoading && chartData.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Subject-wise Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={subjectChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="midExam" fill="hsl(var(--foreground))" radius={[2, 2, 0, 0]} name="Mid Exam %" />
                    <Bar dataKey="semester" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} name="Semester %" />
                    <Bar dataKey="assignment" fill="hsl(var(--ring))" radius={[2, 2, 0, 0]} name="Assignment %" opacity={0.6} />
                    <Bar dataKey="attendance" fill="hsl(var(--border))" radius={[2, 2, 0, 0]} name="Attendance %" opacity={0.4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Score Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="attendance" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Analysis */}
        {analysis && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" />AI Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {analysis.descriptive && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What Happened</h4>
                  <p className="text-sm">{analysis.descriptive}</p>
                </div>
              )}
              {analysis.diagnostic && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Why It Happened</h4>
                  <p className="text-sm">{analysis.diagnostic}</p>
                </div>
              )}
              {analysis.predictive && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What's Likely to Happen</h4>
                  <p className="text-sm">{analysis.predictive}</p>
                </div>
              )}
              {analysis.prescriptive && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Recommended Actions</h4>
                  <p className="text-sm">{analysis.prescriptive}</p>
                </div>
              )}
              {analysis.keyFactors && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Influencing Factors</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {analysis.keyFactors.map((f: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{f.factor}: {f.impact}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Recommendations</CardTitle></CardHeader>
          <CardContent>
            {recommendations && recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="flex items-start justify-between gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{rec.intervention_type}</Badge>
                        <Badge
                          variant={rec.status === 'approved' ? 'default' : rec.status === 'rejected' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {rec.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{rec.recommendation}</p>
                      {rec.ai_reasoning && <p className="text-xs text-muted-foreground mt-1">{rec.ai_reasoning}</p>}
                    </div>
                    {rec.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => approveRecommendation(rec.id)}>
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => rejectRecommendation(rec.id)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recommendations yet. Run AI Analysis to generate.</p>
            )}
          </CardContent>
        </Card>

        {/* Raw Data */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Performance Records</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : performanceData && performanceData.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Subject</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Score</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">Attendance</th>
                      <th className="pb-2 text-xs font-medium text-muted-foreground">Term</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {performanceData.map(p => (
                      <tr key={p.id}>
                        <td className="py-2 pr-4">{p.subject}</td>
                        <td className="py-2 pr-4 capitalize">{p.assessment_type}</td>
                        <td className="py-2 pr-4">{String(p.marks)}/{String(p.max_marks)}</td>
                        <td className="py-2 pr-4">{String(p.attendance_percentage)}%</td>
                        <td className="py-2">{p.term}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No records</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
