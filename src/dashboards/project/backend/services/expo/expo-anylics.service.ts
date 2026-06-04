import { expoConfigService } from "./expo-config.service";
import { packageService } from "./expo-package.service";

import { riskService } from "./expo-risk.service";
import { authScanner } from "./scanner/auth.scanner";

import { navigationScanner } from "./scanner/navigation.scanner";
import { permissionScanner } from "./scanner/permision.scanner";
import { storeScanner } from "./scanner/store.scanner";

class ExpoAnalysisService {
  analyze() {
    const config = expoConfigService.getConfig();

    const packageInfo = packageService.getPackages();

    const packages = packageInfo.dependencies;

    const findings = [
      ...permissionScanner.scan(
        config,

        packages,
      ),

      ...navigationScanner.scan(),

      ...storeScanner.scan(config),

      ...authScanner.scan(),
    ];

    return riskService.calculate(findings);
  }
}

export const expoAnalysisService = new ExpoAnalysisService();
