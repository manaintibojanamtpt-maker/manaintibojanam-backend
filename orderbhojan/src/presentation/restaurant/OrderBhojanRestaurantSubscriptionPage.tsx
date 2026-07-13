import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { useRestaurantExperience } from '@/features/restaurant/hooks/useRestaurantExperience';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getFirebaseFirestore, isFirebaseConfigured } from '@/firebase/init';
import {
  MEAL_SUBSCRIPTION_PLANS,
  weeklyPlanForPreference,
  type DeliverySlot,
  type MealPreference,
} from '@/config/mealSubscriptionPlans';
import {
  createSubscriptionRazorpayOrder,
  openSubscriptionRazorpayCheckout,
  verifySubscriptionRazorpayPayment,
} from '@/features/checkout/infrastructure/razorpayCheckout';
import { OrderBhojanRestaurantErrorState } from '@/presentation/states';
import { OrderBhojanRestaurantSkeleton } from './OrderBhojanRestaurantSkeleton';

function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0]!;
}

export function OrderBhojanRestaurantSubscriptionPage() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const slug = restaurantSlug ?? '';
  const navigate = useNavigate();
  const { sessionUser, isAuthenticated } = useAuth();
  const query = useRestaurantExperience(slug);

  const [selectedPlanId, setSelectedPlanId] = useState<string>('2_meals');
  const [mealPref, setMealPref] = useState<MealPreference>('veg');
  const [deliverySlot, setDeliverySlot] = useState<DeliverySlot>('both');
  const [startDate, setStartDate] = useState(tomorrowIsoDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const activePlan = useMemo(
    () => MEAL_SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) ?? MEAL_SUBSCRIPTION_PLANS[1]!,
    [selectedPlanId],
  );

  useEffect(() => {
    if (!isAuthenticated && slug) {
      navigate(`/auth?returnTo=${encodeURIComponent(`/restaurant/${slug}/subscription`)}`, {
        replace: true,
      });
    }
  }, [isAuthenticated, navigate, slug]);

  if (query.isLoading) {
    return <OrderBhojanRestaurantSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4 px-4 py-8">
        <OrderBhojanRestaurantErrorState onRetry={() => void query.refetch()} />
        <SoftButton type="button" tone="ghost" onClick={() => navigate(`/restaurant/${slug}`)}>
          Back to restaurant
        </SoftButton>
      </div>
    );
  }

  const { experience } = query.data;

  if (!experience.subscriptionEnabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-white">
        <p className="text-lg font-semibold">Subscriptions are not enabled for this kitchen.</p>
        <SoftButton type="button" className="mt-6" onClick={() => navigate(`/restaurant/${slug}`)}>
          Back to restaurant
        </SoftButton>
      </div>
    );
  }

  const handleSubscribe = async () => {
    if (!sessionUser?.uid) return;
    if (!isFirebaseConfigured()) {
      setError('Sign-in is required to subscribe.');
      return;
    }

    const db = getFirebaseFirestore();
    if (!db) {
      setError('Unable to connect to subscription service.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const paymentSession = await createSubscriptionRazorpayOrder({
        planId: activePlan.id,
        userId: sessionUser.uid,
      });

      const paymentPayload = await openSubscriptionRazorpayCheckout({
        razorpayOrderId: paymentSession.razorpayOrderId,
        amount: paymentSession.amount,
        currency: paymentSession.currency,
        key: paymentSession.key,
        merchantName: experience.displayName,
        customerName: sessionUser.displayName ?? undefined,
        customerEmail: sessionUser.email ?? undefined,
        phone: sessionUser.phoneNumber ?? undefined,
        isMock: paymentSession.isMock,
      });

      if (!paymentSession.isMock) {
        await verifySubscriptionRazorpayPayment(paymentPayload);
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await addDoc(collection(db, 'subscriptions'), {
        userId: sessionUser.uid,
        tenantId: slug,
        planType: activePlan.id,
        price: activePlan.price,
        finalPrice: activePlan.price,
        startDate,
        endDate: endDate.toISOString(),
        mealsPerDay: activePlan.mealsPerDay,
        mealPreference: mealPref,
        weeklyPlan: weeklyPlanForPreference(mealPref),
        deliverySlot,
        status: 'active',
        source: 'orderbhojan_marketplace',
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#030303] px-4 py-16 text-white">
        <GlassCard hoverEffect={false} className="mx-auto max-w-lg !rounded-3xl !p-8 text-center">
          <SectionHeader
            title="Subscription active"
            description={`Your monthly meal plan with ${experience.displayName} is confirmed.`}
            align="center"
          />
          <SoftButton type="button" className="mt-6 w-full" onClick={() => navigate('/orders')}>
            View my orders
          </SoftButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] pb-24 text-white">
      <Section density="comfortable" background="default" className="!pt-8">
        <div className="mx-auto max-w-lg space-y-6 px-4">
          <SoftButton type="button" tone="ghost" size="compact" onClick={() => navigate(`/restaurant/${slug}`)}>
            ← Back to {experience.displayName}
          </SoftButton>

          <SectionHeader
            title="Monthly meal subscription"
            description={`Daily home-style meals from ${experience.displayName}. Works for any kitchen that enables subscriptions.`}
            align="left"
          />

          <div
            className="space-y-3"
            role="radiogroup"
            aria-labelledby="subscription-plan-heading"
          >
            <p id="subscription-plan-heading" className="sr-only">
              Choose a meal plan
            </p>
            {MEAL_SUBSCRIPTION_PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={selectedPlanId === plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full rounded-2xl border p-4 text-left transition touch-manipulation ${
                  selectedPlanId === plan.id
                    ? 'border-[#FF7A00] bg-[#FF7A00]/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{plan.title}</p>
                    <p className="text-xs text-white/55">{plan.description}</p>
                  </div>
                  <p className="text-lg font-bold text-[#FF7A00]">₹{plan.price}</p>
                </div>
              </button>
            ))}
          </div>

          <GlassCard hoverEffect={false} className="space-y-4 !rounded-2xl !p-5">
            <fieldset className="space-y-3 border-0 p-0">
              <legend className="text-sm font-semibold">Meal preference</legend>
              <div className="flex flex-wrap gap-2">
                {(['veg', 'egg', 'nonveg'] as MealPreference[]).map((pref) => (
                  <SoftButton
                    key={pref}
                    type="button"
                    tone={mealPref === pref ? 'primary' : 'ghost'}
                    size="compact"
                    onClick={() => setMealPref(pref)}
                  >
                    {pref === 'nonveg' ? 'Non-veg' : pref.charAt(0).toUpperCase() + pref.slice(1)}
                  </SoftButton>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3 border-0 p-0">
              <legend className="text-sm font-semibold">Delivery slot</legend>
              <div className="flex flex-wrap gap-2">
                {(['lunch', 'dinner', 'both'] as DeliverySlot[]).map((slot) => (
                  <SoftButton
                    key={slot}
                    type="button"
                    tone={deliverySlot === slot ? 'primary' : 'ghost'}
                    size="compact"
                    onClick={() => setDeliverySlot(slot)}
                  >
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </SoftButton>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-semibold">
              Start date
              <input
                type="date"
                value={startDate}
                min={tomorrowIsoDate()}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
          </GlassCard>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <SoftButton type="button" className="w-full" disabled={submitting} onClick={() => void handleSubscribe()}>
            {submitting ? 'Processing…' : `Subscribe — ₹${activePlan.price}/month`}
          </SoftButton>
        </div>
      </Section>
    </div>
  );
}
