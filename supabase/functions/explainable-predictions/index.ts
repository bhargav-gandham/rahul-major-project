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

    // Build data context
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

    const systemPrompt = `You are an educational data scientist specializing in explainable AI for academic performance prediction. Analyze the provided class performance data and produce transparent, evidence-based predictions.

For EACH student, calculate which factors most strongly influence their predicted outcome. Use the actual data to derive feature importance weights (they must sum to 100 for each student).

The factors to evaluate are:
- attendance: Attendance percentage impact
- mid_exam: Mid-term exam performance impact
- semester_exam: Semester exam performance impact  
- assignments: Assignment completion and scores impact
- lab_performance: Lab scores impact
- internal_marks: Internal assessment impact
- consistency: Score consistency across subjects (low variance = positive)

Also provide:
- An overall class-level feature importance showing which factors matter most across ALL students
- Risk predictions with confidence levels
- Specific evidence citations from the data to justify each prediction`;

    const userPrompt = `Analyze this class data and provide explainable predictions:\n\n${dataContext}`;

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
              name: "provide_explainable_predictions",
              description: "Return explainable predictions with feature importance for each student and the class overall",
              parameters: {
                type: "object",
                properties: {
                  class_feature_importance: {
                    type: "array",
                    description: "Overall class-level feature importance weights",
                    items: {
                      type: "object",
                      properties: {
                        factor: { type: "string", enum: ["attendance", "mid_exam", "semester_exam", "assignments", "lab_performance", "internal_marks", "consistency"] },
                        weight: { type: "number", description: "Importance weight 0-100, all must sum to 100" },
                        direction: { type: "string", enum: ["positive", "negative", "mixed"] },
                        explanation: { type: "string", description: "Why this factor has this weight, citing data patterns" }
                      },
                      required: ["factor", "weight", "direction", "explanation"],
                      additionalProperties: false
                    }
                  },
                  student_predictions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        student_id: { type: "string" },
                        student_name: { type: "string" },
                        predicted_outcome: { type: "string", enum: ["excellent", "good", "average", "at_risk", "critical"] },
                        confidence: { type: "number", description: "Prediction confidence 0-100" },
                        predicted_score_range: { type: "string", description: "e.g. 75-85%" },
                        feature_importance: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              factor: { type: "string" },
                              weight: { type: "number" },
                              actual_value: { type: "string", description: "The actual data value for this factor" },
                              impact: { type: "string", enum: ["strongly_positive", "positive", "neutral", "negative", "strongly_negative"] }
                            },
                            required: ["factor", "weight", "actual_value", "impact"],
                            additionalProperties: false
                          }
                        },
                        key_evidence: {
                          type: "array",
                          description: "Specific data points justifying the prediction",
                          items: { type: "string" }
                        },
                        risk_factors: {
                          type: "array",
                          items: { type: "string" }
                        },
                        recommended_interventions: {
                          type: "array",
                          items: { type: "string" }
                        }
                      },
                      required: ["student_id", "student_name", "predicted_outcome", "confidence", "predicted_score_range", "feature_importance", "key_evidence", "risk_factors", "recommended_interventions"],
                      additionalProperties: false
                    }
                  },
                  overall_insights: {
                    type: "object",
                    properties: {
                      strongest_predictor: { type: "string", description: "The single most predictive factor" },
                      class_risk_summary: { type: "string", description: "1-2 sentence summary of class risk" },
                      data_quality_note: { type: "string", description: "Any data gaps or quality concerns" }
                    },
                    required: ["strongest_predictor", "class_risk_summary", "data_quality_note"],
                    additionalProperties: false
                  }
                },
                required: ["class_feature_importance", "student_predictions", "overall_insights"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_explainable_predictions" } },
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
      throw new Error("AI analysis service unavailable");
    }

    const aiResponse = await response.json();
    
    // Extract tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Fallback: try parsing content directly
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
    console.error("explainable-predictions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
