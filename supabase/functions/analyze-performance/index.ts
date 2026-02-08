import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { studentId, performanceData, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("API key not configured");

    if (!performanceData || performanceData.length === 0) {
      return new Response(JSON.stringify({ error: "No performance data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build rich context from performance data including all available metrics
    const dataContext = performanceData.map((p: any) => {
      const parts: string[] = [`Subject: ${p.subject}`];
      
      if (p.student_name) parts.push(`Student: ${p.student_name}`);
      if (p.marks != null) parts.push(`Overall Score: ${p.marks}/${p.max_marks} (${Math.round((p.marks/p.max_marks)*100)}%)`);
      if (p.mid_exam_score != null) parts.push(`Mid Exam: ${p.mid_exam_score}/${p.mid_exam_total}`);
      if (p.semester_score != null) parts.push(`Semester Exam: ${p.semester_score}/${p.semester_total}`);
      if (p.assignment_score != null) parts.push(`Assignments: ${p.assignment_score}/${p.assignment_total}`);
      if (p.lab_score != null) parts.push(`Lab: ${p.lab_score}/${p.lab_total}`);
      if (p.internal_marks != null) parts.push(`Internals: ${p.internal_marks}/${p.internal_total}`);
      if (p.attendance_percentage != null) parts.push(`Attendance: ${p.attendance_percentage}%`);
      if (p.assessment_type) parts.push(`Type: ${p.assessment_type}`);
      if (p.term) parts.push(`Term: ${p.term}`);
      if (p.notes) parts.push(`Notes: ${p.notes}`);
      
      return parts.join(", ");
    }).join("\n");

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "teacher") {
      systemPrompt = `You are an educational analytics AI. Analyze student performance data comprehensively — including semester results, mid exams, assignments, lab scores, internals, and attendance. Provide structured insights for teachers. Always respond in valid JSON with these fields:
- descriptive: What happened to this student's performance across all assessments (3-4 sentences)
- diagnostic: Why it happened — identify root causes from patterns in attendance, assignments, exams, labs (3-4 sentences)
- predictive: What is likely to happen next based on trends across all metrics (2-3 sentences)
- prescriptive: Specific actionable recommendations for the teacher based on weakness areas (3-4 sentences)
- keyFactors: Array of {factor: string, impact: "positive"|"negative"|"neutral"} showing what influences performance (include attendance, assignment consistency, exam trends, lab performance)
- recommendations: Array of {type: string, action: string, reasoning: string} with specific interventions like remedial classes, extra practice, mentoring, attendance improvement`;

      userPrompt = `Analyze this student's complete academic performance data:\n\n${dataContext}\n\nProvide multi-level analytics in JSON format. Consider all available metrics: semester scores, mid exams, assignments, labs, internals, and attendance patterns.`;
    } else if (mode === "student") {
      systemPrompt = `You are a friendly academic advisor helping a student understand their performance across all subjects and assessment types. Use simple, encouraging language — no jargon. Respond in valid JSON with:
- summary: A friendly 3-4 sentence overview of how they're doing across semester exams, mid exams, assignments, labs, and attendance
- strengths: What they're doing well — be specific about which subjects and assessment types (2-3 sentences)
- improvements: Areas to work on, framed positively with specific suggestions (2-3 sentences)
- prediction: What to expect if they continue this way (1-2 sentences)
- keyFactors: Array of {factor: string, impact: "helping"|"needs attention"} showing what's influencing their grades (attendance, assignment submission, exam preparation, lab work etc.)
- actionItems: Array of 3-5 simple, specific things they can do this week to improve`;

      userPrompt = `Here's a student's complete performance data including exams, assignments, labs, and attendance. Give them easy-to-understand insights:\n\n${dataContext}\n\nRespond in JSON format with simple, encouraging language.`;
    } else if (mode === "weekly-plan") {
      systemPrompt = `You are an academic planner AI. Create a personalized weekly improvement plan based on the student's complete academic data including semester results, mid exams, assignments, labs, and attendance. Use simple, actionable language. Respond in valid JSON with:
- planContent: A detailed weekly plan (6-8 bullet points) with specific daily actions. Include time estimates. Address weakest areas first — low assignment scores mean more practice, low attendance means commitment plan, low exam scores mean revision strategy.
- focusAreas: Array of strings listing 3-5 specific subjects or skills to focus on this week
- dailySchedule: Object with keys "day1" through "day7", each containing a short 1-2 sentence plan for that day. Use "day1", "day2", etc. as keys.`;

      userPrompt = `Based on this student's complete academic data, create a personalized weekly improvement plan:\n\n${dataContext}\n\nFocus on their weakest areas (low scores in exams, poor attendance, missing assignments) while maintaining strengths. Be specific and actionable.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error("AI analysis failed");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1]?.trim() || content.trim());
    } catch {
      parsed = { summary: content, planContent: content, plan: content };
    }

    // For teacher mode, also save recommendations
    if (mode === "teacher" && parsed.recommendations && studentId) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        try {
          const token = authHeader.replace("Bearer ", "");
          const payload = JSON.parse(atob(token.split(".")[1]));
          const teacherId = payload.sub;

          for (const rec of parsed.recommendations) {
            await fetch(`${SUPABASE_URL}/rest/v1/teacher_recommendations`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                student_id: studentId,
                teacher_id: teacherId,
                recommendation: rec.action || rec.recommendation || "",
                intervention_type: rec.type || "general",
                ai_reasoning: rec.reasoning || "",
                status: "pending",
              }),
            });
          }
        } catch (e) {
          console.error("Failed to save recommendations:", e);
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-performance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
