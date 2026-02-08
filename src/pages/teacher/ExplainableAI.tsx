import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie,
} from 'recharts';
import { Brain, Loader2, Shield, AlertTriangle, ChevronDown, ChevronUp, Eye, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type FeatureImportance = {
  factor: string;
  weight: number;
  direction: string;
  explanation: string;
};

type StudentPrediction = {
  student_id: string;
  student_name: string;
  predicted_outcome: string;
  confidence: number;
  predicted_score_range: string;
  feature_importance: { factor: string; weight: number; actual_value: string; impact: string }[];
  key_evidence: string[];
  risk_factors: string[];
  recommended_interventions: string[];
};

type PredictionResult = {
  class_feature_importance: FeatureImportance[];
  student_predictions: StudentPrediction[];
  overall_insights: {
    strongest_predictor: string;
    class_risk_summary: string;
    data_quality_note: string;
  };
};

const FACTOR_LABELS: Record<string, string> = {
  attendance: 'Attendance',
  mid_exam: 'Mid Exam',
  semester_exam: 'Semester Exam',
  assignments: 'Assignments',
  lab_performance: 'Lab Performance',
  internal_marks: 'Internal Marks',
  consistency: 'Consistency',
};

const OUTCOME_CONFIG: Record<string, { color: string; label: string }> = {
  excellent: { color: 'hsl(var(--chart-2))', label: 'Excellent' },
  good: { color: 'hsl(var(--chart-1))', label: 'Good' },
  average: { color: 'hsl(var(--chart-4))', label: 'Average' },
  at_risk: { color: 'hsl(var(--chart-3))', label: 'At Risk' },
  critical: { color: 'hsl(var(--chart-5))', label: 'Critical' },
};

const IMPACT_COLORS: Record<string, string> = {
  strongly_positive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  positive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  neutral: 'bg-muted text-muted-foreground',
  negative: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  strongly_negative: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function ExplainableAI() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const { data: allPerformance, isLoading: dataLoading } = useQuery({
    queryKey: ['all-performance-xai', user?.id],
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
      const { data, error } = await supabase.functions.invoke('explainable-predictions', {
        body: { performanceData: allPerformance },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setPredictions(data);
      toast.success('Predictions generated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate predictions');
    } finally {
      setLoading(false);
    }
  };

  const classImportanceData = predictions?.class_feature_importance
    .map(f => ({
      factor: FACTOR_LABELS[f.factor] || f.factor,
      weight: f.weight,
      direction: f.direction,
    }))
    .sort((a, b) => b.weight - a.weight) || [];

  const outcomeDistribution = predictions ? (() => {
    const counts: Record<string, number> = {};
    predictions.student_predictions.forEach(s => {
      counts[s.predicted_outcome] = (counts[s.predicted_outcome] || 0) + 1;
    });
    return Object.entries(counts).map(([outcome, count]) => ({
      name: OUTCOME_CONFIG[outcome]?.label || outcome,
      value: count,
      fill: OUTCOME_CONFIG[outcome]?.color || 'hsl(var(--muted))',
    }));
  })() : [];

  const getBarFill = (direction: string) => {
    if (direction === 'positive') return 'hsl(var(--chart-2))';
    if (direction === 'negative') return 'hsl(var(--chart-5))';
    return 'hsl(var(--chart-4))';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Eye className="h-5 w-5" /> Explainable AI Predictions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Transparent, evidence-based predictions showing exactly which factors drive each outcome
            </p>
          </div>
          <Button onClick={runPredictions} disabled={loading || dataLoading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            {predictions ? 'Refresh Predictions' : 'Generate Predictions'}
          </Button>
        </div>

        {!predictions && !loading && (
          <Card>
            <CardContent className="py-16 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI-Powered Explainable Predictions</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Analyze your class data to generate transparent predictions. See exactly which factors — attendance, exams, assignments, labs — drive each student's predicted outcome.
              </p>
              <Button onClick={runPredictions} disabled={dataLoading}>
                <Brain className="h-4 w-4 mr-2" /> Generate Predictions
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}><CardContent className="p-5 h-24 animate-pulse bg-muted rounded" /></Card>
            ))}
          </div>
        )}

        {predictions && (
          <>
            {/* Insights Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground">Strongest Predictor</p>
                  </div>
                  <p className="text-sm font-semibold">{predictions.overall_insights.strongest_predictor}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" />
                    <p className="text-xs font-medium text-muted-foreground">Class Risk Summary</p>
                  </div>
                  <p className="text-sm">{predictions.overall_insights.class_risk_summary}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-xs font-medium text-muted-foreground">Data Quality</p>
                  </div>
                  <p className="text-sm">{predictions.overall_insights.data_quality_note}</p>
                </CardContent>
              </Card>
            </div>

            {/* Class-Level Feature Importance + Outcome Distribution */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">Class-Level Feature Importance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classImportanceData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="factor" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, 'Importance']}
                        contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="weight" radius={[0, 4, 4, 0]} name="Weight %">
                        {classImportanceData.map((entry, idx) => (
                          <Cell key={idx} fill={getBarFill(entry.direction)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-3 justify-center text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--chart-2))' }} /> Positive</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--chart-5))' }} /> Negative</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--chart-4))' }} /> Mixed</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Predicted Outcome Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={outcomeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {outcomeDistribution.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Per-Student Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Per-Student Explainable Predictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {predictions.student_predictions
                  .sort((a, b) => {
                    const order = ['critical', 'at_risk', 'average', 'good', 'excellent'];
                    return order.indexOf(a.predicted_outcome) - order.indexOf(b.predicted_outcome);
                  })
                  .map(student => {
                    const isExpanded = expandedStudent === student.student_id;
                    const config = OUTCOME_CONFIG[student.predicted_outcome] || { color: 'hsl(var(--muted))', label: student.predicted_outcome };

                    const radarData = student.feature_importance.map(f => ({
                      factor: FACTOR_LABELS[f.factor] || f.factor,
                      weight: f.weight,
                    }));

                    return (
                      <div key={student.student_id} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedStudent(isExpanded ? null : student.student_id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ background: config.color }} />
                            <div>
                              <p className="font-medium text-sm">{student.student_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {config.label} · {student.predicted_score_range} · {student.confidence}% confidence
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className="text-[10px]"
                              style={{
                                background: config.color + '20',
                                color: config.color,
                                borderColor: config.color + '40',
                              }}
                              variant="outline"
                            >
                              {config.label}
                            </Badge>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t p-4 space-y-4 bg-muted/10">
                            <div className="grid gap-4 lg:grid-cols-2">
                              {/* Radar Chart */}
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Factor Importance Weights</h4>
                                <ResponsiveContainer width="100%" height={220}>
                                  <RadarChart data={radarData}>
                                    <PolarGrid stroke="hsl(var(--border))" />
                                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
                                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                                    <Radar dataKey="weight" stroke={config.color} fill={config.color} fillOpacity={0.2} />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Factor Details */}
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Factor Breakdown</h4>
                                <div className="space-y-2">
                                  {student.feature_importance
                                    .sort((a, b) => b.weight - a.weight)
                                    .map((f, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <div className="w-24 text-xs text-muted-foreground truncate">{FACTOR_LABELS[f.factor] || f.factor}</div>
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                          <div className="h-full rounded-full" style={{ width: `${f.weight}%`, background: config.color }} />
                                        </div>
                                        <span className="text-xs font-mono w-8 text-right">{f.weight}%</span>
                                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${IMPACT_COLORS[f.impact] || ''}`}>
                                          {f.actual_value}
                                        </Badge>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>

                            {/* Evidence & Recommendations */}
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Key Evidence</h4>
                                <ul className="text-xs space-y-1">
                                  {student.key_evidence.map((e, i) => (
                                    <li key={i} className="flex gap-1"><span className="text-muted-foreground">•</span> {e}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Risk Factors</h4>
                                <ul className="text-xs space-y-1">
                                  {student.risk_factors.length > 0 ? student.risk_factors.map((r, i) => (
                                    <li key={i} className="flex gap-1 text-destructive"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {r}</li>
                                  )) : <li className="text-muted-foreground">No significant risks</li>}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Interventions</h4>
                                <ul className="text-xs space-y-1">
                                  {student.recommended_interventions.map((r, i) => (
                                    <li key={i} className="flex gap-1"><Lightbulb className="h-3 w-3 mt-0.5 shrink-0 text-primary" /> {r}</li>
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
