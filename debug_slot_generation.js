const parseTime = (timeStr) => {
  const cleanStr = timeStr.toLowerCase().trim();
  const isPM = cleanStr.includes('pm');
  const [hour, minute] = cleanStr.replace(/am|pm/g, '').trim().split(':');
  let h = parseInt(hour, 10);
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return { h, m: parseInt(minute, 10) };
};

const formatSlotLabel = (date, dayOffset) => {
  const time = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  if (dayOffset === 0) return `Today ${time}`;
  if (dayOffset === 1) return `Tomorrow ${time}`;
  return `In ${dayOffset} days ${time}`;
};

const generateAvailableSlots = (settings, now) => {
  const slots = [];
  if (!settings || !settings.storeTiming) return slots;

  const open = parseTime(settings.storeTiming.openTime);
  const close = parseTime(settings.storeTiming.closeTime);

  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);

    let slotTime = new Date(day);
    slotTime.setHours(open.h, open.m, 0, 0);

    const closingTime = new Date(day);
    closingTime.setHours(close.h, close.m, 0, 0);

    if (dayOffset === 0 && now > closingTime) continue;

    while (slotTime <= closingTime) {
      const diffMins = (slotTime - now) / 60000;
      if ((dayOffset === 0 && diffMins >= 60) || dayOffset > 0) {
        slots.push({ label: formatSlotLabel(slotTime, dayOffset), value: slotTime.getTime() });
      }
      slotTime.setMinutes(slotTime.getMinutes() + 30);
    }
  }

  return slots;
};

const generateTimeSlots = (fees, now) => {
  const futureSlots = generateAvailableSlots(fees, now);

  const close = parseTime(fees.storeTiming.closeTime);
  const todayClosing = new Date(now);
  todayClosing.setHours(close.h, close.m, 0, 0);

  const isStoreOpenNow = now < todayClosing;
  const canShowASAP = isStoreOpenNow && ((todayClosing - now) / 60000 >= 60);

  if (canShowASAP) {
    futureSlots.unshift({
      label: 'ASAP (Ready in 60 mins)',
      value: new Date(now.getTime() + 60 * 60000).getTime(),
      isASAP: true
    });
  }

  if (futureSlots.length === 0) {
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(10, 0, 0, 0);
    futureSlots.push({ label: 'Tomorrow 10:00 AM', value: fallback.getTime() });
  }

  return futureSlots;
};

const fees = { storeTiming: { openTime: '10:00', closeTime: '22:00' } };
const now = new Date();
now.setHours(23);
now.setMinutes(0);
now.setSeconds(0);
now.setMilliseconds(0);

console.log('now', now.toString());
const slots = generateTimeSlots(fees, now);
console.log('count', slots.length);
console.log(slots.map((s) => s.label));
