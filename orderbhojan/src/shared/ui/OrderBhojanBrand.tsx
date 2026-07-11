import { Link } from 'react-router-dom';

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
        className={`rounded-xl object-cover ${variant === 'nav' ? 'h-9 w-9' : 'h-8 w-8'}`}
        width={variant === 'nav' ? 36 : 32}
        height={variant === 'nav' ? 36 : 32}
        decoding="async"
      />
      <span className="text-sm font-extrabold tracking-tight text-white">OrderBhojan</span>
    </>
  );

  const className = `inline-flex items-center gap-2 ${variant === 'nav' ? 'text-base' : 'text-sm'}`;

  if (linkToHome) {
    return (
      <Link to="/" aria-label="OrderBhojan home" className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
