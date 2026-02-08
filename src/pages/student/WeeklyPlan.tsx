import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, Brain, Loader2, Flame, CheckCircle2 } from 'lucide-react';

const DAY_KEYS = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'] as const;
const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
const DAY_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];

// Also map weekday names to our day keys
const WEEKDAY_MAP: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
  day1: 0, day2: 1, day3: 2, day4: 3, day5: 4, day6: 5, day7: 6,
};

function parsePlanContent(content: string): { text: string[]; dailySchedule: Record<string, string> | null } {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const text = Array.isArray(parsed.text) ? parsed.text : (parsed.text ? [parsed.text] : []);
      return { text, dailySchedule: parsed.dailySchedule || null };
    }
    if (Array.isArray(parsed)) return { text: parsed, dailySchedule: null };
    return { text: [String(parsed)], dailySchedule: null };
  } catch {
    return { text: [content], dailySchedule: null };
  }
}

function normalizeDailySchedule(schedule: Record<string, string>): { key: string; index: number; task: string }[] {
  return Object.entries(schedule)
    .map(([key, task]) => {
      const idx = WEEKDAY_MAP[key.toLowerCase()];
      return idx !== undefined ? { key: DAY_KEYS[idx], index: idx, task: task as string } : null;
    })
    .filter(Boolean) as { key: string; index: number; task: string }[];
}

function calculateStreak(completedDays: string[]): number {
  if (!completedDays.length) return 0;
  const indices = completedDays.map(d => WEEKDAY_MAP[d] ?? -1).filter(i => i >= 0).sort((a, b) => a - b);
  let streak = 0;
  for (let i = 0; i < indices.length; i++) {
    if (i === 0 || indices[i] === indices[i - 1] + 1) {
      streak++;
    } else {
      break; // streak broken
    }
  }
  return streak;
}

export function WeeklyPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['my-plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('student_id', user!.id)
        .order('week_start', { ascending: false });
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

  const generatePlan = async () => {
    if (!performanceData || performanceData.length === 0) {
      toast.error('No performance data available to generate a plan');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-performance', {
        body: { studentId: user?.id, performanceData, mode: 'weekly-plan' },
      });
      if (error) throw error;

      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
      const planContent = data.planContent || data.plan || 'No plan generated';
      const dailySchedule = data.dailySchedule || null;
      const focusAreas = data.focusAreas || [];

      const { error: insertErr } = await supabase.from('weekly_plans').insert({
        student_id: user!.id,
        week_start: weekStart.toISOString().split('T')[0],
        plan_content: JSON.stringify({ text: planContent, dailySchedule }),
        focus_areas: focusAreas,
        status: 'active',
        completed_days: [],
      });
      if (insertErr) throw insertErr;
      toast.success('Weekly plan generated!');
      queryClient.invalidateQueries({ queryKey: ['my-plans'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const toggleDayComplete = async (planId: string, dayKey: string, currentCompleted: string[]) => {
    const updated = currentCompleted.includes(dayKey)
      ? currentCompleted.filter(d => d !== dayKey)
      : [...currentCompleted, dayKey];

    const { error } = await supabase
      .from('weekly_plans')
      .update({ completed_days: updated })
      .eq('id', planId);

    if (error) {
      toast.error('Failed to update');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['my-plans'] });

    if (!currentCompleted.includes(dayKey)) {
      const streak = calculateStreak(updated);
      if (streak > 1) {
        toast.success(`🔥 ${streak}-day streak! Keep going!`);
      } else {
        toast.success('Day completed!');
      }
    }
  };

  const currentPlan = plans?.[0];
  const pastPlans = plans?.slice(1) || [];
  const currentParsed = currentPlan ? parsePlanContent(currentPlan.plan_content) : null;
  const completedDays: string[] = (currentPlan?.completed_days as string[]) || [];
  const streak = calculateStreak(completedDays);
  const dailyItems = currentParsed?.dailySchedule ? normalizeDailySchedule(currentParsed.dailySchedule) : null;
  const totalDays = dailyItems?.length || 7;
  const progressPct = (completedDays.length / totalDays) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Weekly Plan</h1>
            <p className="text-muted-foreground text-sm mt-1">AI-generated personalized improvement plan</p>
          </div>
          <Button onClick={generatePlan} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            Generate New Plan
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-48" />
        ) : currentPlan ? (
          <div className="space-y-4">
            {/* Streak & Progress */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/50 border">
                <Flame className={`h-5 w-5 ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <span className="font-bold text-lg">{streak}</span>
                <span className="text-sm text-muted-foreground">day streak</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/50 border">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {completedDays.length}/{totalDays} days done
                </span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Progress value={progressPct} className="h-2" />
              </div>
            </div>

            {/* Current Plan Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Week of {new Date(currentPlan.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Day-wise grid */}
                {dailyItems && dailyItems.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {dailyItems.map(({ key, index, task }) => {
                      const done = completedDays.includes(key);
                      return (
                        <div
                          key={key}
                          className={`p-4 border rounded-lg space-y-2 transition-colors ${
                            done ? 'bg-primary/5 border-primary/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{DAY_EMOJIS[index]}</span>
                              <h4 className="font-semibold text-sm">{DAY_LABELS[index]}</h4>
                            </div>
                            <Checkbox
                              checked={done}
                              onCheckedChange={() => toggleDayComplete(currentPlan.id, key, completedDays)}
                            />
                          </div>
                          <p className={`text-sm leading-relaxed ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {task}
                          </p>
                          {done && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Completed
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Fallback: non-daily format — show as numbered days */
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {currentParsed?.text.map((item, i) => {
                      const key = DAY_KEYS[i] || `day${i + 1}`;
                      const done = completedDays.includes(key);
                      return (
                        <div
                          key={i}
                          className={`p-4 border rounded-lg space-y-2 transition-colors ${
                            done ? 'bg-primary/5 border-primary/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{DAY_EMOJIS[i] || '📌'}</span>
                              <h4 className="font-semibold text-sm">{DAY_LABELS[i] || `Day ${i + 1}`}</h4>
                            </div>
                            <Checkbox
                              checked={done}
                              onCheckedChange={() => toggleDayComplete(currentPlan.id, key, completedDays)}
                            />
                          </div>
                          <p className={`text-sm leading-relaxed ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {item}
                          </p>
                          {done && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Completed
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Focus Areas */}
                {currentPlan.focus_areas && Array.isArray(currentPlan.focus_areas) && (currentPlan.focus_areas as string[]).length > 0 && (
                  <div className="pt-3 border-t">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {(currentPlan.focus_areas as string[]).map((area: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-muted rounded-md text-xs">{area}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No weekly plan yet. Generate one based on your performance data.</p>
              <Button onClick={generatePlan} disabled={generating || !performanceData?.length}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                Generate Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Past Plans */}
        {pastPlans.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Previous Plans</h2>
            {pastPlans.map(plan => {
              const pastCompleted = (plan.completed_days as string[]) || [];
              const pastStreak = calculateStreak(pastCompleted);
              return (
                <Card key={plan.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        Week of {new Date(plan.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className={`h-3 w-3 ${pastStreak > 0 ? 'text-orange-500' : ''}`} />
                        {pastStreak}-day streak • {pastCompleted.length}/7 done
                      </div>
                    </div>
                    <p className="text-sm line-clamp-2">{parsePlanContent(plan.plan_content).text.join(', ')}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
