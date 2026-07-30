/**
 * Listen/speak coordination FSM — prevents TTS/listen overlap.
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

export type VoiceRuntimeEvent =
  | 'START_LISTEN'
  | 'PARTIAL'
  | 'FINAL'
  | 'THINK'
  | 'SPEAK'
  | 'BARGE_IN'
  | 'STOP'
  | 'ERROR'
  | 'IDLE';

const ALLOWED: Record<VoiceRuntimeState, readonly VoiceRuntimeEvent[]> = {
  idle: ['START_LISTEN', 'SPEAK', 'STOP'],
  listening: ['PARTIAL', 'FINAL', 'BARGE_IN', 'STOP', 'ERROR'],
  interim_transcript: ['PARTIAL', 'FINAL', 'BARGE_IN', 'STOP', 'ERROR'],
  final_transcript: ['THINK', 'STOP', 'ERROR'],
  thinking: ['SPEAK', 'STOP', 'ERROR', 'IDLE'],
  speaking: ['BARGE_IN', 'IDLE', 'START_LISTEN', 'STOP', 'ERROR'],
  interrupted: ['START_LISTEN', 'IDLE', 'STOP'],
  paused: ['START_LISTEN', 'IDLE', 'STOP'],
};

export function canTransition(from: VoiceRuntimeState, event: VoiceRuntimeEvent): boolean {
  return ALLOWED[from].includes(event);
}

export function nextVoiceRuntimeState(
  from: VoiceRuntimeState,
  event: VoiceRuntimeEvent,
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
    case 'IDLE':
      return 'idle';
    default:
      return from;
  }
}

export function shouldBlockListenForTts(state: VoiceRuntimeState): boolean {
  return state === 'speaking';
}
