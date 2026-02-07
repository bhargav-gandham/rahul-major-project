import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function UploadData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Student Data</h1>
          <p className="text-muted-foreground text-sm mt-1">Add performance records via form or CSV</p>
        </div>

        <Tabs defaultValue="form">
          <TabsList>
            <TabsTrigger value="form"><Plus className="h-4 w-4 mr-1.5" />Single Entry</TabsTrigger>
            <TabsTrigger value="csv"><FileSpreadsheet className="h-4 w-4 mr-1.5" />CSV Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-4">
            <SingleEntryForm teacherId={user?.id || ''} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['teacher-performance'] })} />
          </TabsContent>

          <TabsContent value="csv" className="mt-4">
            <CsvUpload teacherId={user?.id || ''} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['teacher-performance'] })} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function SingleEntryForm({ teacherId, onSuccess }: { teacherId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    studentEmail: '',
    subject: '',
    marks: '',
    maxMarks: '100',
    attendance: '',
    assessmentType: 'exam',
    term: 'Term 1',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Look up student by email
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', form.studentEmail)
        .single();

      if (profileErr || !profile) {
        toast.error('Student not found. Make sure they have an account.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('student_performance').insert({
        student_id: profile.user_id,
        teacher_id: teacherId,
        subject: form.subject,
        marks: parseFloat(form.marks),
        max_marks: parseFloat(form.maxMarks),
        attendance_percentage: form.attendance ? parseFloat(form.attendance) : 0,
        assessment_type: form.assessmentType,
        term: form.term,
        notes: form.notes || null,
      });

      if (error) throw error;
      toast.success('Record added successfully');
      setForm({ studentEmail: '', subject: '', marks: '', maxMarks: '100', attendance: '', assessmentType: 'exam', term: 'Term 1', notes: '' });
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add Performance Record</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Student Email</Label>
              <Input type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required placeholder="e.g. Mathematics" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Marks</Label>
              <Input type="number" value={form.marks} onChange={e => setForm(f => ({ ...f, marks: e.target.value }))} required min="0" />
            </div>
            <div className="space-y-2">
              <Label>Max Marks</Label>
              <Input type="number" value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))} required min="1" />
            </div>
            <div className="space-y-2">
              <Label>Attendance %</Label>
              <Input type="number" value={form.attendance} onChange={e => setForm(f => ({ ...f, attendance: e.target.value }))} min="0" max="100" placeholder="0-100" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Assessment Type</Label>
              <Select value={form.assessmentType} onValueChange={v => setForm(f => ({ ...f, assessmentType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="midterm">Midterm</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional observations..." />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Record
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CsvUpload({ teacherId, onSuccess }: { teacherId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have a header and at least one row'); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const required = ['student_email', 'subject', 'marks'];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length) { toast.error(`Missing columns: ${missing.join(', ')}`); return; }

      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter(r => r.student_email && r.subject && r.marks);

      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0) return;
    setLoading(true);

    try {
      let success = 0;
      let failed = 0;

      for (const row of preview) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', row.student_email)
          .single();

        if (!profile) { failed++; continue; }

        const { error } = await supabase.from('student_performance').insert({
          student_id: profile.user_id,
          teacher_id: teacherId,
          subject: row.subject,
          marks: parseFloat(row.marks),
          max_marks: parseFloat(row.max_marks || '100'),
          attendance_percentage: parseFloat(row.attendance_percentage || '0'),
          assessment_type: row.assessment_type || 'exam',
          term: row.term || 'Term 1',
          notes: row.notes || null,
        });

        if (error) failed++;
        else success++;
      }

      toast.success(`Uploaded ${success} records${failed > 0 ? `, ${failed} failed` : ''}`);
      setPreview([]);
      if (fileRef.current) fileRef.current.value = '';
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">CSV Upload</CardTitle>
        <CardDescription>
          Required columns: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">student_email, subject, marks</code>
          <br />
          Optional: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">max_marks, attendance_percentage, assessment_type, term, notes</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input ref={fileRef} type="file" accept=".csv" onChange={handleFile} />

        {preview.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{preview.length} records ready to upload</p>
            <div className="max-h-48 overflow-auto border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Subject</th>
                    <th className="p-2 text-left">Marks</th>
                    <th className="p-2 text-left">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="p-2">{row.student_email}</td>
                      <td className="p-2">{row.subject}</td>
                      <td className="p-2">{row.marks}/{row.max_marks || 100}</td>
                      <td className="p-2">{row.attendance_percentage || '-'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && <p className="text-xs text-muted-foreground p-2">...and {preview.length - 10} more</p>}
            </div>
            <Button onClick={handleUpload} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload {preview.length} Records
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
