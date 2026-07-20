import { GoogleAuth } from 'google-auth-library';
import { resolveFirebaseProjectId } from '../../backend-lib/firebase/FirebaseAdminProvider.js';

const IDENTITY_TOOLKIT_CONFIG_URL = (projectId: string) =>
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

export type IdentityToolkitProjectConfig = {
  name?: string;
  authorizedDomains?: string[];
  client?: { apiKey?: string };
};

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error('Failed to obtain GCP access token for Identity Toolkit Admin API.');
  }
  return token.token;
}

/** Read Firebase Auth project config via Identity Toolkit Admin v2 (firebase-admin v13 safe). */
export async function getIdentityToolkitProjectConfig(
  projectId = resolveFirebaseProjectId(),
): Promise<IdentityToolkitProjectConfig> {
  const response = await fetch(IDENTITY_TOOLKIT_CONFIG_URL(projectId), {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Identity Toolkit GET config failed (${response.status}): ${body}`);
  }
  return JSON.parse(body) as IdentityToolkitProjectConfig;
}

/** Patch authorizedDomains via Identity Toolkit Admin v2. */
export async function patchIdentityToolkitAuthorizedDomains(
  authorizedDomains: string[],
  projectId = resolveFirebaseProjectId(),
): Promise<IdentityToolkitProjectConfig> {
  const response = await fetch(
    `${IDENTITY_TOOLKIT_CONFIG_URL(projectId)}?updateMask=authorizedDomains`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorizedDomains }),
    },
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Identity Toolkit PATCH config failed (${response.status}): ${body}`);
  }
  return JSON.parse(body) as IdentityToolkitProjectConfig;
}
