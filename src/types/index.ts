export type UserRole = 'admin' | 'faculty' | 'student' | 'parent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  difficulty: number; // 1-5 scale
  facultyId: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  facultyId: string;
  deadline: Date;
  maxMarks: number;
  createdAt: Date;
  attachments?: string[];
  lateSubmissionAllowed: boolean;
  lateSubmissionPenalty: number; // percentage reduction
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: Date;
  content: string;
  attachments?: string[];
  isLate: boolean;
  status: 'pending' | 'evaluated' | 'resubmit';
  marks?: number;
  feedback?: string;
}

export interface PriorityScore {
  assignmentId: string;
  score: number;
  level: 'high' | 'medium' | 'low';
  deadlineProximity: number;
  subjectDifficulty: number;
  taskVolume: number;
}

export interface AcademicRecord {
  studentId: string;
  subjectId: string;
  assignmentsCompleted: number;
  totalAssignments: number;
  averageScore: number;
  examEligible: boolean;
  credits: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subjectId: string;
  facultyId: string;
  createdAt: Date;
  attachments?: string[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: Date;
}
