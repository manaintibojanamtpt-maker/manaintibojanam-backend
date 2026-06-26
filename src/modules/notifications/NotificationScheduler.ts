import { ScheduledJobType } from './NotificationTypes';

export interface ScheduleDefinition {
  jobType: ScheduledJobType;
  cron: string;
  label: string;
  description: string;
}

export const NOTIFICATION_SCHEDULES: ScheduleDefinition[] = [
  {
    jobType: 'morning_brief',
    cron: '0 8 * * *',
    label: 'Morning Briefing',
    description: 'Daily AI intelligence brief at 8:00 AM',
  },
  {
    jobType: 'evening_report',
    cron: '0 20 * * *',
    label: 'Evening Report',
    description: 'End-of-day performance report at 8:00 PM',
  },
  {
    jobType: 'weekly_report',
    cron: '0 8 * * 1',
    label: 'Weekly Report',
    description: 'Weekly business summary every Monday at 8:00 AM',
  },
  {
    jobType: 'monthly_report',
    cron: '0 8 1 * *',
    label: 'Monthly Report',
    description: 'Monthly performance report on the 1st at 8:00 AM',
  },
  {
    jobType: 'critical_scan',
    cron: '*/15 * * * *',
    label: 'Critical Alert Scan',
    description: 'Instant critical alerts every 15 minutes',
  },
];

export const shouldRunJobForTenant = (
  jobType: ScheduledJobType,
  config: { morningBrief: { enabled: boolean }; afternoonBrief: { enabled: boolean }; eveningReport: { enabled: boolean } }
): boolean => {
  switch (jobType) {
    case 'morning_brief':
      return config.morningBrief.enabled;
    case 'afternoon_brief':
      return config.afternoonBrief.enabled;
    case 'evening_report':
      return config.eveningReport.enabled;
    case 'weekly_report':
    case 'monthly_report':
      return config.morningBrief.enabled || config.eveningReport.enabled;
    case 'critical_scan':
      return true;
    default:
      return false;
  }
};

export class NotificationScheduler {
  getSchedules(): ScheduleDefinition[] {
    return NOTIFICATION_SCHEDULES;
  }

  getScheduleForJob(jobType: ScheduledJobType): ScheduleDefinition | undefined {
    return NOTIFICATION_SCHEDULES.find((s) => s.jobType === jobType);
  }
}

export const notificationScheduler = new NotificationScheduler();
