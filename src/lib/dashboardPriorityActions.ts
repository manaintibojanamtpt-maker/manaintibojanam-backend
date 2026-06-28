export interface DashboardPriorityAction {
  id: string;
  title: string;
  message: string;
  action: string;
  link: string | null;
  impact: string;
  isPrimary: boolean;
  isUrgent: boolean;
}

type PriorityContext = {
  storeStatus?: string;
  sandboxMode?: boolean;
  isSandboxActive?: boolean;
  deliveryFreeRadius?: number;
  menuCount: number;
  totalOrders?: number;
};

export function getDashboardPriorityActions(ctx: PriorityContext): DashboardPriorityAction[] {
  const priorities: DashboardPriorityAction[] = [];
  const isSandboxActive = ctx.isSandboxActive ?? (ctx.storeStatus === 'published' && !!ctx.sandboxMode);

  if (ctx.storeStatus === 'draft' && !isSandboxActive) {
    priorities.push({
      id: 'activate-sandbox',
      title: 'Activate Sandbox Mode',
      message: 'Complete the minimum requirements to publish your store and start receiving orders.',
      action: 'Review Sandbox Requirements',
      link: '/owner/dashboard#sandbox-requirements',
      impact: 'High Impact: Start earning revenue today',
      isPrimary: true,
      isUrgent: true,
    });
  }

  if (isSandboxActive && (ctx.totalOrders ?? 0) === 0) {
    priorities.push({
      id: 'first-customer',
      title: 'Get Your First Customer',
      message: 'Send a direct message to family and friends.',
      action: 'Share on WhatsApp',
      link: 'whatsapp_direct',
      impact: 'High Impact: Generates initial traction',
      isPrimary: true,
      isUrgent: true,
    });
    priorities.push({
      id: 'whatsapp-status',
      title: 'Share to WhatsApp Status',
      message: 'Let your entire contacts list know you are open for business.',
      action: 'Share to Status',
      link: 'whatsapp_status',
      impact: 'High Impact: Drives local awareness',
      isPrimary: true,
      isUrgent: false,
    });
  }

  if (!ctx.deliveryFreeRadius) {
    priorities.push({
      id: 'delivery-settings',
      title: 'Complete Delivery Settings',
      message: 'Set your delivery radius to avoid declining out-of-range orders.',
      action: 'Configure Delivery',
      link: '/owner/settings?tab=location',
      impact: 'Medium Impact: Reduces canceled orders',
      isPrimary: false,
      isUrgent: true,
    });
  }

  if (ctx.menuCount < 5) {
    priorities.push({
      id: 'expand-menu',
      title: 'Expand Your Menu',
      message: `Stores with 5+ items receive more orders. You currently have ${ctx.menuCount} items.`,
      action: 'Add Menu Items',
      link: '/owner/menu',
      impact: 'High Impact: Increases order conversion',
      isPrimary: false,
      isUrgent: ctx.menuCount < 3,
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      id: 'share-store',
      title: 'Share Store Link',
      message: 'Keep the momentum going! Share your store link on Instagram, Facebook, and WhatsApp.',
      action: 'Share Store',
      link: 'whatsapp_direct',
      impact: 'Low Effort: Drives organic traffic',
      isPrimary: false,
      isUrgent: false,
    });
  }

  return priorities.slice(0, 3);
}

export function countUrgentAttentionItems(
  priorityActions: DashboardPriorityAction[],
  criticalInventoryCount: number,
  unreadNotificationCount: number
): number {
  const urgentActions = priorityActions.filter((a) => a.isUrgent).length;
  return criticalInventoryCount + unreadNotificationCount + urgentActions;
}

/** Firestore tenant doc id for owner-scoped subcollections */
export function resolveOwnerTenantDocId(
  ownedTenantIds: string[] | undefined,
  contextTenantId?: string,
  contextTenantSlug?: string
): string | undefined {
  if (ownedTenantIds?.length) {
    if (contextTenantId && ownedTenantIds.includes(contextTenantId)) return contextTenantId;
    if (contextTenantSlug && ownedTenantIds.includes(contextTenantSlug)) return contextTenantSlug;
    return ownedTenantIds[0];
  }
  return contextTenantSlug || contextTenantId;
}
