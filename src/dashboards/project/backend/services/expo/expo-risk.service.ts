export type RiskFinding = {
  id: string;

  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  category:
    | "store"
    | "permission"
    | "navigation"
    | "privacy"
    | "security"
    | "auth";

  title: string;

  description: string;

  whyItMatters: string;

  recommendation: string;

  files?: string[];

  confidence: number;

  weight: number;
};

class RiskService {
  calculate(findings: RiskFinding[]) {
    const unique = this.dedupe(findings);

    const penalty = unique.reduce(
      (sum, finding) => {
        const severityMultiplier = this.getSeverityMultiplier(finding.severity);

        const confidence = finding.confidence / 100;

        return sum + finding.weight * severityMultiplier * confidence;
      },

      0,
    );

    /*
     * cap penalties
     */

    const normalized = Math.min(penalty, 85);

    const score = Math.max(0, Math.round(100 - normalized));

    const grouped = this.group(unique);

    return {
      score,

      rejectionChance: this.rejectionChance(score),

      findings: unique,

      grouped,
    };
  }

  private dedupe(findings: RiskFinding[]) {
    return findings.filter(
      (item, index, arr) =>
        arr.findIndex(
          (x) =>
            x.id === item.id &&
            JSON.stringify(x.files) === JSON.stringify(item.files),
        ) === index,
    );
  }

  private getSeverityMultiplier(severity: RiskFinding["severity"]) {
    switch (severity) {
      case "CRITICAL":
        return 1.0;

      case "HIGH":
        return 0.75;

      case "MEDIUM":
        return 0.45;

      case "LOW":
        return 0.2;

      default:
        return 0.3;
    }
  }

  private group(findings: RiskFinding[]) {
    return {
      critical: findings.filter((x) => x.severity === "CRITICAL"),

      high: findings.filter((x) => x.severity === "HIGH"),

      medium: findings.filter((x) => x.severity === "MEDIUM"),

      low: findings.filter((x) => x.severity === "LOW"),
    };
  }

  private rejectionChance(score: number) {
    if (score <= 25) {
      return "VERY HIGH";
    }

    if (score <= 50) {
      return "HIGH";
    }

    if (score <= 75) {
      return "MEDIUM";
    }

    return "LOW";
  }
}

export const riskService = new RiskService();
