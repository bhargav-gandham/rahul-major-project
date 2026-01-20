-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'faculty', 'student', 'parent');

-- Create enum for submission status
CREATE TYPE public.submission_status AS ENUM ('pending', 'evaluated', 'resubmit');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create parent_student_links table for parent-student relationships
CREATE TABLE public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  student_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
  faculty_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_subjects enrollment table
CREATE TABLE public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id)
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  faculty_id UUID NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_marks INTEGER NOT NULL DEFAULT 100,
  late_submission_allowed BOOLEAN NOT NULL DEFAULT false,
  late_submission_penalty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_late BOOLEAN NOT NULL DEFAULT false,
  status submission_status NOT NULL DEFAULT 'pending',
  marks INTEGER,
  feedback TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE,
  evaluated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Create notes/resources table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  faculty_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create academic_records table for tracking exam eligibility and credits
CREATE TABLE public.academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  assignments_completed INTEGER NOT NULL DEFAULT 0,
  total_assignments INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  exam_eligible BOOLEAN NOT NULL DEFAULT true,
  credits_earned INTEGER NOT NULL DEFAULT 0,
  semester TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to check if parent has access to student
CREATE OR REPLACE FUNCTION public.parent_has_student_access(_parent_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_links
    WHERE parent_id = _parent_id
      AND student_id = _student_id
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Faculty can view student profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'faculty'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for parent_student_links
CREATE POLICY "Parents can view their links"
  ON public.parent_student_links FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Students can view their parent links"
  ON public.parent_student_links FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage parent links"
  ON public.parent_student_links FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subjects
CREATE POLICY "Anyone authenticated can view subjects"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage their subjects"
  ON public.subjects FOR ALL
  USING (auth.uid() = faculty_id);

CREATE POLICY "Admins can manage all subjects"
  ON public.subjects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for student_subjects
CREATE POLICY "Students can view their enrollments"
  ON public.student_subjects FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Faculty can view enrollments for their subjects"
  ON public.student_subjects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subjects 
    WHERE id = subject_id AND faculty_id = auth.uid()
  ));

CREATE POLICY "Admins can manage enrollments"
  ON public.student_subjects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for assignments
CREATE POLICY "Students can view assignments for enrolled subjects"
  ON public.assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.student_subjects 
    WHERE student_id = auth.uid() AND subject_id = assignments.subject_id
  ));

CREATE POLICY "Faculty can manage their assignments"
  ON public.assignments FOR ALL
  USING (auth.uid() = faculty_id);

CREATE POLICY "Parents can view assignments for their children"
  ON public.assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.student_subjects ss ON ss.student_id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND ss.subject_id = assignments.subject_id
  ));

CREATE POLICY "Admins can manage all assignments"
  ON public.assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for submissions
CREATE POLICY "Students can view their own submissions"
  ON public.submissions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their pending submissions"
  ON public.submissions FOR UPDATE
  USING (auth.uid() = student_id AND status = 'pending');

CREATE POLICY "Faculty can view submissions for their assignments"
  ON public.submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assignments 
    WHERE id = assignment_id AND faculty_id = auth.uid()
  ));

CREATE POLICY "Faculty can evaluate submissions"
  ON public.submissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.assignments 
    WHERE id = assignment_id AND faculty_id = auth.uid()
  ));

CREATE POLICY "Parents can view their children submissions"
  ON public.submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = auth.uid() AND student_id = submissions.student_id
  ));

CREATE POLICY "Admins can view all submissions"
  ON public.submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notes
CREATE POLICY "Students can view notes for enrolled subjects"
  ON public.notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.student_subjects 
    WHERE student_id = auth.uid() AND subject_id = notes.subject_id
  ));

CREATE POLICY "Faculty can manage their notes"
  ON public.notes FOR ALL
  USING (auth.uid() = faculty_id);

CREATE POLICY "Parents can view notes for their children subjects"
  ON public.notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.student_subjects ss ON ss.student_id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND ss.subject_id = notes.subject_id
  ));

CREATE POLICY "Admins can manage all notes"
  ON public.notes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_records
CREATE POLICY "Students can view their own records"
  ON public.academic_records FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Faculty can view records for their subjects"
  ON public.academic_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.subjects 
    WHERE id = subject_id AND faculty_id = auth.uid()
  ));

CREATE POLICY "Faculty can update records for their subjects"
  ON public.academic_records FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.subjects 
    WHERE id = subject_id AND faculty_id = auth.uid()
  ));

CREATE POLICY "Parents can view their children records"
  ON public.academic_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = auth.uid() AND student_id = academic_records.student_id
  ));

CREATE POLICY "Admins can manage all records"
  ON public.academic_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Default role is student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_records_updated_at
  BEFORE UPDATE ON public.academic_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();