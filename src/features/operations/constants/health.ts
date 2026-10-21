export const REQUIRED_PRODUCTION_JOBS = [
  "h08-generation",
  "h06-notifications-dispatch",
  "h03-staging-cleanup",
] as const;
export const MAX_PROGRESS_AGE_MS = 30 * 60 * 1000;
export const JOB_PROGRESS_AGE_MS: Readonly<Record<string, number>> = {
  "h03-staging-cleanup": 90 * 60 * 1000,
  "h04-generation-day": 26 * 60 * 60 * 1000,
};
