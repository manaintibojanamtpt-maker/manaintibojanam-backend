export type VoiceTelemetryEvent =
  | {
      readonly type: 'turn_started';
      readonly sessionId: string;
      readonly conversationId: string;
    }
  | {
      readonly type: 'tool_called';
      readonly sessionId: string;
      readonly tool: string;
      readonly callId: string;
      readonly ok: boolean;
      readonly code?: string;
    }
  | {
      readonly type: 'confirmation_phase';
      readonly sessionId: string;
      readonly phase: string;
    }
  | {
      readonly type: 'escalate';
      readonly sessionId: string;
      readonly reason: string;
    }
  | {
      readonly type: 'turn_failed';
      readonly sessionId: string;
      readonly error: string;
    };

export type VoiceTelemetrySink = (event: VoiceTelemetryEvent) => void;

const counters = {
  turns: 0,
  toolOk: 0,
  toolFail: 0,
  escalations: 0,
  confirms: 0,
};

let sink: VoiceTelemetrySink | null = null;

export function setVoiceTelemetrySink(next: VoiceTelemetrySink | null): void {
  sink = next;
}

export function emitVoiceTelemetry(event: VoiceTelemetryEvent): void {
  if (event.type === 'turn_started') counters.turns += 1;
  if (event.type === 'tool_called') {
    if (event.ok) counters.toolOk += 1;
    else counters.toolFail += 1;
  }
  if (event.type === 'escalate') counters.escalations += 1;
  if (event.type === 'confirmation_phase' && event.phase === 'ready_to_apply') {
    counters.confirms += 1;
  }
  sink?.(event);
}

export function getVoiceTelemetryCounters(): Readonly<typeof counters> {
  return { ...counters };
}

export function resetVoiceTelemetryCountersForTests(): void {
  counters.turns = 0;
  counters.toolOk = 0;
  counters.toolFail = 0;
  counters.escalations = 0;
  counters.confirms = 0;
}
