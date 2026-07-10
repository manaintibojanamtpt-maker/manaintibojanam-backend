import { TextFieldView } from '../primitives/TextFieldView';
import { SoftButton } from '../primitives/SoftButton';

export interface AuthPhoneStepViewProps {
  readonly phone: string;
  readonly phoneError?: string;
  readonly pending: boolean;
  readonly onPhoneChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly recaptchaContainerId: string;
  readonly showRecaptcha: boolean;
}

export function AuthPhoneStepView({
  phone,
  phoneError,
  pending,
  onPhoneChange,
  onSubmit,
  recaptchaContainerId,
  showRecaptcha,
}: AuthPhoneStepViewProps) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div id={recaptchaContainerId} aria-hidden={!showRecaptcha} />
      <TextFieldView
        label="Mobile number"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="10-digit mobile"
        value={phone}
        error={phoneError}
        onChange={(event) => onPhoneChange(event.target.value.replace(/\D/g, '').slice(0, 10))}
      />
      <SoftButton type="submit" fullWidth disabled={pending}>
        {pending ? 'Sending OTP…' : 'Send OTP'}
      </SoftButton>
    </form>
  );
}

export interface AuthOtpStepViewProps {
  readonly otp: string;
  readonly otpError?: string;
  readonly pending: boolean;
  readonly onOtpChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onBack: () => void;
}

export function AuthOtpStepView({
  otp,
  otpError,
  pending,
  onOtpChange,
  onSubmit,
  onBack,
}: AuthOtpStepViewProps) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <TextFieldView
        label="OTP"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="6-digit code"
        value={otp}
        error={otpError}
        onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      <SoftButton type="submit" fullWidth disabled={pending}>
        {pending ? 'Verifying…' : 'Verify & sign in'}
      </SoftButton>
      <SoftButton type="button" tone="ghost" fullWidth onClick={onBack}>
        Change number
      </SoftButton>
    </form>
  );
}
