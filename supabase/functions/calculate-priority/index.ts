import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Assignment {
  id: string;
  title: string;
  deadline: string;
  max_marks: number;
  late_submission_allowed: boolean;
  late_submission_penalty: number;
  subject: {
    id: string;
    name: string;
    difficulty: number;
  };
}

interface PriorityScore {
  assignment_id: string;
  score: number;
  level: "high" | "medium" | "low";
  deadline_proximity: number;
  subject_difficulty: number;
  task_volume: number;
}

function calculatePriorityScore(
  assignment: Assignment,
  pendingCount: number
): PriorityScore {
  const now = new Date();
  const deadline = new Date(assignment.deadline);
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Deadline Proximity Score (0-40 points)
  let deadlineProximity = 0;
  if (hoursUntilDeadline <= 0) {
    deadlineProximity = 40; // Overdue gets highest priority
  } else if (hoursUntilDeadline <= 24) {
    deadlineProximity = 40;
  } else if (hoursUntilDeadline <= 48) {
    deadlineProximity = 35;
  } else if (hoursUntilDeadline <= 72) {
    deadlineProximity = 28;
  } else if (hoursUntilDeadline <= 168) {
    deadlineProximity = 20;
  } else {
    deadlineProximity = 10;
  }

  // Subject Difficulty Score (0-35 points)
  const subjectDifficulty = (assignment.subject.difficulty / 5) * 35;

  // Task Volume Score (0-25 points)
  let taskVolume = 0;
  if (pendingCount >= 5) {
    taskVolume = 25;
  } else if (pendingCount >= 3) {
    taskVolume = 20;
  } else if (pendingCount >= 2) {
    taskVolume = 15;
  } else {
    taskVolume = 10;
  }

  const totalScore = deadlineProximity + subjectDifficulty + taskVolume;

  // Determine priority level
  let level: "high" | "medium" | "low";
  if (totalScore >= 70) {
    level = "high";
  } else if (totalScore >= 45) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    assignment_id: assignment.id,
    score: Math.round(totalScore),
    level,
    deadline_proximity: Math.round(deadlineProximity),
    subject_difficulty: Math.round(subjectDifficulty),
    task_volume: taskVolume,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claims?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.user.id;

    // Get student's enrolled subjects
    const { data: enrollments, error: enrollError } = await supabase
      .from("student_subjects")
      .select("subject_id")
      .eq("student_id", userId);

    if (enrollError) {
      console.error("Error fetching enrollments:", enrollError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch enrollments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ priorities: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subjectIds = enrollments.map((e) => e.subject_id);

    // Get assignments for enrolled subjects with subject details
    const { data: assignments, error: assignError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        description,
        deadline,
        max_marks,
        late_submission_allowed,
        late_submission_penalty,
        created_at,
        subject:subjects!inner (
          id,
          name,
          code,
          difficulty
        )
      `)
      .in("subject_id", subjectIds)
      .order("deadline", { ascending: true });

    if (assignError) {
      console.error("Error fetching assignments:", assignError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch assignments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get student's submissions
    const { data: submissions, error: subError } = await supabase
      .from("submissions")
      .select("assignment_id, status")
      .eq("student_id", userId);

    if (subError) {
      console.error("Error fetching submissions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch submissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter pending assignments (not submitted or needs resubmit)
    const submittedIds = new Set(
      (submissions || [])
        .filter((s) => s.status !== "resubmit")
        .map((s) => s.assignment_id)
    );

    const pendingAssignments = (assignments || []).filter(
      (a) => !submittedIds.has(a.id)
    );

    // Calculate priorities
    const priorities = pendingAssignments.map((assignment) =>
      calculatePriorityScore(assignment as unknown as Assignment, pendingAssignments.length)
    );

    // Sort by score descending
    priorities.sort((a, b) => b.score - a.score);

    // Combine with assignment data
    const result = priorities.map((priority) => {
      const assignment = pendingAssignments.find((a) => a.id === priority.assignment_id);
      return {
        ...assignment,
        priority,
      };
    });

    return new Response(
      JSON.stringify({ priorities: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
