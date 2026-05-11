export const isStoreOpenNow = (settings: any, currentTime: Date = new Date()) => {
  if (!settings) return true;
  if (!settings.storeTiming) return settings.isStoreOpen !== false;
  if (settings.storeTiming.isManualOverride) return settings.isStoreOpen !== false;

  const currentTimeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
  const { openTime, closeTime } = settings.storeTiming;
  
  if (!openTime || !closeTime) return settings.isStoreOpen !== false;
  
  return currentTimeStr >= openTime && currentTimeStr <= closeTime;
};

export const getClosingSoonStatus = (settings: any, currentTime: Date = new Date()) => {
  if (!settings || !settings.storeTiming || settings.storeTiming.isManualOverride) return false;
  
  const closeTimeParts = settings.storeTiming.closeTime.split(':');
  const closeDate = new Date(currentTime);
  closeDate.setHours(parseInt(closeTimeParts[0]), parseInt(closeTimeParts[1]), 0);
  
  const diffMinutes = (closeDate.getTime() - currentTime.getTime()) / 60000;
  return diffMinutes > 0 && diffMinutes <= 30;
};
