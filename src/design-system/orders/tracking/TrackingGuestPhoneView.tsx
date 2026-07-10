import { TextFieldView } from '../../primitives/TextFieldView';
import { SoftButton } from '../../primitives/SoftButton';
import { TransactionalPageShell } from '../../cart/TransactionalPageShell';

export interface TrackingGuestPhoneViewProps {
  readonly phone: string;
  readonly submitLabel: string;
  readonly submitDisabled: boolean;
  readonly onPhoneChange: (value: string) => void;
  readonly onSubmit: () => void;
}

export function TrackingGuestPhoneView({
  phone,
  submitLabel,
  submitDisabled,
  onPhoneChange,
  onSubmit,
}: TrackingGuestPhoneViewProps) {
  return (
    <TransactionalPageShell title="Track order" subtitle="Enter the mobile number used for this order">
      <TextFieldView
        label="Mobile number"
        inputMode="numeric"
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value.replace(/\D/g, '').slice(0, 10))}
      />
      <SoftButton type="button" disabled={submitDisabled} onClick={onSubmit}>
        {submitLabel}
      </SoftButton>
    </TransactionalPageShell>
  );
}
