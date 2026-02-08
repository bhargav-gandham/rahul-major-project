import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Brain, Loader2, Lightbulb, Target, BookOpen, Clock, TrendingUp,
  CheckCircle2, Sparkles, GraduationCap, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

type SubjectAnalysis = {
  subject: string;
  current_score: number;
  status: string;
  strongest_area: string;
  weakest_area: string;
  specific_recommendation: string;
};

type PriorityAction = {
  priority: number;
  action: string;
  reason: string;
  expected_improvement: string;
  timeframe: string;
  category: string;
};

type RecommendationResult = {
  overall_assessment: {
    summary: string;
    current_level: string;
    overall_score_estimate: number;
    trend: string;
  };
  subject_analysis: SubjectAnalysis[];
  priority_actions: PriorityAction[];
  study_strategy: {
    daily_plan: string;
    weekly_focus: string;
    exam_prep_tips: string[];
    resources_suggestion: string;
  };
  motivational_note: string;
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'hsl(var(--chart-2))' },
  good: { label: 'Good', color: 'hsl(var(--chart-1))' },
  average: { label: 'Average', color: 'hsl(var(--chart-4))' },
  needs_improvement: { label: 'Needs Improvement', color: 'hsl(var(--chart-3))' },
  critical: { label: 'Critical', color: 'hsl(var(--chart-5))' },
};

const STATUS_STYLES: Record<string, string> = {
  strong: 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800',
  moderate: 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800',
  weak: 'border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800',
  critical: 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  attendance: Clock,
  study_habits: BookOpen,
  exam_preparation: GraduationCap,
  assignments: CheckCircle2,
  lab_work: Zap,
  time_management: Clock,
  revision: BookOpen,
};

export function PersonalizedRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: performanceData, isLoading: dataLoading } = useQuery({
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

  const { data: goals } = useQuery({
    queryKey: ['my-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_goals')
        .select('*')
        .eq('student_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const fetchRecommendations = async () => {
    if (!performanceData || performanceData.length === 0) {
      toast.error('No performance data available');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('student-recommendations', {
        body: { performanceData, goals: goals || [] },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setRecommendations(data);
      toast.success('Recommendations generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const trendLabel = (t: string) => t === 'improving' ? '📈 Improving' : t === 'declining' ? '📉 Declining' : '➡️ Stable';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Personalized Recommendations
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI-powered guidance tailored to your performance data
            </p>
          </div>
          <Button onClick={fetchRecommendations} disabled={loading || dataLoading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            {recommendations ? 'Refresh' : 'Get Recommendations'}
          </Button>
        </div>

        {!recommendations && !loading && (
          <Card>
            <CardContent className="py-16 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your Personalized Improvement Plan</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Get AI-analyzed recommendations based on your scores, attendance, assignments, and goals.
                Receive specific actions prioritized by impact.
              </p>
              <Button onClick={fetchRecommendations} disabled={dataLoading}>
                <Brain className="h-4 w-4 mr-2" /> Get Recommendations
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}><CardContent className="p-5 h-24 animate-pulse bg-muted rounded" /></Card>
            ))}
          </div>
        )}

        {recommendations && (
          <>
            {/* Overall Assessment */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Overall Assessment</h3>
                    </div>
                    <p className="text-sm">{recommendations.overall_assessment.summary}</p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <Badge variant="outline" style={{
                        borderColor: LEVEL_CONFIG[recommendations.overall_assessment.current_level]?.color,
                        color: LEVEL_CONFIG[recommendations.overall_assessment.current_level]?.color,
                      }}>
                        {LEVEL_CONFIG[recommendations.overall_assessment.current_level]?.label || recommendations.overall_assessment.current_level}
                      </Badge>
                      <span className="text-sm">{trendLabel(recommendations.overall_assessment.trend)}</span>
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="35" fill="none"
                          stroke={LEVEL_CONFIG[recommendations.overall_assessment.current_level]?.color || 'hsl(var(--primary))'}
                          strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${(recommendations.overall_assessment.overall_score_estimate / 100) * 220} 220`}
                        />
                      </svg>
                      <span className="absolute text-lg font-bold">{recommendations.overall_assessment.overall_score_estimate}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Analysis */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Subject-wise Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {recommendations.subject_analysis.map((subj, i) => (
                  <div key={i} className={`border rounded-lg p-4 ${STATUS_STYLES[subj.status] || ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{subj.subject}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold">{subj.current_score}%</span>
                        <Progress value={subj.current_score} className="w-20 h-2" />
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Strongest: </span>
                        <span className="font-medium">{subj.strongest_area}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Needs work: </span>
                        <span className="font-medium">{subj.weakest_area}</span>
                      </div>
                    </div>
                    <p className="text-xs mt-2 flex gap-1.5 items-start">
                      <Lightbulb className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                      {subj.specific_recommendation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Priority Actions */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" /> Priority Actions (by Impact)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {recommendations.priority_actions
                  .sort((a, b) => a.priority - b.priority)
                  .map((action, i) => {
                    const Icon = CATEGORY_ICONS[action.category] || Lightbulb;
                    return (
                      <div key={i} className="flex gap-3 p-3 border rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
                          <span className="text-sm font-bold">{action.priority}</span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{action.action}</p>
                            <Badge variant="outline" className="text-[10px]">
                              <Icon className="h-3 w-3 mr-1" />{action.category.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{action.reason}</p>
                          <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-green-600" /> {action.expected_improvement}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {action.timeframe}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>

            {/* Study Strategy */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Study Strategy</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Daily Routine</h4>
                    <p className="text-sm">{recommendations.study_strategy.daily_plan}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Weekly Focus</h4>
                    <p className="text-sm">{recommendations.study_strategy.weekly_focus}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Resources</h4>
                    <p className="text-sm">{recommendations.study_strategy.resources_suggestion}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Exam Preparation Tips</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recommendations.study_strategy.exam_prep_tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Motivational Note */}
            <Card className="border-primary/20">
              <CardContent className="p-6 text-center">
                <Sparkles className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-sm italic">{recommendations.motivational_note}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
