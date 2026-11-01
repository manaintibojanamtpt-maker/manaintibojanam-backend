import React from "react";
import { AnimatedFeatureCard } from "./feature-card-1";

export const bhojanOSFeatures = [
  {
    index: "001",
    tag: "DIRECT ORDERING",
    title: "Own your customer relationships with a branded restaurant storefront and zero marketplace commission.",
    imageSrc: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    color: "orange" as const,
  },
  {
    index: "002",
    tag: "SMART KITCHEN",
    title: "Manage incoming orders, kitchen workflows, and restaurant operations from one connected system.",
    imageSrc: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
    color: "purple" as const,
  },
  {
    index: "003",
    tag: "DELIVERY INTELLIGENCE",
    title: "Coordinate delivery partners, optimize fulfillment, and keep customers informed about their orders.",
    imageSrc: "https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1?auto=format&fit=crop&w=800&q=80",
    color: "blue" as const,
  },
];

export function FeatureCardDemo() {
  return (
    <section className="w-full bg-[#111114] px-4 py-16 sm:py-20 text-white border-b border-[#27272A]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#D97706] font-mono">
            The BhojanOS Advantage
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl text-[#FAFAFA]">
            Everything Your Restaurant Needs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-zinc-400 leading-relaxed">
            One connected operating system for direct ordering, kitchen
            management, payments, and delivery operations.
          </p>
        </div>

        <div className="grid grid-cols-1 justify-items-center gap-8 md:grid-cols-2 lg:grid-cols-3">
          {bhojanOSFeatures.map((feature) => (
            <AnimatedFeatureCard
              key={feature.index}
              index={feature.index}
              tag={feature.tag}
              title={feature.title}
              imageSrc={feature.imageSrc}
              color={feature.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureCardDemo;
