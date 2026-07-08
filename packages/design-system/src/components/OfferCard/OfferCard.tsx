import { Badge } from '../Badge';
import { Card } from '../Card';

export interface OfferCardProps {
  title: string;
  subtitle?: string;
  code?: string;
  className?: string;
}

export function OfferCard({ title, subtitle, code, className }: OfferCardProps) {
  return (
    <Card className={className}>
      <Badge variant="offer">Offer</Badge>
      <div className="bds-text-title" style={{ marginTop: 'var(--bds-space-2)' }}>{title}</div>
      {subtitle ? <p className="bds-text-body-sm" style={{ color: 'var(--bds-color-text-secondary)' }}>{subtitle}</p> : null}
      {code ? <div className="bds-text-label" style={{ marginTop: 'var(--bds-space-3)', color: 'var(--bds-color-primary)' }}>{code}</div> : null}
    </Card>
  );
}
