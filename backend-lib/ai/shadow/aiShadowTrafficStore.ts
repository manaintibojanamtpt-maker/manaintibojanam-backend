import { readAiShadowBufferCapacity } from '../aiShadowTrafficConfig.js';
import type { AiShadowSample } from './aiShadowTrafficTypes.js';

let buffer: AiShadowSample[] = [];
let capacity = readAiShadowBufferCapacity();

export function appendAiShadowSample(sample: AiShadowSample): void {
  buffer.push(sample);
  while (buffer.length > capacity) {
    buffer.shift();
  }
}

export function listAiShadowSamples(limit?: number): readonly AiShadowSample[] {
  const cap = typeof limit === 'number' && limit >= 1 ? Math.floor(limit) : buffer.length;
  if (cap >= buffer.length) return [...buffer];
  return buffer.slice(buffer.length - cap);
}

export function resetAiShadowTrafficStoreForTests(): void {
  buffer = [];
  capacity = readAiShadowBufferCapacity();
}

export function configureAiShadowBufferCapacityForTests(nextCapacity: number): void {
  capacity = Math.max(1, Math.floor(nextCapacity));
  while (buffer.length > capacity) {
    buffer.shift();
  }
}

export function aiShadowSampleCount(): number {
  return buffer.length;
}
