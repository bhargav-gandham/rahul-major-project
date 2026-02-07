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

    // Build context from performance data
    const dataContext = performanceData.map((p: any) => 
      `Subject: ${p.subject}, Score: ${p.marks}/${p.max_marks} (${Math.round((p.marks/p.max_marks)*100)}%), Attendance: ${p.attendance_percentage}%, Type: ${p.assessment_type}, Term: ${p.term}`
    ).join("\n");

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "teacher") {
      systemPrompt = `You are an educational analytics AI. Analyze student performance data and provide structured insights for teachers. Always respond in valid JSON with these fields:
- descriptive: What happened to this student's performance (2-3 sentences)
- diagnostic: Why it happened - identify root causes (2-3 sentences)
- predictive: What is likely to happen next based on trends (2-3 sentences)
- prescriptive: Specific actionable recommendations for the teacher (2-3 sentences)
- keyFactors: Array of {factor: string, impact: "positive"|"negative"|"neutral"} showing what influences performance
- recommendations: Array of {type: string, action: string, reasoning: string} with specific interventions`;

      userPrompt = `Analyze this student's academic performance data:\n\n${dataContext}\n\nProvide multi-level analytics in JSON format.`;
    } else if (mode === "student") {
      systemPrompt = `You are a friendly academic advisor helping a student understand their performance. Use simple, encouraging language - avoid technical jargon. Respond in valid JSON with:
- summary: A friendly 2-3 sentence overview of how they're doing
- strengths: What they're doing well (2 sentences)
- improvements: Areas to work on, framed positively (2 sentences)
- prediction: What to expect if they continue this way (1-2 sentences)
- keyFactors: Array of {factor: string, impact: "helping"|"needs attention"} showing what's influencing their grades`;

      userPrompt = `Here's a student's performance data. Give them easy-to-understand insights:\n\n${dataContext}\n\nRespond in JSON format with simple, encouraging language.`;
    } else if (mode === "weekly-plan") {
      systemPrompt = `You are an academic planner AI. Create a personalized weekly improvement plan for a student based on their performance data. Use simple, actionable language. Respond in valid JSON with:
- planContent: A detailed weekly plan (5-7 bullet points) with specific daily/weekly actions the student should take. Include time estimates.
- focusAreas: Array of strings listing 2-4 subjects or skills to focus on this week`;

      userPrompt = `Based on this student's performance data, create a personalized weekly improvement plan:\n\n${dataContext}\n\nFocus on their weakest areas while maintaining strengths. Be specific and actionable.`;
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
      // Try to extract JSON from markdown code blocks or raw JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1]?.trim() || content.trim());
    } catch {
      // If parsing fails, return raw content
      parsed = { summary: content, planContent: content, plan: content };
    }

    // For teacher mode, also save recommendations
    if (mode === "teacher" && parsed.recommendations && studentId) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // Get teacher_id from the auth token
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        // Decode JWT to get user ID
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
