import { Link } from 'react-router-dom';
import { Text } from '@bhojan/design-system';

const LOGO_SRC = '/brand/orderbhojan-logo.png';

interface OrderBhojanBrandProps {
  readonly variant?: 'compact' | 'nav';
  readonly linkToHome?: boolean;
}

export function OrderBhojanBrand({ variant = 'compact', linkToHome = true }: OrderBhojanBrandProps) {
  const content = (
    <>
      <img
        src={LOGO_SRC}
        alt=""
        className={`ob-brand__logo ob-brand__logo--${variant}`}
        width={variant === 'nav' ? 36 : 32}
        height={variant === 'nav' ? 36 : 32}
        decoding="async"
      />
      <Text variant="subtitle" as="span" className="ob-brand__name">
        OrderBhojan
      </Text>
    </>
  );

  if (linkToHome) {
    return (
      <Link to="/" aria-label="OrderBhojan home" className={`ob-brand ob-brand--${variant}`}>
        {content}
      </Link>
    );
  }

  return <div className={`ob-brand ob-brand--${variant}`}>{content}</div>;
}
