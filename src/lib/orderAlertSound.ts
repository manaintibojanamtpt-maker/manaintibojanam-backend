const SOUND_ENABLED_KEY = 'bhojanos_order_sound_enabled';
const SOUND_UNLOCKED_KEY = 'bhojanos_order_sound_unlocked';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

export function isOrderSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
}

export function setOrderSoundEnabled(enabled: boolean) {
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function isOrderSoundUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SOUND_UNLOCKED_KEY) === 'true';
}

/** Call after a user gesture (required on iOS PWA). */
export async function unlockOrderSound(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    sessionStorage.setItem(SOUND_UNLOCKED_KEY, 'true');
    await playOrderAlertSound({ force: true });
    return true;
  } catch {
    return false;
  }
}

export async function playOrderAlertSound(options?: { force?: boolean }): Promise<void> {
  if (!options?.force && !isOrderSoundEnabled()) return;
  if (!options?.force && !isOrderSoundUnlocked()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') await ctx.resume();

    const now = ctx.currentTime;
    const tones = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 1174, start: 0.14, dur: 0.18 },
      { freq: 880, start: 0.36, dur: 0.12 },
    ];

    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });

    if ('vibrate' in navigator) {
      navigator.vibrate([120, 60, 120, 60, 200]);
    }
  } catch (error) {
    console.warn('Order alert sound failed:', error);
  }
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
