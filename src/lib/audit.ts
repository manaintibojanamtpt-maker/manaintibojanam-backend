import { getDb } from './firebase-db';
import { collection, addDoc } from 'firebase/firestore';

export type AuditEventAction = 
  | 'MERCHANT_AGREEMENT_ACCEPTED'
  | 'SUBSCRIPTION_AGREEMENT_ACCEPTED'
  | 'KYC_SUBMITTED'
  | 'KYC_VERIFIED'
  | 'KYC_REJECTED'
  | 'FSSAI_SUBMITTED'
  | 'FSSAI_VERIFIED'
  | 'TENANT_PUBLISHED'
  | 'TENANT_SUSPENDED'
  | 'PLAN_ACTIVATED'
  | 'TRIAL_ACTIVATED';

export interface AuditEvent {
  tenantId: string;
  action: AuditEventAction;
  actor: string; // userId of the person performing the action (owner, admin, superadmin)
  actorRole: string;
  metadata?: any;
  ipAddress?: string; // Optional, hard to get on client-side purely, but can pass if available
  timestamp?: string;
}

export const logAuditEvent = async (event: AuditEvent) => {
  try {
    const db = getDb();
    await addDoc(collection(db, 'audit_logs'), {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    });
    console.log(`[AUDIT] ${event.action} by ${event.actorRole} (${event.actor})`);
  } catch (error) {
    console.error('Failed to log audit event', error);
  }
};
