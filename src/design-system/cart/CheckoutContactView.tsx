import { GlassCard } from '../primitives/GlassCard';
import { TextFieldView } from '../primitives/TextFieldView';
import type { CheckoutContactViewModel } from './types';

export interface CheckoutContactViewProps {
  readonly contact: CheckoutContactViewModel;
  readonly onChange: (value: string) => void;
}

export function CheckoutContactView({ contact, onChange }: CheckoutContactViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4" aria-label="Contact details">
      <TextFieldView
        label="Mobile number"
        inputMode="numeric"
        autoComplete="tel"
        value={contact.value}
        hint={contact.hint}
        error={contact.error}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 10))}
      />
    </GlassCard>
  );
}
