/** Order read projection state (M6 PR-7). Pure domain — no SDK imports. */

export interface OrderProjectionReadModel {
  readonly orderId: string;
  readonly tenantId: string;
  readonly status: string;
  readonly branchId?: string;
  readonly customerId?: string;
  readonly totalAmount?: number;
  readonly currency: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: string;
  readonly projectionVersion: string;
}

export interface OrderProjectionSnapshotRecord {
  readonly snapshotId: string;
  readonly orderId: string;
  readonly tenantId: string;
  readonly projectionVersion: string;
  readonly readModel: OrderProjectionReadModel;
  readonly capturedAt: string;
  readonly lastEventId: string;
  readonly lastEventType: string;
}

export type OrderProjectionState = OrderProjectionReadModel;
