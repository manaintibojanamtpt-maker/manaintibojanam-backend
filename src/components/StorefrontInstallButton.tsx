import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { useStorefrontInstall } from '../hooks/useStorefrontInstall';
import { slugToDisplayName } from '../lib/tenantPath';
import {
  StorefrontInstallButtonView,
  type StorefrontInstallButtonVariant,
} from '../design-system/layout/StorefrontInstallButtonView';

interface StorefrontInstallButtonProps {
  variant?: StorefrontInstallButtonVariant;
  className?: string;
}

const StorefrontInstallButton: React.FC<StorefrontInstallButtonProps> = ({
  variant = 'pill',
  className = '',
}) => {
  const { tenantInfo, tenantSlug } = useTenant();
  const { showInstallAction, ios, canNativeInstall, triggerInstall } = useStorefrontInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  if (!showInstallAction || !tenantSlug) return null;

  const kitchenName = tenantInfo?.name || slugToDisplayName(tenantSlug);
  const shortLabel = variant === 'icon' ? 'Install app' : `Install ${kitchenName}`;

  const handleInstallClick = async () => {
    if (ios || !canNativeInstall) {
      setIosGuideOpen(true);
      return;
    }
    await triggerInstall();
  };

  return (
    <StorefrontInstallButtonView
      variant={variant}
      className={className}
      shortLabel={shortLabel}
      kitchenName={kitchenName}
      tenantSlug={tenantSlug}
      iosGuideOpen={iosGuideOpen}
      onCloseGuide={() => setIosGuideOpen(false)}
      onInstallClick={() => void handleInstallClick()}
    />
  );
};

export default StorefrontInstallButton;
