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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Brain, Loader2, AlertTriangle, ShieldAlert, ShieldCheck, TrendingUp,
  TrendingDown, Minus, ChevronDown, ChevronUp, Zap, Eye, Clock, Lightbulb, UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type RiskFactor = { factor: string; severity: string; detail: string };
type Action = { action: string; urgency: string; expected_impact: string };

type StudentPrediction = {
  student_id: string;
  student_name: string;
  risk_tier: string;
  dropout_probability: number;
  risk_trend: string;
  risk_factors: RiskFactor[];
  protective_factors: string[];
  recommended_actions: Action[];
  early_warning_signals: string[];
};

type DropoutResult = {
  class_summary: {
    total_students: number;
    critical_count: number;
    high_count: number;
    moderate_count: number;
    low_count: number;
    minimal_count: number;
    overall_dropout_risk_percent: number;
    primary_risk_pattern: string;
  };
  student_predictions: StudentPrediction[];
};

const TIER_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  critical: { color: 'hsl(var(--chart-5))', bg: 'bg-red-50 dark:bg-red-950/20', label: 'Critical', icon: ShieldAlert },
  high: { color: 'hsl(var(--chart-3))', bg: 'bg-orange-50 dark:bg-orange-950/20', label: 'High', icon: AlertTriangle },
  moderate: { color: 'hsl(var(--chart-4))', bg: 'bg-yellow-50 dark:bg-yellow-950/20', label: 'Moderate', icon: Eye },
  low: { color: 'hsl(var(--chart-1))', bg: 'bg-blue-50 dark:bg-blue-950/20', label: 'Low', icon: ShieldCheck },
  minimal: { color: 'hsl(var(--chart-2))', bg: 'bg-green-50 dark:bg-green-950/20', label: 'Minimal', icon: ShieldCheck },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  minor: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
};

const URGENCY_STYLES: Record<string, { label: string; className: string }> = {
  immediate: { label: 'Immediate', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  this_week: { label: 'This Week', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  this_month: { label: 'This Month', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'increasing') return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
  if (trend === 'decreasing') return <TrendingDown className="h-3.5 w-3.5 text-green-600" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

export function DropoutPrediction() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<DropoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const { data: allPerformance, isLoading: dataLoading } = useQuery({
    queryKey: ['all-performance-dropout', user?.id],
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

  const runPredictions = async () => {
    if (!allPerformance || allPerformance.length === 0) {
      toast.error('No performance data available');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dropout-prediction', {
        body: { performanceData: allPerformance },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setPredictions(data);
      toast.success('Dropout predictions generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate predictions');
    } finally {
      setLoading(false);
    }
  };

  const tierOrder = ['critical', 'high', 'moderate', 'low', 'minimal'];
  const sortedStudents = predictions?.student_predictions
    .sort((a, b) => tierOrder.indexOf(a.risk_tier) - tierOrder.indexOf(b.risk_tier)) || [];

  const distributionData = predictions ? [
    { tier: 'Critical', count: predictions.class_summary.critical_count, fill: TIER_CONFIG.critical.color },
    { tier: 'High', count: predictions.class_summary.high_count, fill: TIER_CONFIG.high.color },
    { tier: 'Moderate', count: predictions.class_summary.moderate_count, fill: TIER_CONFIG.moderate.color },
    { tier: 'Low', count: predictions.class_summary.low_count, fill: TIER_CONFIG.low.color },
    { tier: 'Minimal', count: predictions.class_summary.minimal_count, fill: TIER_CONFIG.minimal.color },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserX className="h-5 w-5" /> Dropout Prediction System
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI-powered early detection of students at risk of dropping out
            </p>
          </div>
          <Button onClick={runPredictions} disabled={loading || dataLoading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            {predictions ? 'Refresh Analysis' : 'Analyze Dropout Risk'}
          </Button>
        </div>

        {!predictions && !loading && (
          <Card>
            <CardContent className="py-16 text-center">
              <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Dropout Risk Analysis</h3>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
                Uses AI to analyze attendance patterns, score trajectories, assignment engagement, and multi-subject performance
                to predict which students are at risk of dropping out — with specific evidence and intervention recommendations.
              </p>
              <Button onClick={runPredictions} disabled={dataLoading}>
                <Brain className="h-4 w-4 mr-2" /> Analyze Dropout Risk
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="p-5 h-24 animate-pulse bg-muted rounded" /></Card>
            ))}
          </div>
        )}

        {predictions && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Overall Dropout Risk</p>
                  <p className="text-3xl font-bold mt-1 text-destructive">{predictions.class_summary.overall_dropout_risk_percent}%</p>
                  <p className="text-[10px] text-muted-foreground mt-1">of class at serious risk</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Critical + High Risk</p>
                  <p className="text-3xl font-bold mt-1">{predictions.class_summary.critical_count + predictions.class_summary.high_count}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">students need urgent attention</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold mt-1">{predictions.class_summary.total_students}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">Primary Risk Pattern</p>
                  <p className="text-sm font-medium mt-1">{predictions.class_summary.primary_risk_pattern}</p>
                </CardContent>
              </Card>
            </div>

            {/* Distribution Chart */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Risk Tier Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Students">
                      {distributionData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Student Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Per-Student Dropout Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedStudents.map(student => {
                  const isExpanded = expandedStudent === student.student_id;
                  const tier = TIER_CONFIG[student.risk_tier] || TIER_CONFIG.minimal;

                  return (
                    <div key={student.student_id} className={`border rounded-lg overflow-hidden ${tier.bg}`}>
                      <button
                        className="w-full flex items-center justify-between p-4 text-left hover:opacity-90 transition-opacity"
                        onClick={() => setExpandedStudent(isExpanded ? null : student.student_id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            <tier.icon className="h-5 w-5" style={{ color: tier.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{student.student_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{student.dropout_probability}% probability</span>
                              <TrendIcon trend={student.risk_trend} />
                              <span className="text-[10px] text-muted-foreground capitalize">{student.risk_trend}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-24 hidden sm:block">
                            <Progress value={student.dropout_probability} className="h-2" />
                          </div>
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: tier.color, color: tier.color }}>
                            {tier.label}
                          </Badge>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t p-4 space-y-4 bg-background/50">
                          {/* Risk Factors */}
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Risk Factors
                            </h4>
                            <div className="space-y-2">
                              {student.risk_factors.map((rf, i) => (
                                <div key={i} className={`flex items-start gap-2 p-2 rounded border text-xs ${SEVERITY_STYLES[rf.severity] || ''}`}>
                                  <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">{rf.severity}</Badge>
                                  <div>
                                    <span className="font-medium">{rf.factor}:</span> {rf.detail}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Protective Factors */}
                          {student.protective_factors.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 text-green-600" /> Protective Factors
                              </h4>
                              <ul className="text-xs space-y-1">
                                {student.protective_factors.map((pf, i) => (
                                  <li key={i} className="flex gap-1.5"><ShieldCheck className="h-3 w-3 text-green-600 shrink-0 mt-0.5" /> {pf}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="grid gap-4 sm:grid-cols-2">
                            {/* Recommended Actions */}
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                <Zap className="h-3 w-3 text-primary" /> Recommended Actions
                              </h4>
                              <div className="space-y-2">
                                {student.recommended_actions.map((a, i) => {
                                  const urgency = URGENCY_STYLES[a.urgency] || URGENCY_STYLES.this_month;
                                  return (
                                    <div key={i} className="text-xs border rounded p-2 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`text-[9px] ${urgency.className}`}>{urgency.label}</Badge>
                                        <span className="font-medium">{a.action}</span>
                                      </div>
                                      <p className="text-muted-foreground flex items-center gap-1">
                                        <Lightbulb className="h-3 w-3 shrink-0" /> {a.expected_impact}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Early Warning Signals */}
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Early Warning Signals to Watch
                              </h4>
                              <ul className="text-xs space-y-1.5">
                                {student.early_warning_signals.map((s, i) => (
                                  <li key={i} className="flex gap-1.5">
                                    <Eye className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" /> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Link to={`/teacher/student/${student.student_id}`}>
                              <Button variant="outline" size="sm">View Full Analytics →</Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
