import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Subject {
  id: string;
  name: string;
  code: string;
  difficulty: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  max_marks: number;
  late_submission_allowed: boolean;
  late_submission_penalty: number;
  created_at: string;
  subject: Subject;
  priority?: {
    assignment_id: string;
    score: number;
    level: 'high' | 'medium' | 'low';
    deadline_proximity: number;
    subject_difficulty: number;
    task_volume: number;
  };
}

export function useAssignments() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subject:subjects!inner (
            id,
            name,
            code,
            difficulty
          )
        `)
        .order('deadline', { ascending: true });

      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!session,
  });
}

export function usePrioritizedAssignments() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['prioritized-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-priority');
      
      if (error) throw error;
      return (data?.priorities || []) as Assignment[];
    },
    enabled: !!session,
  });
}

export function useSubmissions(studentId?: string) {
  const { session, user } = useAuth();
  const id = studentId || user?.id;

  return useQuery({
    queryKey: ['submissions', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          assignment:assignments!inner (
            id,
            title,
            max_marks,
            subject:subjects!inner (
              id,
              name,
              code
            )
          )
        `)
        .eq('student_id', id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session && !!id,
  });
}

export function useAcademicRecords(studentId?: string) {
  const { session, user } = useAuth();
  const id = studentId || user?.id;

  return useQuery({
    queryKey: ['academic-records', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('academic_records')
        .select(`
          *,
          subject:subjects!inner (
            id,
            name,
            code,
            credits
          )
        `)
        .eq('student_id', id);

      if (error) throw error;
      return data;
    },
    enabled: !!session && !!id,
  });
}

export function useSubjects() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });
}

export function useFacultyAssignments() {
  const { session, user } = useAuth();

  return useQuery({
    queryKey: ['faculty-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subject:subjects!inner (
            id,
            name,
            code
          )
        `)
        .eq('faculty_id', user.id)
        .order('deadline', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!session && !!user?.id,
  });
}

export function useFacultySubjects() {
  const { session, user } = useAuth();

  return useQuery({
    queryKey: ['faculty-subjects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('faculty_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!session && !!user?.id,
  });
}

export function useSubmissionsForAssignment(assignmentId: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['assignment-submissions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          student:profiles!inner (
            id,
            full_name,
            email
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session && !!assignmentId,
  });
}

export function useParentStudents() {
  const { session, user } = useAuth();

  return useQuery({
    queryKey: ['parent-students', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('parent_student_links')
        .select(`
          student_id,
          student:profiles!inner (
            id,
            user_id,
            full_name,
            email
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!session && !!user?.id,
  });
}
