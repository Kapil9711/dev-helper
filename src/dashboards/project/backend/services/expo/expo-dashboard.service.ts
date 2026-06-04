import { gitService } from "../../../../../services/git/git.service";
import { projectService } from "../project.service";
import { buildService } from "./expo-build.service";
import { expoConfigService } from "./expo-config.service";
import { environmentService } from "./expo-environment.service";
import { navigationService } from "./expo-navigation.service";
import { permissionService } from "./expo-permision.service";
import { riskService } from "./expo-risk.service";
import { structureService } from "./expo-structure.service";
import { updateService } from "./expo-update.service";
import { architectureScanner } from "./scanner/architecture.scanner";
import { authScanner } from "./scanner/auth.scanner";
import { bundleScanner } from "./scanner/bundle.scanner";
import { codeQualityScanner } from "./scanner/code-quality.scanner";
import { dependencyCollector } from "./scanner/dependency.scanner";
import { fileCollector } from "./scanner/file.scanner";
import { navigationScanner } from "./scanner/navigation.scanner";
import { performanceScanner } from "./scanner/performance.scanner";
import { permissionScanner } from "./scanner/permision.scanner";
import { reactNativeScanner } from "./scanner/react-native.scanner";
import { recommendationService } from "./scanner/recomendation.scanner";

export class DashboardAggregatorService {
  async build({
    config,

    packages,
  }: {
    config: any;

    packages: string[];
  }) {
    /*
     * base collectors
     */

    const files = fileCollector.collect();

    const dependencies = dependencyCollector.collect();

    /*
     * scanners
     */

    const architecture = architectureScanner.scan();

    const performance = performanceScanner.scan();

    const codeQuality = codeQualityScanner.scan();

    const reactNative = reactNativeScanner.scan();

    const bundle = bundleScanner.scan();

    /*
     * old findings
     */

    const findings = [
      ...authScanner.scan(),

      ...navigationScanner.scan(),

      ...permissionScanner.scan(
        config,

        packages,

        files.map((x) => x.content),
      ),
    ];

    /*
     * risk engine
     */

    const analysis = riskService.calculate(findings);

    /*
     * recommendations
     */

    const recommendations = recommendationService.generate({
      risks: analysis,

      performance,

      architecture,

      quality: codeQuality,

      bundle,

      reactNative,
    });

    return {
      /*
       * old sections
       */

      //   project: projectService.get(),

      //   git: await gitService.dashboard(),

      permissions: permissionService.getPermissions(config),

      navigation: navigationService.scan(),

      updates: updateService.get(config),

      //   structure: structureService.scan(),

      //   expo: expoConfigService.get(config),

      //   build: buildService.get(config),

      environment: environmentService.get(),

      /*
       * new sections
       */

      files: fileCollector.stats(),

      dependencies,

      architecture,

      performance,

      codeQuality,

      reactNative,

      bundle,

      recommendations,

      analysis,
    };
  }
}

export const dashboardAggregatorService = new DashboardAggregatorService();
