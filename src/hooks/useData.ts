import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// These hooks use mock/empty data since the corresponding tables
// (assignments, submissions, subjects, academic_records, parent_student_links)
// don't exist in the current database schema.

export function useAssignments() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      return [] as any[];
    },
    enabled: !!session,
  });
}

export function usePrioritizedAssignments() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['prioritized-assignments'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('calculate-priority');
        if (error) return [];
        return (data?.priorities || []) as any[];
      } catch {
        return [];
      }
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
      return [] as any[];
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
      return [] as any[];
    },
    enabled: !!session && !!id,
  });
}

export function useSubjects() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      return [] as any[];
    },
    enabled: !!session,
  });
}

export function useFacultyAssignments() {
  const { session, user } = useAuth();

  return useQuery({
    queryKey: ['faculty-assignments', user?.id],
    queryFn: async () => {
      return [] as any[];
    },
    enabled: !!session && !!user?.id,
  });
}

export function useFacultySubjects() {
  const { session, user } = useAuth();

  return useQuery({
    queryKey: ['faculty-subjects', user?.id],
    queryFn: async () => {
      return [] as any[];
    },
    enabled: !!session && !!user?.id,
  });
}

export function useSubmissionsForAssignment(assignmentId: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['assignment-submissions', assignmentId],
    queryFn: async () => {
      return [] as any[];
    },
    enabled: !!session && !!assignmentId,
  });
}

export function useParentStudents() {
  const { session, user } = useAuth();

  return useQuery({
    queryKey: ['parent-students', user?.id],
    queryFn: async () => {
      return [] as any[];
    },
    enabled: !!session && !!user?.id,
  });
}
