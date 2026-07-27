/**
 * Explicit voice-agent runtime states for listen/speak coordination.
 * Prevents TTS/listen overlap and documents barge-in transitions.
 */

export type VoiceRuntimeState =
  | 'idle'
  | 'listening'
  | 'interim_transcript'
  | 'final_transcript'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'paused';

export type VoiceRuntimeTransition =
  | { readonly type: 'START_LISTEN' }
  | { readonly type: 'PARTIAL' }
  | { readonly type: 'FINAL' }
  | { readonly type: 'THINK' }
  | { readonly type: 'SPEAK' }
  | { readonly type: 'BARGE_IN' }
  | { readonly type: 'STOP' }
  | { readonly type: 'ERROR' }
  | { readonly type: 'IDLE' };

const ALLOWED: Record<VoiceRuntimeState, readonly VoiceRuntimeTransition['type'][]> = {
  idle: ['START_LISTEN', 'SPEAK', 'STOP'],
  listening: ['PARTIAL', 'FINAL', 'BARGE_IN', 'STOP', 'ERROR'],
  interim_transcript: ['PARTIAL', 'FINAL', 'BARGE_IN', 'STOP', 'ERROR'],
  final_transcript: ['THINK', 'STOP', 'ERROR'],
  thinking: ['SPEAK', 'STOP', 'ERROR', 'IDLE'],
  speaking: ['BARGE_IN', 'IDLE', 'START_LISTEN', 'STOP', 'ERROR'],
  interrupted: ['START_LISTEN', 'IDLE', 'STOP'],
  paused: ['START_LISTEN', 'IDLE', 'STOP'],
};

export function canTransition(
  from: VoiceRuntimeState,
  event: VoiceRuntimeTransition['type'],
): boolean {
  return ALLOWED[from].includes(event);
}

export function nextVoiceRuntimeState(
  from: VoiceRuntimeState,
  event: VoiceRuntimeTransition['type'],
): VoiceRuntimeState {
  if (!canTransition(from, event)) return from;
  switch (event) {
    case 'START_LISTEN':
      return 'listening';
    case 'PARTIAL':
      return 'interim_transcript';
    case 'FINAL':
      return 'final_transcript';
    case 'THINK':
      return 'thinking';
    case 'SPEAK':
      return 'speaking';
    case 'BARGE_IN':
      return 'interrupted';
    case 'STOP':
      return 'paused';
    case 'ERROR':
      return 'idle';
    case 'IDLE':
      return 'idle';
    default:
      return from;
  }
}

/** True when mic must not open (TTS still owning audio). */
export function shouldBlockListenForTts(state: VoiceRuntimeState): boolean {
  return state === 'speaking';
}
