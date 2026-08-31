import { invokeLLM, listLLMModels } from "./_core/llm";
import type { ScanReport } from "../shared/cybershield";

const AI_DISCLAIMER =
  "AI-assisted wording is derived only from the deterministic findings recorded in this report. It does not independently verify vulnerabilities or replace a professional security assessment.";

export async function createAiExplanation(report: ScanReport): Promise<ScanReport["ai"]> {
  const modelCatalog = await listLLMModels();
  const model = modelCatalog.data.find(entry => entry.id === "gpt-5-mini")?.id ?? modelCatalog.data[0]?.id;
  if (!model) throw new Error("No AI model is currently available.");

  const deterministicInput = {
    domain: report.normalizedDomain,
    overall: report.overall,
    categories: report.categories.map(category => ({ category: category.label, score: category.score, grade: category.grade })),
    findings: report.findings
      .filter(finding => finding.status === "fail" || finding.status === "warn")
      .map(finding => ({ id: finding.id, title: finding.title, status: finding.status, severity: finding.severity, evidence: finding.evidence, impact: finding.impact, remediation: finding.remediation })),
  };

  const response = await invokeLLM({
    model,
    maxTokens: 900,
    messages: [
      {
        role: "system",
        content:
          "You write concise, plain-English cybersecurity remediation content for small businesses. Use only the deterministic JSON supplied by the user. Do not introduce new findings, assert that a vulnerability is proven, recommend exploit testing, or claim a control exists when the JSON does not say so. Return the requested JSON only.",
      },
      {
        role: "user",
        content: `Create a short, calm overview and up to three practical priority actions from these deterministic assessment findings:\n${JSON.stringify(deterministicInput)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cybershield_explanation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            overview: { type: "string" },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  findingId: { type: "string" },
                  businessImpact: { type: "string" },
                  recommendedAction: { type: "string" },
                },
                required: ["findingId", "businessImpact", "recommendedAction"],
                additionalProperties: false,
              },
            },
          },
          required: ["overview", "actions"],
          additionalProperties: false,
        },
      },
    },
  });

  const responseContent = response.choices[0]?.message.content;
  const parsed = JSON.parse(typeof responseContent === "string" ? responseContent : "{}") as {
    overview?: string;
    actions?: Array<{ findingId: string; businessImpact: string; recommendedAction: string }>;
  };
  const indexedFindings = new Map(report.findings.map(finding => [finding.id, finding]));
  const actions = (parsed.actions ?? [])
    .filter(action => indexedFindings.has(action.findingId))
    .slice(0, 3)
    .map((action, index) => {
      const finding = indexedFindings.get(action.findingId)!;
      return {
        findingId: action.findingId,
        title: finding.title,
        businessImpact: action.businessImpact,
        recommendedAction: action.recommendedAction,
        priority: (index === 0 ? "Immediate" : index === 1 ? "Next" : "Improve") as "Immediate" | "Next" | "Improve",
      };
    });

  return {
    source: "ai",
    overview: parsed.overview?.trim() || report.ai.overview,
    priorityActions: actions.length ? actions : report.ai.priorityActions,
    disclaimer: AI_DISCLAIMER,
  };
}
