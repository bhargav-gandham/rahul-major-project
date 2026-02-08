import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { performanceData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!performanceData || performanceData.length === 0) {
      return new Response(JSON.stringify({ error: "No performance data provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by student
    const studentMap: Record<string, any[]> = {};
    performanceData.forEach((p: any) => {
      const key = p.student_id;
      if (!studentMap[key]) studentMap[key] = [];
      studentMap[key].push(p);
    });

    const dataContext = Object.entries(studentMap).map(([sid, records]) => {
      const name = records[0].student_name || sid.slice(0, 8);
      const lines = records.map((p: any) => {
        const parts: string[] = [`Subject: ${p.subject}`];
        if (p.marks != null) parts.push(`Score: ${p.marks}/${p.max_marks}`);
        if (p.mid_exam_score != null) parts.push(`Mid: ${p.mid_exam_score}/${p.mid_exam_total}`);
        if (p.semester_score != null) parts.push(`Sem: ${p.semester_score}/${p.semester_total}`);
        if (p.assignment_score != null) parts.push(`Assign: ${p.assignment_score}/${p.assignment_total}`);
        if (p.lab_score != null) parts.push(`Lab: ${p.lab_score}/${p.lab_total}`);
        if (p.internal_marks != null) parts.push(`Internal: ${p.internal_marks}/${p.internal_total}`);
        if (p.attendance_percentage != null) parts.push(`Attendance: ${p.attendance_percentage}%`);
        if (p.term) parts.push(`Term: ${p.term}`);
        return parts.join(", ");
      });
      return `Student: ${name} (${sid})\n${lines.join("\n")}`;
    }).join("\n\n");

    const systemPrompt = `You are an educational data scientist specializing in student dropout prediction. Analyze student academic data to identify dropout risk using multiple behavioral and academic indicators.

Dropout risk factors include:
- Chronically low attendance (<60%)
- Declining score trajectories across terms
- Failing multiple subjects simultaneously
- Very low assignment submission/scores
- Large gap between lab/practical and theory scores (disengagement)
- Consistently below-average performance with no improvement
- Poor internal marks indicating lack of continuous assessment engagement

Classify each student into a risk tier:
- critical (>75% dropout probability): Multiple severe risk factors present
- high (50-75%): Several concerning patterns
- moderate (25-50%): Some warning signs
- low (<25%): Generally stable with minor concerns
- minimal (<10%): Strong academic standing

Provide specific, data-backed evidence for each prediction.`;

    const userPrompt = `Analyze this class data for dropout risk:\n\n${dataContext}`;

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
              name: "provide_dropout_predictions",
              description: "Return dropout risk predictions for each student with evidence and interventions",
              parameters: {
                type: "object",
                properties: {
                  class_summary: {
                    type: "object",
                    properties: {
                      total_students: { type: "number" },
                      critical_count: { type: "number" },
                      high_count: { type: "number" },
                      moderate_count: { type: "number" },
                      low_count: { type: "number" },
                      minimal_count: { type: "number" },
                      overall_dropout_risk_percent: { type: "number", description: "Estimated % of class at serious dropout risk (critical+high)" },
                      primary_risk_pattern: { type: "string", description: "The most common dropout risk pattern in this class" }
                    },
                    required: ["total_students", "critical_count", "high_count", "moderate_count", "low_count", "minimal_count", "overall_dropout_risk_percent", "primary_risk_pattern"],
                    additionalProperties: false
                  },
                  student_predictions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        student_id: { type: "string" },
                        student_name: { type: "string" },
                        risk_tier: { type: "string", enum: ["critical", "high", "moderate", "low", "minimal"] },
                        dropout_probability: { type: "number", description: "0-100 percentage" },
                        risk_trend: { type: "string", enum: ["increasing", "stable", "decreasing"], description: "Is risk getting worse or better" },
                        risk_factors: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              factor: { type: "string" },
                              severity: { type: "string", enum: ["critical", "warning", "minor"] },
                              detail: { type: "string", description: "Specific data-backed detail" }
                            },
                            required: ["factor", "severity", "detail"],
                            additionalProperties: false
                          }
                        },
                        protective_factors: {
                          type: "array",
                          description: "Positive factors reducing dropout risk",
                          items: { type: "string" }
                        },
                        recommended_actions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              action: { type: "string" },
                              urgency: { type: "string", enum: ["immediate", "this_week", "this_month"] },
                              expected_impact: { type: "string" }
                            },
                            required: ["action", "urgency", "expected_impact"],
                            additionalProperties: false
                          }
                        },
                        early_warning_signals: {
                          type: "array",
                          description: "Specific signals to watch for further deterioration",
                          items: { type: "string" }
                        }
                      },
                      required: ["student_id", "student_name", "risk_tier", "dropout_probability", "risk_trend", "risk_factors", "protective_factors", "recommended_actions", "early_warning_signals"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["class_summary", "student_predictions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_dropout_predictions" } },
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
      throw new Error("Dropout prediction service unavailable");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      const content = aiResponse.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        const parsed = JSON.parse(jsonMatch[1]?.trim() || content.trim());
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        throw new Error("Failed to parse AI response");
      }
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dropout-prediction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
