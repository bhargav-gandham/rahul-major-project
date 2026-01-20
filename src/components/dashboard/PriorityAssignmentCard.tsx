import React from 'react';
import { Assignment, PriorityScore } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, BookOpen, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isPast } from 'date-fns';

interface PriorityAssignmentCardProps {
  assignment: Assignment;
  priority: PriorityScore;
  onSubmit?: () => void;
  onView?: () => void;
}

export function PriorityAssignmentCard({
  assignment,
  priority,
  onSubmit,
  onView,
}: PriorityAssignmentCardProps) {
  const isOverdue = isPast(new Date(assignment.deadline));
  const timeLeft = formatDistanceToNow(new Date(assignment.deadline), { addSuffix: true });

  const priorityBadgeVariant = {
    high: 'priority-high' as const,
    medium: 'priority-medium' as const,
    low: 'priority-low' as const,
  };

  const priorityColors = {
    high: 'border-l-priority-high',
    medium: 'border-l-priority-medium',
    low: 'border-l-priority-low',
  };

  return (
    <Card className={cn(
      'overflow-hidden border-l-4 transition-all hover:shadow-elevated',
      priorityColors[priority.level]
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={priorityBadgeVariant[priority.level]}>
                {priority.level.toUpperCase()} PRIORITY
              </Badge>
              <span className="text-xs text-muted-foreground">
                Score: {priority.score}/100
              </span>
            </div>
            <h3 className="font-semibold text-lg leading-tight truncate">
              {assignment.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{assignment.subjectName}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {assignment.description}
        </p>

        {/* Priority Breakdown */}
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Deadline Proximity</span>
            <span className="font-medium">{priority.deadlineProximity}/40</span>
          </div>
          <Progress value={(priority.deadlineProximity / 40) * 100} className="h-1.5" />
          
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-muted-foreground">Subject Difficulty</span>
            <span className="font-medium">{priority.subjectDifficulty}/35</span>
          </div>
          <Progress value={(priority.subjectDifficulty / 35) * 100} className="h-1.5" />
          
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-muted-foreground">Task Volume</span>
            <span className="font-medium">{priority.taskVolume}/25</span>
          </div>
          <Progress value={(priority.taskVolume / 25) * 100} className="h-1.5" />
        </div>

        {/* Deadline Info */}
        <div className={cn(
          "flex items-center gap-2 mt-4 p-2 rounded-lg text-sm",
          isOverdue 
            ? "bg-destructive/10 text-destructive" 
            : priority.level === 'high'
            ? "bg-warning/10 text-warning"
            : "bg-muted"
        )}>
          {isOverdue ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span className="font-medium">
            {isOverdue ? 'Overdue' : `Due ${timeLeft}`}
          </span>
          <span className="text-muted-foreground ml-auto text-xs">
            {format(new Date(assignment.deadline), 'MMM d, yyyy h:mm a')}
          </span>
        </div>

        {/* Late Submission Warning */}
        {isOverdue && assignment.lateSubmissionAllowed && (
          <p className="text-xs text-warning mt-2">
            Late submission allowed with {assignment.lateSubmissionPenalty}% penalty
          </p>
        )}
        {isOverdue && !assignment.lateSubmissionAllowed && (
          <p className="text-xs text-destructive mt-2">
            Late submissions not accepted - may affect exam eligibility
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button variant="outline" size="sm" onClick={onView} className="flex-1">
          View Details
        </Button>
        {(!isOverdue || assignment.lateSubmissionAllowed) && (
          <Button size="sm" onClick={onSubmit} className="flex-1">
            Submit
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
