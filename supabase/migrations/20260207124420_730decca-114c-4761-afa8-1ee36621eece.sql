
-- Fix all RLS policies: change from RESTRICTIVE to PERMISSIVE (default)
-- The existing policies are all RESTRICTIVE which blocks all access

-- ============ student_performance ============
DROP POLICY IF EXISTS "Teachers can manage performance data they uploaded" ON public.student_performance;
DROP POLICY IF EXISTS "Students can view their own performance" ON public.student_performance;
DROP POLICY IF EXISTS "Admins can manage all performance data" ON public.student_performance;

CREATE POLICY "Teachers can manage performance data they uploaded"
ON public.student_performance FOR ALL TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view their own performance"
ON public.student_performance FOR SELECT TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all performance data"
ON public.student_performance FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ student_goals ============
DROP POLICY IF EXISTS "Students can manage their own goals" ON public.student_goals;
DROP POLICY IF EXISTS "Teachers can view student goals" ON public.student_goals;

CREATE POLICY "Students can manage their own goals"
ON public.student_goals FOR ALL TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view student goals"
ON public.student_goals FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'faculty'::app_role));

-- ============ weekly_plans ============
DROP POLICY IF EXISTS "Students can view their own plans" ON public.weekly_plans;
DROP POLICY IF EXISTS "Teachers can view student plans" ON public.weekly_plans;
DROP POLICY IF EXISTS "Teachers can insert plans for students" ON public.weekly_plans;
DROP POLICY IF EXISTS "Students can insert their own plans" ON public.weekly_plans;

CREATE POLICY "Students can view their own plans"
ON public.weekly_plans FOR SELECT TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can manage student plans"
ON public.weekly_plans FOR ALL TO authenticated
USING (has_role(auth.uid(), 'faculty'::app_role))
WITH CHECK (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Students can insert their own plans"
ON public.weekly_plans FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Allow students to update their own plans
CREATE POLICY "Students can update their own plans"
ON public.weekly_plans FOR UPDATE TO authenticated
USING (auth.uid() = student_id);

-- ============ teacher_recommendations ============
DROP POLICY IF EXISTS "Teachers can manage their recommendations" ON public.teacher_recommendations;
DROP POLICY IF EXISTS "Students can view approved recommendations for them" ON public.teacher_recommendations;
DROP POLICY IF EXISTS "Admins can manage all recommendations" ON public.teacher_recommendations;

CREATE POLICY "Teachers can manage their recommendations"
ON public.teacher_recommendations FOR ALL TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view recommendations for them"
ON public.teacher_recommendations FOR SELECT TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all recommendations"
ON public.teacher_recommendations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ profiles ============
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view student profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'faculty'::app_role));

-- ============ user_roles ============
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
