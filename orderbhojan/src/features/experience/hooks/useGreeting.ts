import { getTimeGreeting } from '../domain/experience.types';

export function useGreeting(now = new Date()): string {
  return getTimeGreeting(now.getHours());
}
