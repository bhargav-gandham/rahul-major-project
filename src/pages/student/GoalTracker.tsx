import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Target, Plus, Trash2, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function GoalTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ subject: '', targetScore: '', targetDate: '' });
  const [saving, setSaving] = useState(false);

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['my-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_goals')
        .select('*')
        .eq('student_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: performanceData } = useQuery({
    queryKey: ['my-performance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_performance')
        .select('*')
        .eq('student_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Compute current averages per subject
  const currentScores: Record<string, number> = {};
  performanceData?.forEach(p => {
    if (!currentScores[p.subject]) currentScores[p.subject] = 0;
    const scores = performanceData.filter(pp => pp.subject === p.subject);
    currentScores[p.subject] = Math.round(
      scores.reduce((s, pp) => s + (Number(pp.marks) / Number(pp.max_marks)) * 100, 0) / scores.length
    );
  });

  // Chart data: goal vs reality
  const comparisonData = goals?.map(g => ({
    subject: g.subject,
    target: Number(g.target_score),
    current: currentScores[g.subject] || 0,
    gap: Math.max(0, Number(g.target_score) - (currentScores[g.subject] || 0)),
  })) || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('student_goals').insert({
        student_id: user!.id,
        subject: form.subject,
        target_score: parseFloat(form.targetScore),
        target_date: form.targetDate || null,
      });
      if (error) throw error;
      toast.success('Goal added');
      setForm({ subject: '', targetScore: '', targetDate: '' });
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: ['my-goals'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to add goal');
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from('student_goals').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Goal removed');
      queryClient.invalidateQueries({ queryKey: ['my-goals'] });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goal Tracker</h1>
            <p className="text-muted-foreground text-sm mt-1">Set targets and compare with your actual performance</p>
          </div>
          <Button onClick={() => setAdding(!adding)} variant={adding ? 'secondary' : 'default'}>
            <Plus className="h-4 w-4 mr-2" />
            {adding ? 'Cancel' : 'New Goal'}
          </Button>
        </div>

        {/* Add Goal Form */}
        {adding && (
          <Card>
            <CardContent className="p-5">
              <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5 flex-1 min-w-[150px]">
                  <Label className="text-xs">Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required placeholder="e.g. Mathematics" />
                </div>
                <div className="space-y-1.5 w-28">
                  <Label className="text-xs">Target %</Label>
                  <Input type="number" value={form.targetScore} onChange={e => setForm(f => ({ ...f, targetScore: e.target.value }))} required min="0" max="100" />
                </div>
                <div className="space-y-1.5 w-40">
                  <Label className="text-xs">Target Date</Label>
                  <Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
                </div>
                <Button type="submit" disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Goal vs Reality Chart */}
        {comparisonData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Goal vs Reality</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="current" fill="hsl(var(--foreground))" name="Current %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" fill="hsl(var(--muted-foreground))" name="Target %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Goals List */}
        <div className="space-y-3">
          {goalsLoading ? (
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Loading...</p></CardContent></Card>
          ) : goals && goals.length > 0 ? (
            goals.map(goal => {
              const current = currentScores[goal.subject] || 0;
              const target = Number(goal.target_score);
              const progress = Math.min(100, Math.round((current / target) * 100));
              const gap = Math.max(0, target - current);

              return (
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">{goal.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {current}% current → {target}% target
                          {gap > 0 && ` (${gap}% to go)`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteGoal(goal.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {gap > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Focus on consistent practice and attendance to bridge the {gap}% gap
                      </p>
                    )}
                    {gap === 0 && <p className="text-xs mt-2">✅ You've reached your target!</p>}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No goals set yet. Add your first goal above.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
