import { useNavigate, useLocation } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Text, Toast } from '@bhojan/design-system';
import { useState } from 'react';
import {
  phoneOtpSendSchema,
  phoneOtpVerifySchema,
  type PhoneOtpSendInput,
  type PhoneOtpVerifyInput,
} from '../domain/auth.types';
import { useAuth } from '@/shared/providers/AuthProvider';
import { isAuthFlowError } from '../application/authService';

const RECAPTCHA_CONTAINER_ID = 'ob-phone-recaptcha';

export function PhoneOtpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startPhoneSignIn, completePhoneSignIn } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  const phoneForm = useForm<PhoneOtpSendInput>({
    resolver: zodResolver(phoneOtpSendSchema),
    defaultValues: { phone: '' },
  });

  const otpForm = useForm<PhoneOtpVerifyInput>({
    resolver: zodResolver(phoneOtpVerifySchema),
    defaultValues: { phone: '', otp: '' },
  });

  const onSendOtp = phoneForm.handleSubmit(async (values) => {
    setPending(true);
    setError(null);
    try {
      await startPhoneSignIn(values.phone, RECAPTCHA_CONTAINER_ID);
      otpForm.setValue('phone', values.phone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP.');
    } finally {
      setPending(false);
    }
  });

  const onVerifyOtp = otpForm.handleSubmit(async (values) => {
    setPending(true);
    setError(null);
    try {
      await completePhoneSignIn(values.otp);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(isAuthFlowError(err) ? err.message : 'Invalid OTP. Try again.');
    } finally {
      setPending(false);
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-4)' }}>
      <div id={RECAPTCHA_CONTAINER_ID} aria-hidden={step !== 'phone'} />
      {step === 'phone' ? (
        <form onSubmit={onSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-3)' }}>
          <Controller
            control={phoneForm.control}
            name="phone"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="Mobile number"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile"
                error={fieldState.error?.message}
              />
            )}
          />
          <Button type="submit" fullWidth loading={pending} aria-label="Send one-time password">
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bds-space-3)' }}>
          <Text variant="bodySm" style={{ color: 'var(--bds-color-text-secondary)' }}>
            OTP sent to +91 {otpForm.getValues('phone')}
          </Text>
          <Controller
            control={otpForm.control}
            name="otp"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="One-time password"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit OTP"
                error={fieldState.error?.message}
              />
            )}
          />
          <Button type="submit" fullWidth loading={pending} aria-label="Verify one-time password">
            Verify & Sign In
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setStep('phone'); setError(null); }}>
            Change number
          </Button>
        </form>
      )}
      {error ? (
        <Toast
          message={error}
          variant="danger"
          onDismiss={() => setError(null)}
        />
      ) : null}
    </div>
  );
}
