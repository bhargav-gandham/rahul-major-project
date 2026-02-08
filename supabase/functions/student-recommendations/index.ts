import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { performanceData, goals } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!performanceData || performanceData.length === 0) {
      return new Response(JSON.stringify({ error: "No performance data provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataLines = performanceData.map((p: any) => {
      const parts: string[] = [`Subject: ${p.subject}`];
      if (p.marks != null) parts.push(`Score: ${p.marks}/${p.max_marks} (${Math.round((p.marks / p.max_marks) * 100)}%)`);
      if (p.mid_exam_score != null) parts.push(`Mid Exam: ${p.mid_exam_score}/${p.mid_exam_total}`);
      if (p.semester_score != null) parts.push(`Semester: ${p.semester_score}/${p.semester_total}`);
      if (p.assignment_score != null) parts.push(`Assignments: ${p.assignment_score}/${p.assignment_total}`);
      if (p.lab_score != null) parts.push(`Lab: ${p.lab_score}/${p.lab_total}`);
      if (p.internal_marks != null) parts.push(`Internals: ${p.internal_marks}/${p.internal_total}`);
      if (p.attendance_percentage != null) parts.push(`Attendance: ${p.attendance_percentage}%`);
      if (p.term) parts.push(`Term: ${p.term}`);
      return parts.join(", ");
    }).join("\n");

    const goalsContext = goals && goals.length > 0
      ? `\n\nStudent's Goals:\n${goals.map((g: any) => `- ${g.subject}: Target ${g.target_score}% by ${g.target_date || 'no deadline'}`).join("\n")}`
      : "";

    const systemPrompt = `You are a friendly, encouraging academic advisor creating personalized improvement recommendations for a student. Analyze their performance data across all assessment types and provide specific, actionable recommendations.

Be warm, specific, and data-driven. Reference actual scores and patterns. Prioritize the weakest areas but also acknowledge strengths. Each recommendation should be concrete — not generic advice.`;

    const userPrompt = `Here is a student's complete academic performance:\n\n${dataLines}${goalsContext}\n\nProvide personalized improvement recommendations.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "provide_recommendations",
              description: "Return personalized improvement recommendations for the student",
              parameters: {
                type: "object",
                properties: {
                  overall_assessment: {
                    type: "object",
                    properties: {
                      summary: { type: "string", description: "2-3 sentence encouraging summary of current standing" },
                      current_level: { type: "string", enum: ["excellent", "good", "average", "needs_improvement", "critical"] },
                      overall_score_estimate: { type: "number", description: "Estimated overall percentage" },
                      trend: { type: "string", enum: ["improving", "stable", "declining"] }
                    },
                    required: ["summary", "current_level", "overall_score_estimate", "trend"],
                    additionalProperties: false
                  },
                  subject_analysis: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        current_score: { type: "number" },
                        status: { type: "string", enum: ["strong", "moderate", "weak", "critical"] },
                        strongest_area: { type: "string", description: "Which assessment type they do best in" },
                        weakest_area: { type: "string", description: "Which assessment type needs most work" },
                        specific_recommendation: { type: "string", description: "Concrete, actionable recommendation for this subject" }
                      },
                      required: ["subject", "current_score", "status", "strongest_area", "weakest_area", "specific_recommendation"],
                      additionalProperties: false
                    }
                  },
                  priority_actions: {
                    type: "array",
                    description: "Top 5 prioritized actions the student should take, ordered by impact",
                    items: {
                      type: "object",
                      properties: {
                        priority: { type: "number", description: "1-5 ranking" },
                        action: { type: "string", description: "Specific actionable step" },
                        reason: { type: "string", description: "Why this matters, referencing their data" },
                        expected_improvement: { type: "string", description: "What improvement to expect" },
                        timeframe: { type: "string", description: "How long to see results" },
                        category: { type: "string", enum: ["attendance", "study_habits", "exam_preparation", "assignments", "lab_work", "time_management", "revision"] }
                      },
                      required: ["priority", "action", "reason", "expected_improvement", "timeframe", "category"],
                      additionalProperties: false
                    }
                  },
                  study_strategy: {
                    type: "object",
                    properties: {
                      daily_plan: { type: "string", description: "Suggested daily study routine" },
                      weekly_focus: { type: "string", description: "What to focus on each week" },
                      exam_prep_tips: { type: "array", items: { type: "string" }, description: "3-4 specific exam preparation tips" },
                      resources_suggestion: { type: "string", description: "Types of resources to use" }
                    },
                    required: ["daily_plan", "weekly_focus", "exam_prep_tips", "resources_suggestion"],
                    additionalProperties: false
                  },
                  motivational_note: { type: "string", description: "An encouraging, personalized closing message" }
                },
                required: ["overall_assessment", "subject_analysis", "priority_actions", "study_strategy", "motivational_note"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("Recommendation service unavailable");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      const content = aiResponse.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        return new Response(JSON.stringify(JSON.parse(jsonMatch[1]?.trim() || content.trim())), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        throw new Error("Failed to parse AI response");
      }
    }

    return new Response(JSON.stringify(JSON.parse(toolCall.function.arguments)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("student-recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
