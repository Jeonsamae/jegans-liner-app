export type NotificationPreferences = {
  delays: boolean;
  departureReminders: boolean;
  emergencies: boolean;
  scheduleChanges: boolean;
};

export const NOTIFICATION_PREFS_KEY = 'jegans.notificationPreferences';
export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  delays: true,
  departureReminders: true,
  emergencies: true,
  scheduleChanges: true,
};
