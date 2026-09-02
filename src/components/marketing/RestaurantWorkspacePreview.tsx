import React, { memo } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  ChefHat,
  Package,
  CreditCard,
  Users,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: ClipboardList, label: 'Orders' },
  { icon: UtensilsCrossed, label: 'Menu' },
  { icon: ChefHat, label: 'Kitchen' },
  { icon: Package, label: 'Inventory' },
  { icon: CreditCard, label: 'Payments' },
  { icon: Users, label: 'Customers' },
  { icon: Sparkles, label: 'AI' },
];

const ORDER_LANES = [
  { label: 'Incoming', tint: 'border-[#FF7A00]/30 text-[#FF7A00]', dot: 'bg-[#FF7A00]' },
  { label: 'Preparing', tint: 'border-amber-500/30 text-amber-400', dot: 'bg-amber-500' },
  { label: 'Ready', tint: 'border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-500' },
  { label: 'Completed', tint: 'border-white/[0.12] text-neutral-500', dot: 'bg-neutral-600' },
];

const MODULE_CHIPS = ['Menu', 'Orders', 'Kitchen', 'Inventory', 'Payments', 'Customers', 'AI'];

/**
 * BhojanOS operations workspace — illustrative preview.
 * All content is labelled example UI. No live business data is shown
 * (no revenue, order counts, or performance metrics).
 */
export const RestaurantWorkspacePreview = memo(function RestaurantWorkspacePreview() {
  return (
    <Section id="restaurants" background="default" className="scroll-mt-24">
<div className="max-w-4xl mx-auto">
        <div
          className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[#FF7A00]/[0.04] blur-[80px]"
          aria-hidden
        />
        <div className="relative rounded-[1.5rem] border border-white/[0.06] overflow-hidden shadow-[0_40px_80px_-32px_rgba(0,0,0,0.8)] bg-[#070504]">
          {/* Window chrome */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-white/[0.05] bg-[#0A0A0A]">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            </div>
            <span className="text-[10px] font-mono text-neutral-600 truncate">
              BhojanOS workspace · example
            </span>
            <Bell size={14} className="text-neutral-600" aria-hidden />
          </div>

          <div className="grid grid-cols-[auto_1fr] min-h-[340px]">
            {/* Sidebar */}
            <aside className="hidden sm:flex flex-col gap-0.5 border-r border-white/[0.05] bg-[#0A0A0A]/60 p-2 w-40" aria-label="BhojanOS workspace navigation">
              <span className="px-2.5 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                Bhojan<span className="text-[#FF7A00]">OS</span>
              </span>
              {NAV_ITEMS.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold ${
                    i === 0 ? 'bg-[#FF7A00]/10 text-[#FF7A00]' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <item.icon size={14} aria-hidden />
                  {item.label}
                </div>
              ))}
            </aside>

            {/* Main panel */}
            <div className="p-4 sm:p-6 flex flex-col gap-4 min-w-0">
              <div>
                <p className="text-sm font-bold text-white">Today&rsquo;s orders</p>
                <p className="text-[11px] text-neutral-500">Example status lanes — no live data</p>
              </div>

              {/* Order lanes */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {ORDER_LANES.map((lane) => (
                  <div
                    key={lane.label}
                    className={`rounded-xl border bg-white/[0.02] px-3 py-3.5 ${lane.tint}`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${lane.dot}`} aria-hidden />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{lane.label}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-6 rounded-md bg-white/[0.04] animate-pulse" />
                      <div className="h-6 rounded-md bg-white/[0.02]" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Module chips */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  Everything in one place
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MODULE_CHIPS.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-semibold text-neutral-300"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-600 max-w-xl mx-auto leading-relaxed">
          Screens shown are illustrative UI. Orders from OrderBhojan and your own
          storefront arrive in the same BhojanOS queue.
        </p>
      </div>
    </Section>
  );
});

export default RestaurantWorkspacePreview;
      <SectionHeader
        label="BhojanOS — For restaurants"
        title="Run your food business in one workspace."
        description="The operating platform for food businesses. Menu, orders, kitchen, inventory, payments and customers — managed from one place, under your brand."
      />