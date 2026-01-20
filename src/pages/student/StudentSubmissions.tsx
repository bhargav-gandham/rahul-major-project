import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubmissions } from '@/hooks/useData';
import { format } from 'date-fns';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function getStatusConfig(status: string) {
  switch (status) {
    case 'evaluated':
      return {
        label: 'Evaluated',
        variant: 'success' as const,
        icon: CheckCircle2,
        color: 'text-success',
      };
    case 'resubmit':
      return {
        label: 'Resubmit Required',
        variant: 'warning' as const,
        icon: AlertTriangle,
        color: 'text-warning',
      };
    default:
      return {
        label: 'Pending',
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-primary',
      };
  }
}

interface SubmissionCardProps {
  submission: {
    id: string;
    content: string | null;
    file_url: string | null;
    submitted_at: string;
    is_late: boolean;
    status: string;
    marks: number | null;
    feedback: string | null;
    assignment: {
      id: string;
      title: string;
      max_marks: number;
      subject: {
        id: string;
        name: string;
        code: string;
      };
    };
  };
}

function SubmissionCard({ submission }: SubmissionCardProps) {
  const statusConfig = getStatusConfig(submission.status);
  const StatusIcon = statusConfig.icon;
  const scorePercentage = submission.marks !== null 
    ? (submission.marks / submission.assignment.max_marks) * 100 
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{submission.assignment.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <BookOpen className="h-3.5 w-3.5" />
              {submission.assignment.subject.name}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={statusConfig.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            {submission.is_late && (
              <Badge variant="outline" className="text-xs text-warning border-warning">
                Late Submission
              </Badge>
            )}
          </div>
        </div>

        {/* Submitted date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Calendar className="h-4 w-4" />
          <span>Submitted: {format(new Date(submission.submitted_at), 'PPp')}</span>
        </div>

        {/* Score section (if evaluated) */}
        {submission.status === 'evaluated' && submission.marks !== null && (
          <div className="p-4 bg-muted/50 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Score</span>
              <span className={cn(
                "text-2xl font-bold",
                scorePercentage !== null && scorePercentage >= 70 
                  ? "text-success" 
                  : scorePercentage !== null && scorePercentage >= 50
                  ? "text-warning"
                  : "text-destructive"
              )}>
                {submission.marks}/{submission.assignment.max_marks}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all",
                  scorePercentage !== null && scorePercentage >= 70 
                    ? "bg-success" 
                    : scorePercentage !== null && scorePercentage >= 50
                    ? "bg-warning"
                    : "bg-destructive"
                )}
                style={{ width: `${scorePercentage || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Feedback section */}
        {submission.feedback && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Faculty Feedback</span>
            </div>
            <p className="text-sm text-muted-foreground">{submission.feedback}</p>
          </div>
        )}

        {/* Submission content preview */}
        {submission.content && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-1">Your submission:</p>
            <p className="text-sm line-clamp-2">{submission.content}</p>
          </div>
        )}

        {/* File URL */}
        {submission.file_url && (
          <div className="mt-3">
            <a 
              href={submission.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              View attached file
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StudentSubmissions() {
  const { data: submissions, isLoading } = useSubmissions();

  const evaluatedSubmissions = submissions?.filter(s => s.status === 'evaluated') || [];
  const pendingSubmissions = submissions?.filter(s => s.status === 'pending') || [];
  const resubmitSubmissions = submissions?.filter(s => s.status === 'resubmit') || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Submissions</h1>
          <p className="text-muted-foreground mt-1">
            View all your submitted assignments, marks, and feedback
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSubmissions.length}</p>
                <p className="text-sm text-muted-foreground">Pending Evaluation</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{evaluatedSubmissions.length}</p>
                <p className="text-sm text-muted-foreground">Evaluated</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resubmitSubmissions.length}</p>
                <p className="text-sm text-muted-foreground">Need Resubmission</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : submissions && submissions.length > 0 ? (
          <div className="space-y-6">
            {/* Resubmit Required */}
            {resubmitSubmissions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Resubmission Required
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {resubmitSubmissions.map((submission) => (
                    <SubmissionCard key={submission.id} submission={submission} />
                  ))}
                </div>
              </div>
            )}

            {/* Pending */}
            {pendingSubmissions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Pending Evaluation
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {pendingSubmissions.map((submission) => (
                    <SubmissionCard key={submission.id} submission={submission} />
                  ))}
                </div>
              </div>
            )}

            {/* Evaluated */}
            {evaluatedSubmissions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Evaluated
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {evaluatedSubmissions.map((submission) => (
                    <SubmissionCard key={submission.id} submission={submission} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No submissions yet</h3>
              <p className="text-muted-foreground">
                Submit your first assignment to see it here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
