/**
 * Branch domain — operating hours evaluation (M5 PR-10).
 */

import { BRANCH_DOMAIN_ERROR_MESSAGES } from '../shared/BranchErrors';
import type { BranchOperationalSnapshot } from '../shared/BranchTypes';
import type { BranchDayHours, BranchHoursEvaluation } from './BranchAvailabilitySummary';

const MINUTES_PER_DAY = 24 * 60;

export const isMinuteWithinDayHours = (
  minuteOfDay: number,
  openMinute: number,
  closeMinute: number
): boolean => {
  if (openMinute === closeMinute) {
    return false;
  }

  if (closeMinute > openMinute) {
    return minuteOfDay >= openMinute && minuteOfDay < closeMinute;
  }

  return minuteOfDay >= openMinute || minuteOfDay < closeMinute;
};

export const isWithinWeeklyHours = (
  evaluatedAt: number,
  weeklyHours: readonly BranchDayHours[]
): boolean => {
  const date = new Date(evaluatedAt);
  const dayOfWeek = date.getUTCDay() as BranchDayHours['dayOfWeek'];
  const minuteOfDay = date.getUTCHours() * 60 + date.getUTCMinutes();
  const todayHours = weeklyHours.filter((entry) => entry.dayOfWeek === dayOfWeek);

  if (todayHours.length === 0) {
    return false;
  }

  return todayHours.some((entry) =>
    isMinuteWithinDayHours(minuteOfDay, entry.openMinute, entry.closeMinute)
  );
};

export const evaluateBranchHours = (
  branch: BranchOperationalSnapshot,
  options?: {
    readonly evaluatedAt?: number;
    readonly weeklyHours?: readonly BranchDayHours[];
  }
): BranchHoursEvaluation => {
  const reasons: string[] = [];

  if (options?.weeklyHours && options.weeklyHours.length > 0) {
    const evaluatedAt = options.evaluatedAt ?? 0;
    const withinSchedule = isWithinWeeklyHours(evaluatedAt, options.weeklyHours);

    if (!withinSchedule) {
      reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_CLOSED);
      return {
        status: 'closed',
        isOpen: false,
        reasons,
      };
    }

    if (!branch.isOpen) {
      reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_CLOSED);
      return {
        status: 'closed',
        isOpen: false,
        reasons,
      };
    }

    return {
      status: 'open',
      isOpen: true,
      reasons,
    };
  }

  if (!branch.isOpen) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_CLOSED);
    return {
      status: 'closed',
      isOpen: false,
      reasons,
    };
  }

  return {
    status: 'open',
    isOpen: true,
    reasons,
  };
};

export const normalizeMinuteOfDay = (minute: number): number => {
  if (!Number.isFinite(minute)) {
    return 0;
  }
  const wrapped = minute % MINUTES_PER_DAY;
  return wrapped < 0 ? wrapped + MINUTES_PER_DAY : wrapped;
};
