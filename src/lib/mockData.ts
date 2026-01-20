import { User, Subject, Assignment, Submission, Note, PriorityScore, AcademicRecord } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@university.edu',
    name: 'Dr. Sarah Johnson',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'faculty@university.edu',
    name: 'Prof. Michael Chen',
    role: 'faculty',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    email: 'student@university.edu',
    name: 'Alex Thompson',
    role: 'student',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    email: 'parent@example.com',
    name: 'Margaret Thompson',
    role: 'parent',
    createdAt: new Date('2024-02-01'),
  },
];

export const mockSubjects: Subject[] = [
  {
    id: 's1',
    name: 'Advanced Algorithms',
    code: 'CS401',
    description: 'Study of advanced algorithmic techniques and complexity analysis',
    credits: 4,
    difficulty: 5,
    facultyId: '2',
  },
  {
    id: 's2',
    name: 'Database Systems',
    code: 'CS302',
    description: 'Relational database design, SQL, and database administration',
    credits: 3,
    difficulty: 3,
    facultyId: '2',
  },
  {
    id: 's3',
    name: 'Machine Learning',
    code: 'CS450',
    description: 'Introduction to machine learning algorithms and applications',
    credits: 4,
    difficulty: 4,
    facultyId: '2',
  },
  {
    id: 's4',
    name: 'Software Engineering',
    code: 'CS350',
    description: 'Software development lifecycle and best practices',
    credits: 3,
    difficulty: 2,
    facultyId: '2',
  },
];

const today = new Date();
const addDays = (days: number) => new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

export const mockAssignments: Assignment[] = [
  {
    id: 'a1',
    title: 'Dynamic Programming Analysis',
    description: 'Analyze and implement 5 dynamic programming problems with time complexity analysis.',
    subjectId: 's1',
    subjectName: 'Advanced Algorithms',
    facultyId: '2',
    deadline: addDays(2),
    maxMarks: 100,
    createdAt: addDays(-5),
    lateSubmissionAllowed: true,
    lateSubmissionPenalty: 20,
  },
  {
    id: 'a2',
    title: 'Database Normalization Project',
    description: 'Design a normalized database schema for an e-commerce platform.',
    subjectId: 's2',
    subjectName: 'Database Systems',
    facultyId: '2',
    deadline: addDays(5),
    maxMarks: 50,
    createdAt: addDays(-3),
    lateSubmissionAllowed: false,
    lateSubmissionPenalty: 0,
  },
  {
    id: 'a3',
    title: 'Neural Network Implementation',
    description: 'Implement a feedforward neural network from scratch using Python.',
    subjectId: 's3',
    subjectName: 'Machine Learning',
    facultyId: '2',
    deadline: addDays(1),
    maxMarks: 100,
    createdAt: addDays(-7),
    lateSubmissionAllowed: true,
    lateSubmissionPenalty: 15,
  },
  {
    id: 'a4',
    title: 'UML Design Document',
    description: 'Create comprehensive UML diagrams for a library management system.',
    subjectId: 's4',
    subjectName: 'Software Engineering',
    facultyId: '2',
    deadline: addDays(10),
    maxMarks: 75,
    createdAt: addDays(-2),
    lateSubmissionAllowed: true,
    lateSubmissionPenalty: 10,
  },
  {
    id: 'a5',
    title: 'Graph Algorithm Implementation',
    description: 'Implement Dijkstra and A* algorithms with visualization.',
    subjectId: 's1',
    subjectName: 'Advanced Algorithms',
    facultyId: '2',
    deadline: addDays(-1),
    maxMarks: 80,
    createdAt: addDays(-10),
    lateSubmissionAllowed: false,
    lateSubmissionPenalty: 0,
  },
];

export const mockSubmissions: Submission[] = [
  {
    id: 'sub1',
    assignmentId: 'a5',
    studentId: '3',
    submittedAt: addDays(-2),
    content: 'Implementation of Dijkstra and A* algorithms with pygame visualization.',
    isLate: false,
    status: 'evaluated',
    marks: 72,
    feedback: 'Excellent implementation! Good use of priority queues. Minor optimization possible in A* heuristic.',
  },
  {
    id: 'sub2',
    assignmentId: 'a2',
    studentId: '3',
    submittedAt: addDays(-1),
    content: 'E-commerce database schema with ER diagram and normalization steps.',
    isLate: false,
    status: 'pending',
  },
];

export const mockNotes: Note[] = [
  {
    id: 'n1',
    title: 'Dynamic Programming Fundamentals',
    content: 'Comprehensive guide to DP techniques including memoization and tabulation.',
    subjectId: 's1',
    facultyId: '2',
    createdAt: addDays(-10),
  },
  {
    id: 'n2',
    title: 'SQL Query Optimization',
    content: 'Tips and tricks for writing efficient SQL queries.',
    subjectId: 's2',
    facultyId: '2',
    createdAt: addDays(-8),
  },
  {
    id: 'n3',
    title: 'Introduction to Neural Networks',
    content: 'Basic concepts of neural networks and backpropagation.',
    subjectId: 's3',
    facultyId: '2',
    createdAt: addDays(-6),
  },
];

export const mockAcademicRecords: AcademicRecord[] = [
  {
    studentId: '3',
    subjectId: 's1',
    assignmentsCompleted: 3,
    totalAssignments: 5,
    averageScore: 85,
    examEligible: true,
    credits: 4,
  },
  {
    studentId: '3',
    subjectId: 's2',
    assignmentsCompleted: 2,
    totalAssignments: 4,
    averageScore: 78,
    examEligible: true,
    credits: 3,
  },
  {
    studentId: '3',
    subjectId: 's3',
    assignmentsCompleted: 1,
    totalAssignments: 4,
    averageScore: 92,
    examEligible: true,
    credits: 4,
  },
  {
    studentId: '3',
    subjectId: 's4',
    assignmentsCompleted: 0,
    totalAssignments: 3,
    averageScore: 0,
    examEligible: false,
    credits: 0,
  },
];

// AI Priority Calculation as per research paper
export function calculatePriorityScore(
  assignment: Assignment,
  subject: Subject,
  pendingAssignments: number
): PriorityScore {
  const now = new Date();
  const deadline = new Date(assignment.deadline);
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Deadline Proximity Score (0-40 points)
  // Higher score = closer deadline
  let deadlineProximity = 0;
  if (hoursUntilDeadline <= 24) {
    deadlineProximity = 40;
  } else if (hoursUntilDeadline <= 48) {
    deadlineProximity = 35;
  } else if (hoursUntilDeadline <= 72) {
    deadlineProximity = 28;
  } else if (hoursUntilDeadline <= 168) { // 1 week
    deadlineProximity = 20;
  } else {
    deadlineProximity = 10;
  }

  // Subject Difficulty Score (0-35 points)
  // Based on 1-5 difficulty scale
  const subjectDifficulty = (subject.difficulty / 5) * 35;

  // Task Volume Score (0-25 points)
  // More pending assignments = higher priority for each
  let taskVolume = 0;
  if (pendingAssignments >= 5) {
    taskVolume = 25;
  } else if (pendingAssignments >= 3) {
    taskVolume = 20;
  } else if (pendingAssignments >= 2) {
    taskVolume = 15;
  } else {
    taskVolume = 10;
  }

  const totalScore = deadlineProximity + subjectDifficulty + taskVolume;

  // Determine priority level
  let level: 'high' | 'medium' | 'low';
  if (totalScore >= 70) {
    level = 'high';
  } else if (totalScore >= 45) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    assignmentId: assignment.id,
    score: Math.round(totalScore),
    level,
    deadlineProximity,
    subjectDifficulty: Math.round(subjectDifficulty),
    taskVolume,
  };
}

export function getAssignmentPriorities(): (Assignment & { priority: PriorityScore })[] {
  const pendingAssignments = mockAssignments.filter(a => {
    const submission = mockSubmissions.find(s => s.assignmentId === a.id);
    return !submission || submission.status === 'resubmit';
  });

  return pendingAssignments.map(assignment => {
    const subject = mockSubjects.find(s => s.id === assignment.subjectId)!;
    const priority = calculatePriorityScore(assignment, subject, pendingAssignments.length);
    return { ...assignment, priority };
  }).sort((a, b) => b.priority.score - a.priority.score);
}
