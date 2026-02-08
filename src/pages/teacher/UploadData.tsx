import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet, Brain, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

// Expected CSV columns
const REQUIRED_COLS = ['student_email', 'subject'];
const OPTIONAL_COLS = [
  'student_name', 'marks', 'max_marks',
  'attendance_percentage', 'assignment_score', 'assignment_total',
  'mid_exam_score', 'mid_exam_total', 'semester_score', 'semester_total',
  'lab_score', 'lab_total', 'internal_marks', 'internal_total',
  'assessment_type', 'term', 'notes',
];

type CsvRow = Record<string, string>;

export function UploadData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);
  const [uploadedStudentIds, setUploadedStudentIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadResult(null);
    setUploadedStudentIds([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('CSV must have a header row and at least one data row');
        return;
      }

      const hdrs = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const missing = REQUIRED_COLS.filter(r => !hdrs.includes(r));
      if (missing.length) {
        toast.error(`Missing required columns: ${missing.join(', ')}`);
        return;
      }

      const rows = lines.slice(1).map(line => {
        const vals = parseCsvLine(line);
        const obj: CsvRow = {};
        hdrs.forEach((h, i) => { obj[h] = vals[i]?.trim() || ''; });
        return obj;
      }).filter(r => r.student_email && r.subject);

      if (rows.length === 0) {
        toast.error('No valid data rows found');
        return;
      }

      setHeaders(hdrs);
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0 || !user?.id) return;
    setUploading(true);
    setUploadResult(null);

    try {
      let success = 0;
      let failed = 0;
      const studentIds = new Set<string>();

      // Batch lookup all unique emails
      const emails = [...new Set(preview.map(r => r.student_email))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('email', emails);

      const emailToId = new Map(profiles?.map(p => [p.email, p.user_id]) || []);

      for (const row of preview) {
        const studentId = emailToId.get(row.student_email);
        if (!studentId) { failed++; continue; }

        const record: any = {
          student_id: studentId,
          teacher_id: user.id,
          subject: row.subject,
          marks: numOrNull(row.marks),
          max_marks: numOrNull(row.max_marks) || 100,
          attendance_percentage: numOrNull(row.attendance_percentage) || 0,
          assignment_score: numOrNull(row.assignment_score),
          assignment_total: numOrNull(row.assignment_total) || 100,
          mid_exam_score: numOrNull(row.mid_exam_score),
          mid_exam_total: numOrNull(row.mid_exam_total) || 100,
          semester_score: numOrNull(row.semester_score),
          semester_total: numOrNull(row.semester_total) || 100,
          lab_score: numOrNull(row.lab_score),
          lab_total: numOrNull(row.lab_total) || 100,
          internal_marks: numOrNull(row.internal_marks),
          internal_total: numOrNull(row.internal_total) || 100,
          assessment_type: row.assessment_type || 'exam',
          term: row.term || 'Term 1',
          notes: row.notes || null,
          student_name: row.student_name || null,
        };

        const { error } = await supabase.from('student_performance').insert(record);
        if (error) { failed++; } else { success++; studentIds.add(studentId); }
      }

      setUploadResult({ success, failed });
      setUploadedStudentIds([...studentIds]);
      queryClient.invalidateQueries({ queryKey: ['teacher-performance'] });

      if (success > 0) {
        toast.success(`Uploaded ${success} records successfully`);
      }
      if (failed > 0) {
        toast.error(`${failed} records failed (student email not found)`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const runAutoAnalytics = async () => {
    if (uploadedStudentIds.length === 0) return;
    setAnalyzing(true);

    try {
      for (const studentId of uploadedStudentIds) {
        // Fetch all performance data for this student
        const { data: perfData } = await supabase
          .from('student_performance')
          .select('*')
          .eq('student_id', studentId)
          .eq('teacher_id', user!.id);

        if (!perfData || perfData.length === 0) continue;

        // Run teacher analytics
        await supabase.functions.invoke('analyze-performance', {
          body: { studentId, performanceData: perfData, mode: 'teacher' },
        });
      }

      toast.success(`Analytics generated for ${uploadedStudentIds.length} student(s)`);
      queryClient.invalidateQueries({ queryKey: ['teacher-recommendations'] });
    } catch (err: any) {
      toast.error(err.message || 'Analytics generation failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setPreview([]);
    setHeaders([]);
    setUploadResult(null);
    setUploadedStudentIds([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadSampleCsv = () => {
    const header = ['student_email', 'subject', 'student_name', 'marks', 'max_marks', 'attendance_percentage', 'mid_exam_score', 'mid_exam_total', 'semester_score', 'semester_total', 'assignment_score', 'assignment_total', 'lab_score', 'lab_total', 'internal_marks', 'internal_total', 'assessment_type', 'term', 'notes'].join(',');
    const rows = [
      'student1@example.com,Mathematics,John Doe,78,100,85,35,50,65,100,18,20,40,50,22,25,exam,Term 1,Needs improvement in calculus',
      'student1@example.com,Physics,John Doe,82,100,90,40,50,70,100,17,20,45,50,23,25,exam,Term 1,Good lab performance',
      'student2@example.com,Mathematics,Jane Smith,91,100,95,45,50,88,100,19,20,48,50,24,25,exam,Term 1,Excellent overall',
      'student2@example.com,Chemistry,Jane Smith,74,100,78,30,50,60,100,15,20,35,50,20,25,exam,Term 1,Needs more practice',
    ];
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_student_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Display columns that actually have data
  const displayCols = headers.filter(h =>
    preview.some(r => r[h] && r[h].trim() !== '')
  ).slice(0, 8); // Show max 8 columns in preview

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Student Dataset</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a CSV with semester results, attendance, assignments, mid exams & more
          </p>
        </div>

        {/* CSV Format Guide */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              CSV Format Guide
            </CardTitle>
            <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download Sample CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Required columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {REQUIRED_COLS.map(c => (
                  <code key={c} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{c}</code>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Optional columns (include what you have):</p>
              <div className="flex flex-wrap gap-1.5">
                {OPTIONAL_COLS.map(c => (
                  <code key={c} className="text-xs bg-muted px-2 py-0.5 rounded">{c}</code>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Example: A row with <code className="bg-muted px-1 rounded">student_email, subject, mid_exam_score, semester_score, attendance_percentage, assignment_score</code> will auto-generate analytics.
            </p>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="flex-1"
              />
              {preview.length > 0 && (
                <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {preview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Preview — {preview.length} records from {[...new Set(preview.map(r => r.student_email))].length} student(s)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-64 overflow-auto border rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {displayCols.map(h => (
                        <th key={h} className="p-2 text-left font-medium whitespace-nowrap">{h.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.slice(0, 15).map((row, i) => (
                      <tr key={i}>
                        {displayCols.map(h => (
                          <td key={h} className="p-2 whitespace-nowrap">{row[h] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 15 && (
                  <p className="text-xs text-muted-foreground p-2">...and {preview.length - 15} more rows</p>
                )}
              </div>

              {!uploadResult && (
                <Button onClick={handleUpload} disabled={uploading} className="w-full">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload {preview.length} Records
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Post-Upload Actions */}
        {uploadResult && uploadResult.success > 0 && (
          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">
                    {uploadResult.success} records uploaded successfully
                    {uploadResult.failed > 0 && <span className="text-muted-foreground"> ({uploadResult.failed} failed)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data for {uploadedStudentIds.length} student(s) is ready. Generate AI analytics to get insights, improvement suggestions, and personalized plans.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={runAutoAnalytics} disabled={analyzing}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                  Generate Analytics & Suggestions
                </Button>
                {uploadedStudentIds.length === 1 && (
                  <Button variant="outline" onClick={() => navigate(`/teacher/student/${uploadedStudentIds[0]}`)}>
                    View Student Analytics
                  </Button>
                )}
                <Button variant="ghost" onClick={reset}>Upload More</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {uploadResult && uploadResult.success === 0 && (
          <Card className="border-destructive/20">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-sm">All records failed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure the student emails in the CSV match existing student accounts. Create students first from the Manage Students page.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function numOrNull(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
