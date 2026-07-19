import { useNavigate } from 'react-router-dom';
import type { RestaurantExperienceResponse } from '@/types/marketplace-restaurant';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { SectionHeader } from '@bhojan/storefront-design-system/primitives/SectionHeader';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { OrderBhojanRestaurantGallery } from './OrderBhojanRestaurantGallery';
import { OrderBhojanAvailableOffersSection } from './OrderBhojanAvailableOffersSection';

export function OrderBhojanRestaurantInfoSections({ data }: { data: RestaurantExperienceResponse }) {
  const navigate = useNavigate();
  const { experience, hours, highlights, policies } = data;
  const hasOffers =
    experience.offers.length > 0 || (experience.promoCodes?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-2 px-4 pb-32 pt-6">
      {hasOffers ? (
        <Section density="comfortable" background="subtle" className="!py-6" aria-label="Available offers">
          <SectionHeader title="Available offers" align="left" className="!mb-4 !text-left" />
          <OrderBhojanAvailableOffersSection
            offers={experience.offers}
            promoCodes={experience.promoCodes}
          />
        </Section>
      ) : null}

      {experience.description ? (
        <Section density="comfortable" background="default" className="!py-6">
          <SectionHeader title="About" align="left" className="!mb-4 !text-left" />
          <p className="text-sm leading-relaxed text-white/75">{experience.description}</p>
        </Section>
      ) : null}

      {experience.subscriptionEnabled ? (
        <Section density="comfortable" background="subtle" className="!py-6">
          <GlassCard hoverEffect={false} className="!rounded-2xl !p-5">
            <SectionHeader
              title="Monthly meal subscription"
              description={`Eat like home every day. Subscribe for daily home-style meals from ${experience.displayName}.`}
              align="left"
              className="!mb-4 !text-left"
            />
            <SoftButton
              type="button"
              onClick={() => navigate(`/restaurant/${experience.slug}/subscription`)}
            >
              View subscription plans
            </SoftButton>
          </GlassCard>
        </Section>
      ) : null}

      {experience.gallery.length > 0 ? <OrderBhojanRestaurantGallery images={experience.gallery} /> : null}

      {highlights.length > 0 ? (
        <Section density="comfortable" background="default" className="!py-6">
          <SectionHeader title="Highlights" align="left" className="!mb-4 !text-left" />
          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <GlassCard key={item.id} hoverEffect={false} className="!rounded-2xl !p-4">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {item.subtitle ? <p className="mt-1 text-xs text-white/55">{item.subtitle}</p> : null}
              </GlassCard>
            ))}
          </div>
        </Section>
      ) : null}

      <Section density="comfortable" background="default" className="!py-6" aria-label="Operating hours">
        <SectionHeader title="Hours" align="left" className="!mb-4 !text-left" />
        <div className="space-y-2">
          {hours.map((row) => (
            <div key={row.day} className="flex items-center justify-between text-sm">
              <span className={row.isToday ? 'font-bold text-white' : 'text-white/70'}>{row.day}</span>
              <span className="text-white/70">
                {row.open} – {row.close}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {policies.length > 0 ? (
        <Section density="comfortable" background="subtle" className="!py-6" aria-label="Policies">
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-white/50">{policy.title}</p>
                <p className="mt-1 text-xs text-white/60">{policy.body}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
