import type { InputHTMLAttributes } from 'react';

export interface TextFieldViewProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly className?: string;
}

export function TextFieldView({
  label,
  hint,
  error,
  className = '',
  id,
  ...inputProps
}: TextFieldViewProps) {
  const fieldId = id ?? label.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      <label htmlFor={fieldId} className="text-xs font-semibold uppercase tracking-wide text-white/60">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#FF7A00]/50 focus:ring-2 focus:ring-[#FF7A00]/20"
        {...inputProps}
      />
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-sm text-white/50">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
