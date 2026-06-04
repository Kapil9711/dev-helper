class PermissionService {
  private dangerousPermissions = [
    "CAMERA",

    "RECORD_AUDIO",

    "ACCESS_FINE_LOCATION",

    "ACCESS_COARSE_LOCATION",

    "READ_CONTACTS",

    "READ_MEDIA_IMAGES",

    "READ_MEDIA_VIDEO",

    "READ_EXTERNAL_STORAGE",

    "WRITE_EXTERNAL_STORAGE",

    "POST_NOTIFICATIONS",
  ];

  private extractIOS(infoPlist: any) {
    const mapping = {
      camera: "NSCameraUsageDescription",

      photos: "NSPhotoLibraryUsageDescription",

      location: "NSLocationWhenInUseUsageDescription",

      microphone: "NSMicrophoneUsageDescription",

      notifications: "NSUserNotificationsUsageDescription",

      bluetooth: "NSBluetoothAlwaysUsageDescription",

      contacts: "NSContactsUsageDescription",

      tracking: "NSUserTrackingUsageDescription",

      calendar: "NSCalendarsUsageDescription",
    };

    const output: Record<
      string,
      {
        exists: boolean;

        description?: string;

        weak: boolean;
      }
    > = {};

    for (const key in mapping) {
      const permission = mapping[key as keyof typeof mapping];

      const value = infoPlist[permission];

      output[key] = {
        exists: !!value,

        description: value,

        weak: !!value && String(value).length < 15,
      };
    }

    return output;
  }

  getPermissions(config: any) {
    const android = config?.android?.permissions ?? [];

    const infoPlist = config?.ios?.infoPlist ?? {};

    const ios = this.extractIOS(infoPlist);

    const dangerous = android.filter((permission: string) =>
      this.dangerousPermissions.includes(permission),
    );

    const missingIOS = Object.entries(ios)

      .filter(([, value]) => !value.exists)

      .map(([key]) => key);

    const weakDescriptions = Object.entries(ios)

      .filter(([, value]) => value.weak)

      .map(([key]) => key);

    return {
      android: {
        permissions: android,

        total: android.length,

        dangerous,

        dangerousCount: dangerous.length,
      },

      ios,

      summary: {
        missingIOS,

        weakDescriptions,

        totalIOSConfigured: Object.values(ios).filter(
          (permission) => permission.exists,
        ).length,

        totalAndroid: android.length,
      },

      reviewRisk: {
        highRisk: dangerous.length > 4 || missingIOS.length > 2,

        permissionOverload: android.length > 10,

        likelyReviewQuestions: [...dangerous, ...missingIOS],
      },
    };
  }
}

export const permissionService = new PermissionService();
