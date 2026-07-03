/**
 * M5 PR-14 — owner branch management page (read-only).
 */

import React from 'react';
import type { OwnerBranchManagementApi } from '../../lib/owner-branches/ownerBranchManagementApi';
import { useOwnerBranchManagement } from '../../hooks/useOwnerBranchManagement';
import { OwnerBranchManagementView } from '../../components/owner/branches/OwnerBranchManagementView';

export interface OwnerBranchManagementPageProps {
  readonly tenantId?: string | null;
  readonly api?: OwnerBranchManagementApi;
}

const OwnerBranchManagement: React.FC<OwnerBranchManagementPageProps> = ({
  tenantId,
  api,
}) => {
  const management = useOwnerBranchManagement({ tenantId, api });

  return (
    <OwnerBranchManagementView
      phase={management.phase}
      branches={management.branches}
      selectedBranchId={management.selectedBranchId}
      branch={management.branch}
      availability={management.availability}
      validation={management.validation}
      estimate={management.estimate}
      error={management.error}
      sessionStatus={management.sessionStatus}
      isRefreshing={management.isRefreshing}
      onSelectBranch={management.selectBranch}
      onRefresh={() => {
        void management.refresh();
      }}
      onRetry={() => {
        void management.retry();
      }}
    />
  );
};

export default OwnerBranchManagement;

export { OwnerBranchManagementView } from '../../components/owner/branches/OwnerBranchManagementView';
export type { OwnerBranchManagementViewProps } from '../../components/owner/branches/OwnerBranchManagementView';
