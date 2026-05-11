import React from 'react';
import { Clock, MapPin, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';

interface MobileRestaurantHeaderProps {
  restaurantName: string;
  rating?: string;
  showRating?: boolean;
  deliveryAddress?: string;
  deliverySchedule?: string;
  deliveryMessage?: string;
  showDeliveryDetails?: boolean;
}

const MobileRestaurantHeader: React.FC<MobileRestaurantHeaderProps> = ({
  restaurantName,
  rating = '4.3',
  showRating = true,
  deliveryAddress,
  deliverySchedule,
  deliveryMessage,
  showDeliveryDetails = true
}) => {
  return (
    <section className="bg-transparent px-3 pb-2 pt-3 sm:px-4">
      <div className="mib-food-card overflow-hidden rounded-[1.75rem]">
        <div className="relative p-4 sm:p-5">
          <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-36 w-36 rounded-full bg-red-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-red-500 to-orange-600 text-lg font-black text-white shadow-[0_18px_36px_-22px_rgba(255,107,53,1)]">
                M
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="mib-soft-pill border-orange-400/20 bg-orange-400/10 text-orange-100">
                    <Sparkles size={11} />
                    Home kitchen
                  </span>
                  <span className="mib-soft-pill text-white/70">
                    <ShieldCheck size={11} />
                    Hygienic
                  </span>
                </div>
                <h1 className="max-w-[13rem] whitespace-normal break-words text-lg font-black leading-[1.05] tracking-[-0.04em] text-white min-[380px]:max-w-none min-[380px]:text-xl sm:text-2xl">
                  {restaurantName}
                </h1>
                <p className="mt-1 text-xs font-semibold text-white/55">
                  {deliveryMessage || 'Authentic Andhra meals, cooked fresh to order'}
                </p>
              </div>
            </div>

            {showRating && (
              <div className="flex flex-shrink-0 items-center gap-1 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-2.5 py-2 text-amber-200 sm:px-3">
                <Star size={14} className="fill-amber-300 text-amber-300" />
                <span className="text-sm font-black">{rating}</span>
              </div>
            )}
          </div>

          {showDeliveryDetails && (
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.055] p-3">
                <div className="mb-1 flex items-center gap-2 text-orange-200">
                  <Clock size={14} />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]">Delivery</span>
                </div>
                <p className="text-sm font-black text-white">{deliverySchedule || '30-45 mins'}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.055] p-3">
                <div className="mb-1 flex items-center gap-2 text-orange-200">
                  {deliveryAddress ? <MapPin size={14} /> : <Truck size={14} />}
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]">Service</span>
                </div>
                <p className="truncate text-sm font-black text-white">{deliveryAddress || 'Doorstep delivery'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MobileRestaurantHeader;
