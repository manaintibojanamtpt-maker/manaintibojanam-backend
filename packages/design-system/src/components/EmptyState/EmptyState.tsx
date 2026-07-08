import React from 'react';
import { Button } from '../Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="bds-empty">
      {icon}
      <div className="bds-empty__title">{title}</div>
      {description ? <p className="bds-empty__desc">{description}</p> : null}
      {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, retryLabel = 'Try again', onRetry }: ErrorStateProps) {
  return (
    <div className="bds-error" role="alert">
      <div className="bds-error__title">{title}</div>
      {description ? <p className="bds-error__desc">{description}</p> : null}
      {onRetry ? <Button variant="outlined" onClick={onRetry}>{retryLabel}</Button> : null}
    </div>
  );
}

export interface FeatureFlagProps {
  enabled: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureFlag({ enabled, children, fallback = null }: FeatureFlagProps) {
  return enabled ? <>{children}</> : <>{fallback}</>;
}
