import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateVoiceCoreConfirmAddRollout,
  stickyBucket0to99,
} from '../src/features/voice/application/voiceCoreConfirmAddRollout.ts';

describe('voice-core confirm/add progressive rollout', () => {
  it('kill switch off always disables', () => {
    const d = evaluateVoiceCoreConfirmAddRollout({
      masterEnabled: false,
      percent: 100,
      internalEmails: ['a@b.com'],
      userEmail: 'a@b.com',
      cohortKey: 'ob-cohort-deadbeef',
      forceInclude: true,
    });
    assert.equal(d.enabled, false);
    assert.equal(d.reason, 'kill_switch_off');
  });

  it('internal email is the smallest cohort when pct=0', () => {
    const inList = evaluateVoiceCoreConfirmAddRollout({
      masterEnabled: true,
      percent: 0,
      internalEmails: ['founder@bhojan.os'],
      userEmail: 'Founder@bhojan.os',
      cohortKey: 'ob-cohort-aaaa',
    });
    assert.equal(inList.enabled, true);
    assert.equal(inList.reason, 'internal_email');

    const out = evaluateVoiceCoreConfirmAddRollout({
      masterEnabled: true,
      percent: 0,
      internalEmails: ['founder@bhojan.os'],
      userEmail: 'customer@example.com',
      cohortKey: 'ob-cohort-aaaa',
    });
    assert.equal(out.enabled, false);
    assert.equal(out.reason, 'not_in_cohort');
  });

  it('sticky percent bucket is deterministic', () => {
    const key = 'ob-cohort-1234abcd';
    const b1 = stickyBucket0to99(key);
    const b2 = stickyBucket0to99(key);
    assert.equal(b1, b2);
    assert.ok(b1 >= 0 && b1 < 100);

    const at1 = evaluateVoiceCoreConfirmAddRollout({
      masterEnabled: true,
      percent: 1,
      internalEmails: [],
      cohortKey: key,
    });
    const at0 = evaluateVoiceCoreConfirmAddRollout({
      masterEnabled: true,
      percent: 0,
      internalEmails: [],
      cohortKey: key,
    });
    assert.equal(at0.enabled, false);
    assert.equal(at1.enabled, b1 < 1);
  });

  it('force include works when master is on', () => {
    const d = evaluateVoiceCoreConfirmAddRollout({
      masterEnabled: true,
      percent: 0,
      internalEmails: [],
      cohortKey: 'ob-cohort-x',
      forceInclude: true,
    });
    assert.equal(d.enabled, true);
    assert.equal(d.reason, 'force_include');
  });
});
