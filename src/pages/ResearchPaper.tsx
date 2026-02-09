import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ResearchPaper() {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .paper-container { 
            max-width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-background/95 backdrop-blur border-b px-6 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={handleDownload} size="sm">
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
      </div>

      <div className="min-h-screen bg-muted/30 pt-16 pb-12 px-4">
        <article className="paper-container max-w-4xl mx-auto bg-background shadow-lg rounded-lg p-8 md:p-12 prose prose-slate dark:prose-invert max-w-none">
          
          <h1 className="text-center text-2xl md:text-3xl font-bold leading-tight mb-2">
            EduFlow: An Analytics-Driven Student Performance Improvement Platform Using Explainable AI
          </h1>
          <p className="text-center text-muted-foreground text-sm mb-8">February 2026</p>

          <hr />

          <h2>Abstract</h2>
          <p>
            Student academic underperformance and dropout remain persistent challenges in higher education institutions. Traditional intervention approaches are reactive, relying on end-of-semester evaluations that arrive too late for meaningful corrective action. This paper presents <strong>EduFlow</strong>, a web-based analytics platform that transforms raw academic data — including semester results, mid-term examinations, assignments, lab scores, internal assessments, and attendance records — into actionable, explainable insights for both faculty and students. The platform employs a four-tier analytics framework (descriptive, diagnostic, predictive, and prescriptive) powered by large language models (LLMs) with structured output generation. Key contributions include: (1) an explainable AI module that transparently quantifies feature importance weights driving performance predictions, (2) a personalized student recommendation engine producing impact-ranked intervention strategies, (3) a comparative analytics dashboard enabling class-wide benchmarking, and (4) a gamified weekly improvement planner with streak-based engagement tracking. The system architecture leverages a modern serverless stack (React, Supabase Edge Functions, PostgreSQL with Row-Level Security) ensuring data privacy and role-based access control.
          </p>
          <p><strong>Keywords:</strong> Learning Analytics, Explainable AI, Student Performance Prediction, Educational Data Mining, Prescriptive Analytics, Gamification</p>

          <hr />

          <h2>1. Introduction</h2>

          <h3>1.1 Background</h3>
          <p>
            The global expansion of higher education has introduced significant challenges in maintaining academic quality and student retention. UNESCO reports that dropout rates in developing nations exceed 40% in certain disciplines, often driven by factors identifiable well before a student formally withdraws (UNESCO, 2023). Traditional academic monitoring relies heavily on summative assessments — final examinations and end-of-term grade sheets — which offer limited diagnostic value and arrive too late for preventive intervention.
          </p>
          <p>
            Learning Analytics (LA), defined as "the measurement, collection, analysis, and reporting of data about learners and their contexts" (Siemens &amp; Long, 2011), has emerged as a transformative paradigm. However, existing LA platforms suffer from three critical shortcomings:
          </p>
          <ol>
            <li><strong>Opacity of predictions:</strong> Machine learning models used for dropout prediction or performance forecasting operate as black boxes, providing predictions without justification (Khosravi et al., 2022).</li>
            <li><strong>Teacher-centric design:</strong> Most platforms serve administrators and faculty while neglecting the student as an active stakeholder in their own improvement (Jivet et al., 2018).</li>
            <li><strong>Reactive rather than prescriptive:</strong> Systems describe what happened but rarely prescribe what to do next with sufficient specificity.</li>
          </ol>

          <h3>1.2 Problem Statement</h3>
          <p>
            How can an educational analytics platform provide <strong>transparent, evidence-based, and actionable</strong> insights to both teachers and students, enabling proactive intervention while maintaining explainability and data privacy?
          </p>

          <h3>1.3 Objectives</h3>
          <ol>
            <li>Design and implement a multi-role analytics platform serving faculty and students with differentiated interfaces and insights.</li>
            <li>Develop an explainable AI module that quantifies the contribution of individual academic factors to performance predictions.</li>
            <li>Create a personalized recommendation engine that produces impact-ranked, subject-specific improvement strategies for students.</li>
            <li>Implement gamification mechanisms (streak tracking, daily task completion) to sustain student engagement with improvement plans.</li>
            <li>Ensure data privacy through row-level security policies and role-based access control.</li>
          </ol>

          <h3>1.4 Scope</h3>
          <p>
            EduFlow targets undergraduate programs where academic performance is assessed through multiple instruments: semester examinations, mid-term tests, laboratory evaluations, assignment submissions, internal assessments, and attendance tracking.
          </p>

          <hr />

          <h2>2. Literature Review</h2>

          <h3>2.1 Learning Analytics in Higher Education</h3>
          <p>
            The field of learning analytics has evolved from simple grade reporting to sophisticated predictive modeling. Early work by Campbell et al. (2007) established the "signals" framework, where traffic-light indicators warned students of poor performance. Subsequent systems like Purdue's Course Signals (Arnold &amp; Pistilli, 2012) demonstrated measurable improvements in student retention, with at-risk students showing 21% higher course completion rates when provided with early warnings.
          </p>
          <p>
            However, meta-analyses reveal that the effectiveness of LA interventions depends critically on <strong>actionability</strong> — whether the system provides specific guidance beyond mere alerts (Viberg et al., 2018). EduFlow addresses this gap through prescriptive analytics that generate concrete, time-bound action items.
          </p>

          <h3>2.2 Explainable AI in Education</h3>
          <p>
            The adoption of complex ML models (random forests, neural networks) for student performance prediction has improved accuracy but introduced the "black box problem" (Arrieta et al., 2020). EduFlow takes a different approach: rather than training a black-box model and explaining it post-hoc, the platform uses LLMs with structured output schemas to produce <strong>inherently interpretable predictions</strong>. The AI is instructed to cite specific data points justifying each prediction, producing explanations that are natively human-readable.
          </p>

          <h3>2.3 Multi-Dimensional Performance Assessment</h3>
          <p>
            Research consistently shows that academic performance is multi-factorial. Attendance alone explains 15–25% of grade variance (Credé et al., 2010), while assignment completion patterns, laboratory engagement, and internal assessment consistency contribute independently (Richardson et al., 2012). EduFlow's data model captures six distinct assessment dimensions, enabling granular factor analysis.
          </p>

          <h3>2.4 Gamification in Education</h3>
          <p>
            Gamification — the application of game design elements in non-game contexts — has shown positive effects on student engagement (Hamari et al., 2014). Streak mechanics, borrowed from platforms like Duolingo, leverage loss aversion and consistency bias to encourage daily engagement (Deterding et al., 2011). EduFlow incorporates streak tracking within weekly improvement plans to sustain student commitment to prescribed interventions.
          </p>

          <hr />

          <h2>3. System Architecture</h2>

          <h3>3.1 Technology Stack</h3>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Layer</th><th>Technology</th><th>Justification</th></tr>
              </thead>
              <tbody>
                <tr><td>Frontend</td><td>React 18 + TypeScript</td><td>Component-based UI with type safety</td></tr>
                <tr><td>Styling</td><td>Tailwind CSS + shadcn/ui</td><td>Design system with semantic tokens</td></tr>
                <tr><td>State Management</td><td>TanStack React Query</td><td>Server state synchronization with caching</td></tr>
                <tr><td>Database</td><td>PostgreSQL</td><td>ACID compliance, JSONB support, RLS</td></tr>
                <tr><td>Backend Functions</td><td>Edge Functions (Deno)</td><td>Serverless, auto-scaling compute</td></tr>
                <tr><td>AI Gateway</td><td>Gemini 3 Flash Preview</td><td>Structured output, tool-calling support</td></tr>
                <tr><td>Authentication</td><td>Email-based Auth</td><td>Role assignment on signup</td></tr>
                <tr><td>Data Visualization</td><td>Recharts</td><td>Composable chart components</td></tr>
              </tbody>
            </table>
          </div>

          <h3>3.2 Data Model</h3>
          <p>
            The platform's relational schema centers on the <code>student_performance</code> table, which captures multi-dimensional assessment data across six assessment types: semester examinations, mid-term tests, assignments, laboratory evaluations, internal assessments, and attendance records. Supporting tables include <code>profiles</code>, <code>user_roles</code>, <code>student_goals</code>, <code>weekly_plans</code>, and <code>teacher_recommendations</code>.
          </p>

          <h3>3.3 Security Architecture</h3>
          <p>
            Data privacy is enforced at the database level through PostgreSQL Row-Level Security (RLS). Faculty can only access performance records they created. Students can only view their own data. Cross-role isolation prevents unauthorized access. Edge functions use service-role keys only for AI-generated recommendation storage, never exposed to the client.
          </p>

          <hr />

          <h2>4. Methodology</h2>

          <h3>4.1 Analytics Framework</h3>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Tier</th><th>Question</th><th>Implementation</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>Descriptive</strong></td><td>What happened?</td><td>Performance summaries, score distributions, attendance trends</td></tr>
                <tr><td><strong>Diagnostic</strong></td><td>Why did it happen?</td><td>Factor analysis identifying root causes</td></tr>
                <tr><td><strong>Predictive</strong></td><td>What will happen?</td><td>AI-generated outcome predictions with confidence levels</td></tr>
                <tr><td><strong>Prescriptive</strong></td><td>What should we do?</td><td>Ranked intervention recommendations with expected impact</td></tr>
              </tbody>
            </table>
          </div>

          <h3>4.2 Explainable AI Approach</h3>
          <p>
            Rather than using traditional ML pipelines, EduFlow leverages the analytical reasoning capabilities of large language models through a structured output protocol:
          </p>
          <ol>
            <li><strong>Data Serialization:</strong> Performance records are serialized into natural language descriptions preserving all numerical context.</li>
            <li><strong>Structured Tool Calling:</strong> The LLM is provided with a JSON schema defining the exact output structure, including per-student feature importance weights that must sum to 100.</li>
            <li><strong>Evidence Grounding:</strong> The schema requires key_evidence arrays citing specific data points from the input.</li>
            <li><strong>Confidence Calibration:</strong> Each prediction includes a confidence score (0–100) reflecting data completeness and pattern clarity.</li>
          </ol>
          <p>The seven factors evaluated are: Attendance, Mid-term examination, Semester examination, Assignments, Lab performance, Internal marks, and Consistency (cross-subject score variance).</p>

          <h3>4.3 Personalized Recommendation Engine</h3>
          <p>
            The student-facing recommendation system aggregates all performance records and active goals, constructs rich context with percentage calculations and goal comparisons, then produces structured output containing overall assessment, subject-wise analysis, priority actions ranked by expected impact, and study strategies.
          </p>

          <h3>4.4 Gamification: Streak Mechanics</h3>
          <p>
            The weekly plan module implements a streak-tracking system where completing Day 1 tasks initiates a streak, each subsequent consecutive day increments it, and breaking the sequence resets the count. Streak milestones (3, 5, 7 days) trigger celebratory notifications. Historical streaks from past weekly plans are aggregated for long-term motivation.
          </p>

          <hr />

          <h2>5. Implementation</h2>

          <h3>5.1 Teacher Module Features</h3>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Feature</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td>Upload Data</td><td>CSV upload and manual form entry for student performance records</td></tr>
                <tr><td>Student Analytics</td><td>Individual student deep-dive with four-tier analysis</td></tr>
                <tr><td>Comparative Analytics</td><td>Class-wide benchmarking, top improvers, and urgent intervention flags</td></tr>
                <tr><td>Explainable AI Dashboard</td><td>Visual feature importance charts showing prediction drivers</td></tr>
                <tr><td>Dropout Prediction</td><td>Risk classification with confidence scores</td></tr>
                <tr><td>Manage Students</td><td>Student roster management with account creation</td></tr>
              </tbody>
            </table>
          </div>

          <h3>5.2 Student Module Features</h3>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Feature</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td>Dashboard</td><td>Performance overview with key metrics</td></tr>
                <tr><td>Goal Tracker</td><td>Subject-specific target setting with progress monitoring</td></tr>
                <tr><td>Weekly Plan</td><td>AI-generated 7-day improvement schedule with day-wise tasks</td></tr>
                <tr><td>Streak Tracking</td><td>Consecutive day completion counter with milestone celebrations</td></tr>
                <tr><td>AI Tutor</td><td>Conversational AI for academic queries</td></tr>
                <tr><td>Personalized Recommendations</td><td>Impact-ranked improvement actions with study strategies</td></tr>
              </tbody>
            </table>
          </div>

          <h3>5.3 AI Edge Functions</h3>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Function</th><th>Purpose</th><th>Output</th></tr></thead>
              <tbody>
                <tr><td>analyze-performance</td><td>Multi-mode analytics (teacher/student/weekly-plan)</td><td>Structured analytics JSON</td></tr>
                <tr><td>student-recommendations</td><td>Personalized improvement plan</td><td>Priority actions, subject analysis</td></tr>
                <tr><td>explainable-predictions</td><td>Class-wide explainable AI</td><td>Feature importance weights, per-student predictions</td></tr>
                <tr><td>dropout-prediction</td><td>Risk assessment</td><td>Risk levels, contributing factors</td></tr>
                <tr><td>ai-tutor</td><td>Conversational academic help</td><td>Contextual guidance</td></tr>
              </tbody>
            </table>
          </div>

          <hr />

          <h2>6. Results and Discussion</h2>

          <h3>6.1 Explainability</h3>
          <p>
            The explainable AI module successfully decomposes predictions into interpretable factor weights. Each weight is accompanied by a natural language explanation citing specific data patterns, enabling faculty to understand <em>why</em> the model considers certain factors more predictive than others for a given cohort.
          </p>

          <h3>6.2 Intervention Specificity</h3>
          <p>
            Unlike generic recommendations ("study harder"), EduFlow's prescriptive engine produces time-bound, subject-specific actions. For example: <em>"Increase Data Structures lab attendance from 65% to 85% over the next 3 weeks. Expected impact: HIGH."</em>
          </p>

          <h3>6.3 Student Engagement via Gamification</h3>
          <p>
            The streak mechanism addresses dashboard abandonment by requiring daily interaction with the weekly plan. The JSONB storage of completed_days enables historical streak analysis, providing longitudinal engagement metrics.
          </p>

          <h3>6.4 Limitations</h3>
          <ol>
            <li><strong>LLM Variability:</strong> Analytical quality varies with prompt complexity and data volume.</li>
            <li><strong>Ground Truth Absence:</strong> Without historical outcome data, the system cannot validate prediction accuracy in a traditional ML sense.</li>
            <li><strong>Cold Start Problem:</strong> Students with minimal records receive less nuanced recommendations.</li>
            <li><strong>Single-Institution Design:</strong> The current data model assumes a specific assessment structure.</li>
          </ol>

          <hr />

          <h2>7. Comparison with Existing Systems</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Feature</th><th>Course Signals</th><th>OASIS</th><th>Brightspace</th><th><strong>EduFlow</strong></th></tr>
              </thead>
              <tbody>
                <tr><td>Explainability</td><td>Traffic lights</td><td>Statistical</td><td>Limited</td><td><strong>Full factor decomposition</strong></td></tr>
                <tr><td>Student Insights</td><td>Minimal</td><td>Dashboard</td><td>Basic</td><td><strong>Personalized recommendations</strong></td></tr>
                <tr><td>Prescriptive</td><td>No</td><td>No</td><td>Partial</td><td><strong>Impact-ranked actions</strong></td></tr>
                <tr><td>Multi-Assessment</td><td>GPA-based</td><td>LMS activity</td><td>LMS activity</td><td><strong>6 assessment types</strong></td></tr>
                <tr><td>Gamification</td><td>No</td><td>No</td><td>No</td><td><strong>Streak tracking</strong></td></tr>
                <tr><td>Data Privacy</td><td>Institutional</td><td>Varies</td><td>Vendor</td><td><strong>Row-level security</strong></td></tr>
              </tbody>
            </table>
          </div>

          <hr />

          <h2>8. Future Work</h2>
          <ol>
            <li><strong>Longitudinal Validation:</strong> Deploy across multiple semesters to validate predictive accuracy against actual outcomes.</li>
            <li><strong>Peer Benchmarking:</strong> Anonymous class-percentile positioning for contextual performance awareness.</li>
            <li><strong>Parent Portal:</strong> Extend role-based access to include parent/guardian dashboards.</li>
            <li><strong>Natural Language Querying:</strong> Allow teachers to ask questions in natural language with AI-generated visualizations.</li>
            <li><strong>Multi-Institution Adaptation:</strong> Parameterize the assessment schema for diverse grading structures.</li>
            <li><strong>Mobile Application:</strong> Develop a PWA for push notifications on streak reminders and performance alerts.</li>
          </ol>

          <hr />

          <h2>9. Conclusion</h2>
          <p>
            EduFlow demonstrates that modern web technologies combined with large language models can deliver <strong>transparent, actionable, and personalized</strong> educational analytics without requiring data science expertise from end users. By shifting from black-box predictions to inherently explainable AI outputs, the platform builds trust among faculty and students alike. The four-tier analytics framework ensures that insights progress from observation to action, while gamification mechanics sustain student engagement with improvement plans. The platform's serverless architecture, role-based security model, and structured AI output protocol provide a replicable blueprint for institutions seeking to implement evidence-based, privacy-preserving learning analytics at scale.
          </p>

          <hr />

          <h2>References</h2>
          <ol className="text-sm">
            <li>Arnold, K. E., &amp; Pistilli, M. D. (2012). Course Signals at Purdue: Using learning analytics to increase student success. <em>Proceedings of the 2nd International Conference on Learning Analytics and Knowledge</em>, 267–270.</li>
            <li>Arrieta, A. B., et al. (2020). Explainable Artificial Intelligence (XAI): Concepts, taxonomies, opportunities and challenges. <em>Information Fusion</em>, 58, 82–115.</li>
            <li>Campbell, J. P., DeBlois, P. B., &amp; Oblinger, D. G. (2007). Academic analytics: A new tool for a new era. <em>EDUCAUSE Review</em>, 42(4), 40–57.</li>
            <li>Credé, M., Roch, S. G., &amp; Kieszczynka, U. M. (2010). Class attendance in college: A meta-analytic review. <em>Review of Educational Research</em>, 80(2), 272–295.</li>
            <li>Deterding, S., Dixon, D., Khaled, R., &amp; Nacke, L. (2011). From game design elements to gamefulness. <em>Proceedings of MindTrek</em>, 9–15.</li>
            <li>Hamari, J., Koivisto, J., &amp; Sarsa, H. (2014). Does gamification work? <em>HICSS</em>, 3025–3034.</li>
            <li>Jivet, I., Scheffel, M., Specht, M., &amp; Drachsler, H. (2018). License to evaluate. <em>LAK '18</em>, 31–40.</li>
            <li>Khosravi, H., et al. (2022). Explainable Artificial Intelligence in education. <em>Computers and Education: AI</em>, 3, 100074.</li>
            <li>Richardson, M., Abraham, C., &amp; Bond, R. (2012). Psychological correlates of university students' academic performance. <em>Psychological Bulletin</em>, 138(2), 353–387.</li>
            <li>Siemens, G., &amp; Long, P. (2011). Penetrating the fog: Analytics in learning and education. <em>EDUCAUSE Review</em>, 46(5), 30–40.</li>
            <li>UNESCO. (2023). <em>Global Education Monitoring Report</em>. Paris: UNESCO Publishing.</li>
            <li>Viberg, O., Hatakka, M., Bälter, O., &amp; Mavroudi, A. (2018). The current landscape of learning analytics in higher education. <em>Computers in Human Behavior</em>, 89, 98–110.</li>
          </ol>

        </article>
      </div>
    </>
  );
}
