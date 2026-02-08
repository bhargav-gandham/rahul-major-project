import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, Brain, Loader2, RefreshCw } from 'lucide-react';

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

      // Save the plan
      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));

      // Store dailySchedule in focus_areas as JSON alongside actual focus areas
      const planContent = data.planContent || data.plan || 'No plan generated';
      const dailySchedule = data.dailySchedule || null;
      const focusAreas = data.focusAreas || [];

      const { error: insertErr } = await supabase.from('weekly_plans').insert({
        student_id: user!.id,
        week_start: weekStart.toISOString().split('T')[0],
        plan_content: JSON.stringify({ text: planContent, dailySchedule }),
        focus_areas: focusAreas,
        status: 'active',
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

  const parsePlanContent = (content: string): { text: string[]; dailySchedule: Record<string, string> | null } => {
    try {
      const parsed = JSON.parse(content);
      // Handle {text, dailySchedule} object format
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const text = Array.isArray(parsed.text) ? parsed.text : (parsed.text ? [parsed.text] : []);
        return { text, dailySchedule: parsed.dailySchedule || null };
      }
      // Handle plain array format (old data)
      if (Array.isArray(parsed)) {
        return { text: parsed, dailySchedule: null };
      }
      return { text: [String(parsed)], dailySchedule: null };
    } catch {
      return { text: [content], dailySchedule: null };
    }
  };

  const dayLabels: Record<string, string> = {
    day1: 'Day 1', day2: 'Day 2', day3: 'Day 3', day4: 'Day 4',
    day5: 'Day 5', day6: 'Day 6', day7: 'Day 7',
    monday: 'Day 1', tuesday: 'Day 2', wednesday: 'Day 3',
    thursday: 'Day 4', friday: 'Day 5', saturday: 'Day 6', sunday: 'Day 7',
  };

  const dayIcons: Record<string, string> = {
    day1: '1️⃣', day2: '2️⃣', day3: '3️⃣', day4: '4️⃣', day5: '5️⃣', day6: '6️⃣', day7: '7️⃣',
    monday: '1️⃣', tuesday: '2️⃣', wednesday: '3️⃣', thursday: '4️⃣', friday: '5️⃣', saturday: '6️⃣', sunday: '7️⃣',
  };

  const currentPlan = plans?.[0];
  const pastPlans = plans?.slice(1) || [];
  const currentParsed = currentPlan ? parsePlanContent(currentPlan.plan_content) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Week of {new Date(currentPlan.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Day-wise schedule */}
              {currentParsed?.dailySchedule ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(currentParsed.dailySchedule).map(([day, plan]) => (
                    <div key={day} className="p-4 border rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <span>{dayIcons[day] || '📌'}</span>
                        <h4 className="font-semibold text-sm">{dayLabels[day] || day}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{plan as string}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {currentParsed?.text.map((item, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <p className="leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Overall summary bullets */}
              {currentParsed?.dailySchedule && currentParsed.text.length > 0 && (
                <div className="pt-3 border-t">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Key Action Items</h4>
                  <div className="space-y-1.5">
                    {currentParsed.text.map((item, i) => (
                      <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5">•</span>
                        <p className="leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentPlan.focus_areas && Array.isArray(currentPlan.focus_areas) && (currentPlan.focus_areas as string[]).length > 0 && (
                <div>
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
            {pastPlans.map(plan => (
              <Card key={plan.id}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Week of {new Date(plan.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-sm line-clamp-3">{parsePlanContent(plan.plan_content).text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
