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
  { label: 'Incoming', tint: 'border-[#D97706]/40 text-[#D97706] bg-[#D97706]/[0.08]', dot: 'bg-[#D97706]' },
  { label: 'Preparing', tint: 'border-amber-500/40 text-amber-400 bg-amber-500/[0.08]', dot: 'bg-amber-400' },
  { label: 'Ready', tint: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/[0.08]', dot: 'bg-emerald-400' },
  { label: 'Completed', tint: 'border-[#27272A] text-zinc-400 bg-white/[0.04]', dot: 'bg-zinc-500' },
];

const MODULE_CHIPS = ['Menu', 'Orders', 'Kitchen', 'Inventory', 'Payments', 'Customers', 'AI'];

/**
 * BhojanOS operations workspace — illustrative preview.
 * All content is labelled example UI. No live business data is shown.
 */
export const RestaurantWorkspacePreview = memo(function RestaurantWorkspacePreview() {
  return (
    <Section id="restaurants" background="subtle" className="scroll-mt-24">
      <SectionHeader
        label="BhojanOS — For restaurants"
        title="Run your food business in one workspace."
        description="The operating platform for food businesses. Menu, orders, kitchen, inventory, payments and customers — managed from one place, under your brand."
        theme="dark"
      />

      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-[1.5rem] border border-[#27272A] overflow-hidden shadow-2xl bg-[#18181B] text-white">
          {/* Window chrome */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-[#27272A] bg-[#111114]">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            </div>
            <span className="text-[11px] font-mono text-zinc-400 font-medium truncate">
              BhojanOS workspace · example
            </span>
            <Bell size={14} className="text-zinc-400" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-[auto_1fr] min-h-[340px]">
            {/* Sidebar */}
            <aside
              className="hidden sm:flex flex-col gap-0.5 border-r border-[#27272A] bg-[#111114] p-2.5 w-40"
              aria-label="BhojanOS workspace navigation"
            >
              <span className="px-2.5 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Bhojan<span className="text-[#D97706]">OS</span>
              </span>
              {NAV_ITEMS.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold transition-colors ${
                    i === 0
                      ? 'bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <item.icon size={14} aria-hidden="true" />
                  {item.label}
                </div>
              ))}
            </aside>

            {/* Main panel */}
            <div className="p-4 sm:p-6 flex flex-col gap-4 min-w-0 bg-[#18181B]">
              <div>
                <p className="text-sm font-bold text-white">Today&rsquo;s orders</p>
                <p className="text-[11px] text-zinc-400">Example status lanes — no live data</p>
              </div>

              {/* Order lanes */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {ORDER_LANES.map((lane) => (
                  <div
                    key={lane.label}
                    className={`rounded-lg border px-3 py-3.5 ${lane.tint}`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${lane.dot}`} aria-hidden="true" />
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono">{lane.label}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-6 rounded-md bg-white/10 animate-pulse" />
                      <div className="h-6 rounded-md bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Module chips */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
                  Everything in one place
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MODULE_CHIPS.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#27272A] bg-[#111114] px-3 py-1 text-[11px] font-semibold text-zinc-300 hover:border-[#D97706]/50 hover:text-white transition-colors"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Screens shown are illustrative UI. Orders from OrderBhojan and your own
          storefront arrive in the same BhojanOS queue.
        </p>
      </div>
    </Section>
  );
});

export default RestaurantWorkspacePreview;
