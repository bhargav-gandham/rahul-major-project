import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SubmissionForm } from '@/components/submissions/SubmissionForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  BookOpen,
} from 'lucide-react';
import { usePrioritizedAssignments, useSubmissions } from '@/hooks/useData';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  max_marks: number;
  late_submission_allowed: boolean;
  late_submission_penalty: number;
  created_at: string;
  subject: {
    id: string;
    name: string;
    code: string;
    difficulty: number;
  };
  priority?: {
    score: number;
    level: 'high' | 'medium' | 'low';
  };
}

function getPriorityBadge(level: 'high' | 'medium' | 'low') {
  const variants = {
    high: 'destructive',
    medium: 'warning',
    low: 'success',
  } as const;
  
  return (
    <Badge variant={variants[level]} className="capitalize">
      {level} Priority
    </Badge>
  );
}

function AssignmentCard({ 
  assignment, 
  isSubmitted,
  submission,
  onSubmit 
}: { 
  assignment: Assignment;
  isSubmitted: boolean;
  submission?: {
    status: string;
    marks: number | null;
    is_late: boolean;
  };
  onSubmit: () => void;
}) {
  const deadline = new Date(assignment.deadline);
  const isOverdue = isPast(deadline);
  const canSubmit = !isSubmitted && (!isOverdue || assignment.late_submission_allowed);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{assignment.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <BookOpen className="h-3.5 w-3.5" />
              {assignment.subject.name}
            </p>
          </div>
          {assignment.priority && getPriorityBadge(assignment.priority.level)}
        </div>

        {assignment.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {assignment.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className={`flex items-center gap-1.5 text-sm ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Clock className="h-4 w-4" />
            <span>
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {format(deadline, 'MMM d, yyyy')}
            </span>
          </div>
          {isOverdue && !isSubmitted && (
            <Badge variant="destructive" className="text-xs">
              {formatDistanceToNow(deadline, { addSuffix: true })}
            </Badge>
          )}
          <Badge variant="outline">{assignment.max_marks} marks</Badge>
        </div>

        {/* Status Section */}
        <div className="flex items-center justify-between pt-3 border-t">
          {isSubmitted ? (
            <div className="flex items-center gap-2">
              {submission?.status === 'evaluated' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-success">
                    Evaluated: {submission.marks}/{assignment.max_marks}
                  </span>
                </>
              ) : submission?.status === 'resubmit' ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium text-warning">Resubmission Required</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Pending Evaluation</span>
                </>
              )}
              {submission?.is_late && (
                <Badge variant="outline" className="text-xs text-warning border-warning">Late</Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span className="text-sm">Not submitted</span>
            </div>
          )}

          {canSubmit && (
            <Button size="sm" onClick={onSubmit}>
              <Send className="h-4 w-4 mr-1.5" />
              Submit
            </Button>
          )}
          {isSubmitted && submission?.status === 'resubmit' && (
            <Button size="sm" variant="warning" onClick={onSubmit}>
              <Send className="h-4 w-4 mr-1.5" />
              Resubmit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentAssignments() {
  const { data: assignments, isLoading: assignmentsLoading } = usePrioritizedAssignments();
  const { data: submissions, isLoading: submissionsLoading } = useSubmissions();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const queryClient = useQueryClient();

  const isLoading = assignmentsLoading || submissionsLoading;

  // Create a map of submitted assignments
  const submissionMap = new Map(
    submissions?.map(s => [s.assignment_id, { 
      status: s.status, 
      marks: s.marks,
      is_late: s.is_late 
    }])
  );

  // Separate pending and completed assignments
  const pendingAssignments = assignments?.filter(a => {
    const submission = submissionMap.get(a.id);
    return !submission || submission.status === 'resubmit';
  }) || [];

  const completedAssignments = assignments?.filter(a => {
    const submission = submissionMap.get(a.id);
    return submission && submission.status !== 'resubmit';
  }) || [];

  const handleSubmissionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['submissions'] });
    queryClient.invalidateQueries({ queryKey: ['prioritized-assignments'] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Assignments</h1>
          <p className="text-muted-foreground mt-1">
            View and submit your assignments
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Pending ({pendingAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : pendingAssignments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    isSubmitted={false}
                    submission={submissionMap.get(assignment.id)}
                    onSubmit={() => setSelectedAssignment(assignment)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                  <h3 className="font-semibold text-lg">All caught up!</h3>
                  <p className="text-muted-foreground">No pending assignments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : completedAssignments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {completedAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    isSubmitted={true}
                    submission={submissionMap.get(assignment.id)}
                    onSubmit={() => {}}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">No completed assignments</h3>
                  <p className="text-muted-foreground">Submit your first assignment to see it here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Submission Form Dialog */}
        {selectedAssignment && (
          <SubmissionForm
            assignment={{
              id: selectedAssignment.id,
              title: selectedAssignment.title,
              description: selectedAssignment.description,
              deadline: selectedAssignment.deadline,
              max_marks: selectedAssignment.max_marks,
              late_submission_allowed: selectedAssignment.late_submission_allowed,
              late_submission_penalty: selectedAssignment.late_submission_penalty,
              subject: {
                id: selectedAssignment.subject?.id || '',
                name: selectedAssignment.subject?.name || '',
                code: selectedAssignment.subject?.code || '',
              },
            }}
            open={!!selectedAssignment}
            onOpenChange={(open) => !open && setSelectedAssignment(null)}
            onSuccess={handleSubmissionSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
