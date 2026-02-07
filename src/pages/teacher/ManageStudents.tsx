import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, UserPlus, Users, Copy, Check } from 'lucide-react';

export function ManageStudents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch all student profiles
  const { data: students, isLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at');

      if (error) throw error;

      // Filter to only students by checking user_roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const studentIds = new Set(
        roles?.filter(r => r.role === 'student').map(r => r.user_id) || []
      );

      return data?.filter(p => studentIds.has(p.user_id)) || [];
    },
    enabled: !!user?.id,
  });

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-student', {
        body: { email, password, full_name: fullName },
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to create student');
      } else if (response.data?.error) {
        toast.error(response.data.error);
      } else {
        toast.success(response.data.message);
        setLastCreated({ email, password });
        setFullName('');
        setEmail('');
        setPassword('');
        queryClient.invalidateQueries({ queryKey: ['all-students'] });
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const copyCredentials = () => {
    if (!lastCreated) return;
    navigator.clipboard.writeText(`Email: ${lastCreated.email}\nPassword: ${lastCreated.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Students</h1>
          <p className="text-muted-foreground text-sm mt-1">Add students and share their login credentials</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Student Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New Student
              </CardTitle>
              <CardDescription>Create a student account with login credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-name">Full Name</Label>
                  <Input
                    id="student-name"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-email">Email (Student ID)</Label>
                  <Input
                    id="student-email"
                    type="email"
                    placeholder="student@school.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-password">Password</Label>
                  <Input
                    id="student-password"
                    type="text"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Student Account'}
                </Button>
              </form>

              {lastCreated && (
                <div className="mt-4 p-3 rounded-md bg-muted border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Credentials Created</p>
                    <Button variant="ghost" size="sm" onClick={copyCredentials}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Email: {lastCreated.email}</p>
                  <p className="text-xs text-muted-foreground">Password: {lastCreated.password}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Share these with the student</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Students
              </CardTitle>
              <CardDescription>{students?.length || 0} students registered</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : students && students.length > 0 ? (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {students.map(student => (
                    <div key={student.user_id} className="py-3">
                      <p className="text-sm font-medium">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No students yet. Create one using the form.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
