export const assessmentCategories = ["website", "email", "domain"] as const;
export type AssessmentCategory = (typeof assessmentCategories)[number];

export type FindingStatus = "pass" | "warn" | "fail" | "info";
export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type ScanFinding = {
  id: string;
  category: AssessmentCategory;
  title: string;
  status: FindingStatus;
  severity: FindingSeverity;
  evidence: string;
  impact: string;
  remediation: string;
  scoringWeight: number;
};

export type CategoryScore = {
  category: AssessmentCategory;
  label: string;
  weight: number;
  score: number;
  grade: string;
  deductionTotal: number;
  calculation: string;
  availableChecks: number;
  unavailableChecks: number;
};

export type PriorityAction = {
  findingId: string;
  title: string;
  businessImpact: string;
  recommendedAction: string;
  priority: "Immediate" | "Next" | "Improve";
};

export type AiExplanation = {
  source: "ai" | "deterministic-fallback";
  overview: string;
  priorityActions: PriorityAction[];
  disclaimer: string;
};

export type DomainMetadata = {
  aRecords: string[];
  aaaaRecords: string[];
  mxRecords: string[];
  nameservers: string[];
  rdapRegistrar: string | null;
  rdapStatus: "available" | "unavailable";
  registrationDate: string | null;
  domainAgeDays: number | null;
  certificateSubdomains: string[];
  certificateTransparencyStatus: "available" | "unavailable";
  tls: {
    protocol: string | null;
    cipher: string | null;
    validTo: string | null;
    daysUntilExpiry: number | null;
    status: "available" | "unavailable";
  };
};

export type ScanReport = {
  version: "1.0";
  domain: string;
  normalizedDomain: string;
  scannedAt: string;
  responsibleUseNotice: string;
  metadata: DomainMetadata;
  findings: ScanFinding[];
  categories: CategoryScore[];
  overall: {
    score: number;
    grade: string;
    calculation: string;
  };
  ai: AiExplanation;
};

export type ScanSummary = {
  id: string;
  domain: string;
  normalizedDomain: string;
  overallScore: number;
  grade: string;
  websiteScore: number;
  emailScore: number;
  domainScore: number;
  createdAt: Date;
  completedAt: Date | null;
};

export type ScanComparison = {
  current: ScanSummary;
  previous: ScanSummary | null;
  deltas: {
    overall: number;
    website: number;
    email: number;
    domain: number;
  } | null;
  summary: string;
};
