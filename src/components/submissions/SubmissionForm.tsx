import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Clock, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';

const submissionSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content must be less than 5000 characters'),
  fileUrl: z.string().url().optional().or(z.literal('')),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  max_marks: number;
  late_submission_allowed: boolean;
  late_submission_penalty: number;
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

interface SubmissionFormProps {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SubmissionForm({ assignment, open, onOpenChange, onSuccess }: SubmissionFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deadline = new Date(assignment.deadline);
  const isOverdue = isPast(deadline);
  const canSubmit = !isOverdue || assignment.late_submission_allowed;

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      content: '',
      fileUrl: '',
    },
  });

  const onSubmit = async (data: SubmissionFormData) => {
    if (!user) {
      toast.error('You must be logged in to submit');
      return;
    }

    if (!canSubmit) {
      toast.error('Submissions are no longer accepted for this assignment');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Submit to database when submissions table exists
      toast.success('Assignment submitted successfully!');
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Submit Assignment
          </DialogTitle>
          <DialogDescription>
            Submit your work for: {assignment.title}
          </DialogDescription>
        </DialogHeader>

        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{assignment.title}</h4>
                <p className="text-sm text-muted-foreground">{assignment.subject.name}</p>
              </div>
              <Badge variant="outline">{assignment.max_marks} marks</Badge>
            </div>

            {assignment.description && (
              <p className="text-sm text-muted-foreground">{assignment.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                  {isOverdue ? 'Overdue: ' : 'Due: '}
                  {format(deadline, 'PPp')}
                </span>
              </div>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  {formatDistanceToNow(deadline, { addSuffix: true })}
                </Badge>
              )}
            </div>

            {isOverdue && assignment.late_submission_allowed && (
              <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-md border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm text-warning">
                  Late penalty: {assignment.late_submission_penalty}% deduction
                </span>
              </div>
            )}

            {isOverdue && !assignment.late_submission_allowed && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">
                  Late submissions are not accepted for this assignment
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Submission</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your assignment content..."
                      className="min-h-[150px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    File URL (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://drive.google.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !canSubmit} className="min-w-[120px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
