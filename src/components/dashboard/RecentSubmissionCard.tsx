import React from 'react';
import { Submission, Assignment } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecentSubmissionCardProps {
  submission: Submission;
  assignment: Assignment;
}

export function RecentSubmissionCard({ submission, assignment }: RecentSubmissionCardProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Pending Review',
      variant: 'secondary' as const,
      color: 'text-muted-foreground',
    },
    evaluated: {
      icon: CheckCircle2,
      label: 'Evaluated',
      variant: 'success' as const,
      color: 'text-success',
    },
    resubmit: {
      icon: AlertCircle,
      label: 'Resubmit Required',
      variant: 'warning' as const,
      color: 'text-warning',
    },
  };

  const status = statusConfig[submission.status];
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold leading-tight truncate">
              {assignment.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {assignment.subjectName}
            </p>
          </div>
          <Badge variant={status.variant}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Submitted</span>
            <span>{format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}</span>
          </div>

          {submission.isLate && (
            <Badge variant="warning" className="text-xs">
              Late Submission
            </Badge>
          )}

          {submission.status === 'evaluated' && submission.marks !== undefined && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Score</span>
                <span className={cn(
                  "text-lg font-bold",
                  submission.marks >= assignment.maxMarks * 0.7 
                    ? "text-success" 
                    : submission.marks >= assignment.maxMarks * 0.5
                    ? "text-warning"
                    : "text-destructive"
                )}>
                  {submission.marks}/{assignment.maxMarks}
                </span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    submission.marks >= assignment.maxMarks * 0.7 
                      ? "bg-success" 
                      : submission.marks >= assignment.maxMarks * 0.5
                      ? "bg-warning"
                      : "bg-destructive"
                  )}
                  style={{ width: `${(submission.marks / assignment.maxMarks) * 100}%` }}
                />
              </div>
            </div>
          )}

          {submission.feedback && (
            <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
              <div className="flex items-center gap-2 text-primary mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">Faculty Feedback</span>
              </div>
              <p className="text-sm text-muted-foreground">{submission.feedback}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
