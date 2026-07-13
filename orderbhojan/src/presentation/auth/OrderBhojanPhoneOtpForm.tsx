import { useNavigate, useLocation } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { AuthOtpStepView, AuthPhoneStepView } from '@bhojan/storefront-design-system/auth';
import {
  phoneOtpSendSchema,
  phoneOtpVerifySchema,
  type PhoneOtpSendInput,
  type PhoneOtpVerifyInput,
} from '@/features/auth/domain/auth.types';
import { useAuth } from '@/shared/providers/AuthProvider';
import { isAuthFlowError } from '@/features/auth/application/authService';
import { resolveAuthRedirect } from './resolveAuthRedirect';

const RECAPTCHA_CONTAINER_ID = 'ob-phone-recaptcha';

export function OrderBhojanPhoneOtpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startPhoneSignIn, completePhoneSignIn } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const redirectTo = resolveAuthRedirect(location);

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
    <div className="flex flex-col gap-3">
      {step === 'phone' ? (
        <Controller
          control={phoneForm.control}
          name="phone"
          render={({ field, fieldState }) => (
            <AuthPhoneStepView
              phone={field.value}
              phoneError={fieldState.error?.message ?? error ?? undefined}
              pending={pending}
              onPhoneChange={field.onChange}
              onSubmit={() => void onSendOtp()}
              recaptchaContainerId={RECAPTCHA_CONTAINER_ID}
              showRecaptcha
            />
          )}
        />
      ) : (
        <Controller
          control={otpForm.control}
          name="otp"
          render={({ field, fieldState }) => (
            <AuthOtpStepView
              otp={field.value}
              otpError={fieldState.error?.message ?? error ?? undefined}
              pending={pending}
              onOtpChange={field.onChange}
              onSubmit={() => void onVerifyOtp()}
              onBack={() => {
                setStep('phone');
                setError(null);
              }}
            />
          )}
        />
      )}
    </div>
  );
}
