type Recommendation = {
  id: string;

  priority: "P0" | "P1" | "P2" | "P3";

  category: "store" | "performance" | "architecture" | "quality" | "security";

  title: string;

  impact: string;

  action: string;

  effort: "LOW" | "MEDIUM" | "HIGH";

  source?: string;
};

class RecommendationService {
  generate({
    risks,

    performance,

    architecture,

    quality,

    bundle,

    reactNative,
  }: any) {
    const recommendations: Recommendation[] = [];

    /*
     * risks
     */

    for (const finding of risks?.findings ?? []) {
      if (finding.severity === "CRITICAL") {
        recommendations.push({
          id: `risk-${finding.id}`,

          priority: "P0",

          category: "store",

          title: finding.title,

          impact: finding.whyItMatters,

          action: finding.recommendation,

          effort: "MEDIUM",

          source: finding.files?.[0],
        });
      }

      if (finding.severity === "HIGH") {
        recommendations.push({
          id: `high-${finding.id}`,

          priority: "P1",

          category: "security",

          title: finding.title,

          impact: finding.description,

          action: finding.recommendation,

          effort: "LOW",

          source: finding.files?.[0],
        });
      }
    }

    /*
     * performance
     */

    if (performance?.consoleLogs > 25) {
      recommendations.push({
        id: "remove-console",

        priority: "P2",

        category: "performance",

        title: "Reduce console logging",

        impact: "Excess logs slow production builds",

        action: "Remove or strip console statements",

        effort: "LOW",
      });
    }

    if (performance?.largeComponents > 3) {
      recommendations.push({
        id: "split-components",

        priority: "P1",

        category: "architecture",

        title: "Break large components",

        impact: "Large files increase maintenance cost",

        action: "Split screens into smaller units",

        effort: "HIGH",
      });
    }

    /*
     * architecture
     */

    if (architecture?.circularRisk?.length > 0) {
      recommendations.push({
        id: "circular-imports",

        priority: "P1",

        category: "architecture",

        title: "Resolve circular dependencies",

        impact: "Cycles make code difficult to maintain",

        action: "Move shared logic to common modules",

        effort: "MEDIUM",
      });
    }

    /*
     * code quality
     */

    if (quality?.anyTypes > 20) {
      recommendations.push({
        id: "reduce-any",

        priority: "P2",

        category: "quality",

        title: "Reduce any usage",

        impact: "Weak typing increases runtime bugs",

        action: "Replace any with interfaces",

        effort: "MEDIUM",
      });
    }

    if (quality?.tsIgnores > 10) {
      recommendations.push({
        id: "ts-ignore",

        priority: "P1",

        category: "quality",

        title: "Remove ts-ignore usage",

        impact: "Suppressing TS errors hides problems",

        action: "Fix root typing issues",

        effort: "MEDIUM",
      });
    }

    /*
     * bundle
     */

    if (bundle?.estimatedStartupRisk === "HIGH") {
      recommendations.push({
        id: "bundle-size",

        priority: "P1",

        category: "performance",

        title: "Reduce startup bundle",

        impact: "Large bundles slow startup",

        action: "Lazy load screens and reduce imports",

        effort: "HIGH",
      });
    }

    /*
     * RN
     */

    if (reactNative?.safeAreaCoverage < 40) {
      recommendations.push({
        id: "safe-area",

        priority: "P2",

        category: "quality",

        title: "Improve SafeArea coverage",

        impact: "UI may overlap notches",

        action: "Wrap screens with SafeAreaView",

        effort: "LOW",
      });
    }

    /*
     * sort priorities
     */

    const order = {
      P0: 0,

      P1: 1,

      P2: 2,

      P3: 3,
    };

    return recommendations.sort(
      (a, b) => order[a.priority] - order[b.priority],
    );
  }
}

export const recommendationService = new RecommendationService();
