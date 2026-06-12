import { useState, useEffect } from 'react';

type TimeBasedSection = 'Morning' | 'Lunch' | 'Evening' | 'Late Night';

export function useTimeBasedSection() {
  const [section, setSection] = useState<TimeBasedSection>('Morning');

  useEffect(() => {
    const updateTimeBasedSection = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11.5) {
        setSection('Morning');
      } else if (hour >= 11.5 && hour < 16) {
        setSection('Lunch');
      } else if (hour >= 16 && hour < 22) {
        setSection('Evening');
      } else {
        setSection('Late Night');
      }
    };

    updateTimeBasedSection();
    
    // Update every minute to catch hour transitions
    const interval = setInterval(updateTimeBasedSection, 60000);
    return () => clearInterval(interval);
  }, []);

  return section;
}
