import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  resolveFirebaseProjectId,
  resolveFirebaseCredential,
} from '../FirebaseAdminProvider.js';

describe('FirebaseAdminProvider credential resolution', () => {
  it('requires FIREBASE_PROJECT_ID with no bhojanos2 fallback', () => {
    const prev = { ...process.env };
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCP_PROJECT;

    assert.throws(() => resolveFirebaseProjectId(), /Missing FIREBASE_PROJECT_ID/);

    process.env.FIREBASE_PROJECT_ID = prev.FIREBASE_PROJECT_ID;
    process.env.GOOGLE_CLOUD_PROJECT = prev.GOOGLE_CLOUD_PROJECT;
    process.env.GCP_PROJECT = prev.GCP_PROJECT;
  });

  it('rejects GOOGLE_APPLICATION_CREDENTIALS when path is a directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firebase-cred-dir-'));
    const prev = process.env;
    process.env = {
      ...prev,
      FIREBASE_PROJECT_ID: 'bhojanos-prod',
      FIREBASE_SERVICE_ACCOUNT: '',
      GOOGLE_APPLICATION_CREDENTIALS: dir,
    };

    assert.throws(
      () => resolveFirebaseCredential('bhojanos-prod'),
      /must point to a JSON file, not a directory/,
    );

    process.env = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rejects project mismatch between env and service account file', () => {
    const file = path.join(os.tmpdir(), `firebase-cred-${Date.now()}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify({
        project_id: 'bhojanos2',
        client_email: 'test@bhojanos2.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----\\n',
        token_uri: 'https://oauth2.googleapis.com/token',
      }),
    );

    const prev = process.env;
    process.env = {
      ...prev,
      FIREBASE_PROJECT_ID: 'bhojanos-prod',
      FIREBASE_SERVICE_ACCOUNT: '',
      GOOGLE_APPLICATION_CREDENTIALS: file,
    };

    assert.throws(
      () => resolveFirebaseCredential('bhojanos-prod'),
      /project mismatch/,
    );

    process.env = prev;
    fs.unlinkSync(file);
  });
});
