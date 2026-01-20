-- Allow students to update submissions that are pending OR marked for resubmission
DROP POLICY IF EXISTS "Students can update their pending submissions" ON public.submissions;

CREATE POLICY "Students can update their pending or resubmit submissions"
ON public.submissions
FOR UPDATE
USING (
  auth.uid() = student_id
  AND status IN ('pending'::submission_status, 'resubmit'::submission_status)
)
WITH CHECK (
  auth.uid() = student_id
  AND status IN ('pending'::submission_status, 'resubmit'::submission_status)
);