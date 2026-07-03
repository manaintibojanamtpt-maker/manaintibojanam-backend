import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BranchDetail, BranchETAEstimate, BranchValidationResult } from '../../sdk/branch/dto';
import type { BranchOperationsAvailabilityDto } from '../../sdk/branch/dto/operations';
import type { BranchSummary } from '../../sdk/branch/dto/branch';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { TenantId } from '../../sdk/core/types';
import { OwnerBranchManagementView } from '../../components/owner/branches/OwnerBranchManagementView';
import { OwnerBranchCard } from '../../components/owner/branches/OwnerBranchCard';
import { OwnerBranchList } from '../../components/owner/branches/OwnerBranchList';
import { OwnerBranchDetails } from '../../components/owner/branches/OwnerBranchDetails';
import { OwnerBranchOperationalStatus } from '../../components/owner/branches/OwnerBranchOperationalStatus';
import { OwnerBranchEta, OwnerBranchValidation } from '../../components/owner/branches/OwnerBranchEta';
import {
  OwnerBranchDisabledState,
  OwnerBranchEmptyState,
  OwnerBranchErrorState,
  OwnerBranchLoadingState,
} from '../../components/owner/branches/OwnerBranchStates';
import {
  buildOperationalStatusAriaLabel,
  buildOwnerBranchListAriaLabel,
  formatBranchStatusLabel,
  formatEtaLabel,
  formatOperationalAvailabilityLabel,
  formatValidationLabel,
} from '../../lib/owner-branches/ownerBranchViewHelpers';

const TENANT_ID = 'paradise' as TenantId;
const BRANCH_ID = 'paradise-hitech' as BranchId;

const BRANCH_SUMMARY: BranchSummary = {
  branchId: BRANCH_ID,
  tenantId: TENANT_ID,
  name: 'Paradise — Hitech City',
  slug: 'hitech-city',
  status: 'active',
  isDefault: true,
};

const BRANCH_DETAIL: BranchDetail = {
  ...BRANCH_SUMMARY,
  location: { point: { lat: 17.44, lng: 78.38 }, formattedAddress: 'Hitech City' },
};

const AVAILABILITY: BranchOperationsAvailabilityDto = {
  branchId: BRANCH_ID,
  enabled: true,
  isOperationallyAvailable: true,
  blockers: [],
  hours: { status: 'open', isOpen: true, reasons: [] },
  capacity: {
    status: 'available',
    isAvailable: true,
    activeOrders: 2,
    maxConcurrentOrders: 10,
    utilizationRatio: 0.2,
    reasons: [],
  },
  inventory: {
    status: 'complete',
    isSufficient: true,
    requestedCount: 0,
    unavailableCount: 0,
    missingItemIds: [],
    reasons: [],
  },
  operationalStatus: {
    isActive: true,
    status: 'active',
    reasons: [],
  },
  evaluatedAt: 1_700_000_000_000,
};

const VALIDATION: BranchValidationResult = {
  branchId: BRANCH_ID,
  isValid: true,
  eligibility: {
    branchId: BRANCH_ID,
    isEligible: true,
    status: 'serviceable',
    distanceKm: 1.2,
    maxRadiusKm: 10,
    reasons: [],
  },
  issues: [],
};

const ETA: BranchETAEstimate = {
  branchId: BRANCH_ID,
  prepTimeMins: 12,
  deliveryTimeMins: 6,
  totalMins: 18,
  confidence: 'high',
};

const noop = (): void => undefined;

describe('Owner Branch Management UI (M5 PR-14)', () => {
  describe('view helpers', () => {
    it('formats branch status labels deterministically', () => {
      assert.equal(formatBranchStatusLabel('active'), 'Active');
      assert.equal(formatBranchStatusLabel('closed'), 'Closed');
    });

    it('formats operational availability label', () => {
      assert.equal(formatOperationalAvailabilityLabel(AVAILABILITY), 'Operationally available');
    });

    it('formats validation and ETA labels', () => {
      assert.equal(formatValidationLabel(VALIDATION), 'Serviceable');
      assert.equal(formatEtaLabel(ETA), '18 min total (12 prep + 6 delivery)');
    });

    it('builds accessible list and operational labels', () => {
      assert.equal(buildOwnerBranchListAriaLabel(2), '2 branches listed');
      assert.match(buildOperationalStatusAriaLabel(AVAILABILITY), /open/);
    });
  });

  describe('state components', () => {
    it('renders loading state with status role', () => {
      const html = renderToStaticMarkup(<OwnerBranchLoadingState />);
      assert.match(html, /role="status"/);
      assert.match(html, /Loading branch information/);
      assert.match(html, /aria-busy="true"/);
    });

    it('renders empty state', () => {
      const html = renderToStaticMarkup(<OwnerBranchEmptyState />);
      assert.match(html, /No branches yet/);
    });

    it('renders error state with retry', () => {
      const html = renderToStaticMarkup(
        <OwnerBranchErrorState
          error={{
            code: 'UNAVAILABLE',
            message: 'temporary',
            userMessage: 'Branch data is temporarily unavailable.',
            retryable: true,
          }}
          onRetry={noop}
        />
      );
      assert.match(html, /role="alert"/);
      assert.match(html, /Retry/);
      assert.match(html, /temporarily unavailable/);
    });

    it('renders disabled state when feature flag is off', () => {
      const html = renderToStaticMarkup(<OwnerBranchDisabledState />);
      assert.match(html, /Branch management is not enabled/);
      assert.match(html, /FF_BRANCH_OWNER_ENABLED/);
    });
  });

  describe('branch panels', () => {
    it('renders branch list', () => {
      const html = renderToStaticMarkup(
        <OwnerBranchList
          branches={[BRANCH_SUMMARY]}
          selectedBranchId={BRANCH_ID}
          onSelectBranch={noop}
        />
      );
      assert.match(html, /Paradise — Hitech City/);
      assert.match(html, /1 branch listed/);
    });

    it('renders branch card with pressed state', () => {
      const html = renderToStaticMarkup(
        <OwnerBranchCard branch={BRANCH_SUMMARY} selected onSelect={noop} />
      );
      assert.match(html, /aria-pressed="true"/);
      assert.match(html, /Default/);
    });

    it('renders branch details', () => {
      const html = renderToStaticMarkup(<OwnerBranchDetails branch={BRANCH_DETAIL} />);
      assert.match(html, /Branch details/);
      assert.match(html, /Hitech City/);
    });

    it('renders operational availability', () => {
      const html = renderToStaticMarkup(<OwnerBranchOperationalStatus availability={AVAILABILITY} />);
      assert.match(html, /Operational availability/);
      assert.match(html, /Operationally available/);
      assert.match(html, /Open/);
    });

    it('renders ETA and validation panels', () => {
      const etaHtml = renderToStaticMarkup(<OwnerBranchEta estimate={ETA} />);
      const validationHtml = renderToStaticMarkup(<OwnerBranchValidation validation={VALIDATION} />);

      assert.match(etaHtml, /18 min total/);
      assert.match(validationHtml, /Serviceable/);
    });
  });

  describe('OwnerBranchManagementView', () => {
    it('renders disabled view when feature flag is off', () => {
      const html = renderToStaticMarkup(
        <OwnerBranchManagementView
          phase="disabled"
          branches={[]}
          selectedBranchId={null}
          branch={null}
          availability={null}
          validation={null}
          estimate={null}
          error={null}
          sessionStatus="disabled"
          isRefreshing={false}
          onSelectBranch={noop}
          onRefresh={noop}
          onRetry={noop}
        />
      );

      assert.match(html, /Branch management is not enabled/);
      assert.doesNotMatch(html, /Refresh/);
    });

    it('renders ready view with all panels when feature flag is on', () => {
      const html = renderToStaticMarkup(
        <OwnerBranchManagementView
          phase="ready"
          branches={[BRANCH_SUMMARY]}
          selectedBranchId={BRANCH_ID}
          branch={BRANCH_DETAIL}
          availability={AVAILABILITY}
          validation={VALIDATION}
          estimate={ETA}
          error={null}
          sessionStatus="success"
          isRefreshing={false}
          onSelectBranch={noop}
          onRefresh={noop}
          onRetry={noop}
        />
      );

      assert.match(html, /Branch management/);
      assert.match(html, /Refresh/);
      assert.match(html, /Paradise — Hitech City/);
      assert.match(html, /Operational availability/);
      assert.match(html, /Serviceable/);
      assert.match(html, /18 min total/);
    });

    it('renders loading view', () => {
      const html = renderToStaticMarkup(
        <OwnerBranchManagementView
          phase="loading"
          branches={[]}
          selectedBranchId={null}
          branch={null}
          availability={null}
          validation={null}
          estimate={null}
          error={null}
          sessionStatus="loading"
          isRefreshing={false}
          onSelectBranch={noop}
          onRefresh={noop}
          onRetry={noop}
        />
      );

      assert.match(html, /Loading branch information/);
    });

    it('renders empty view', () => {
      const html = renderToStaticMarkup(
        <OwnerBranchManagementView
          phase="empty"
          branches={[]}
          selectedBranchId={null}
          branch={null}
          availability={null}
          validation={null}
          estimate={null}
          error={null}
          sessionStatus="empty"
          isRefreshing={false}
          onSelectBranch={noop}
          onRefresh={noop}
          onRetry={noop}
        />
      );

      assert.match(html, /No branches yet/);
    });

    it('renders error view with retry affordance', () => {
      const html = renderToStaticMarkup(
        <OwnerBranchManagementView
          phase="error"
          branches={[BRANCH_SUMMARY]}
          selectedBranchId={BRANCH_ID}
          branch={null}
          availability={null}
          validation={null}
          estimate={null}
          error={{
            code: 'UNAVAILABLE',
            message: 'temporary',
            userMessage: 'Branch data is temporarily unavailable.',
            retryable: true,
          }}
          sessionStatus="error"
          isRefreshing={false}
          onSelectBranch={noop}
          onRefresh={noop}
          onRetry={noop}
        />
      );

      assert.match(html, /Unable to load branch data/);
      assert.match(html, /Retry/);
    });
  });
});
