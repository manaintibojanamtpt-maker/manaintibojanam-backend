import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cardData, type GlassCardItem } from '../../lib/utils';
import { ArrowUpRight } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface CardProps {
    id: number;
    title: string;
    description: string;
    index: number;
    totalCards: number;
    color: string;
    stats?: { label: string; value: string }[];
    pills?: string[];
    children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
    id, 
    title, 
    description, 
    index, 
    totalCards, 
    color,
    stats,
    pills,
    children 
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const card = cardRef.current;
        const container = containerRef.current;
        if (!card || !container) return;

        const targetScale = 1 - (totalCards - index) * 0.05;

        // Set initial state
        gsap.set(card, {
            scale: 1,
            transformOrigin: "center top"
        });

        // Create scroll trigger for stacking effect (similar to the reference component)
        const trigger = ScrollTrigger.create({
            trigger: container,
            start: "top center",
            end: "bottom center",
            scrub: 1,
            onUpdate: (self) => {
                const progress = self.progress;
                const scale = gsap.utils.interpolate(1, targetScale, progress);

                gsap.set(card, {
                    scale: Math.max(scale, targetScale),
                    transformOrigin: "center top"
                });
            }
        });

        return () => {
            trigger.kill();
        };
    }, [index, totalCards]);

    return (
        <div
            ref={containerRef}
            style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'sticky',
                top: 0
            }}
        >
            <div
                ref={cardRef}
                style={{
                    position: 'relative',
                    width: 'min(90vw, 840px)',
                    minHeight: '440px',
                    borderRadius: '24px',
                    isolation: 'isolate',
                    top: `calc(-5vh + ${index * 25}px)`,
                    transformOrigin: 'top'
                }}
                className="card-content"
            >
                {/* Electric Border Effect */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '-3px',
                        borderRadius: '27px',
                        padding: '3px',
                        background: `conic-gradient(
                            from 0deg,
                            transparent 0deg,
                            ${color} 60deg,
                            ${color.replace('0.8', '0.6')} 120deg,
                            transparent 180deg,
                            ${color.replace('0.8', '0.4')} 240deg,
                            transparent 360deg
                        )`,
                        zIndex: -1
                    }}
                />

                {/* Main Card Content */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: '440px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: '24px',
                    background: `
                        linear-gradient(145deg, 
                            rgba(255, 255, 255, 0.1), 
                            rgba(255, 255, 255, 0.04)
                        ),
                        #101014
                    `,
                    backdropFilter: 'blur(25px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: `
                        0 20px 50px rgba(0, 0, 0, 0.7),
                        0 2px 8px rgba(0, 0, 0, 0.4),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.1)
                    `,
                    overflow: 'hidden'
                }}>
                    {/* Enhanced Glass reflection overlay */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '60%',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
                        pointerEvents: 'none',
                        borderRadius: '24px 24px 0 0'
                    }} />

                    {/* Glass shine effect */}
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        right: '10px',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%)',
                        borderRadius: '1px',
                        pointerEvents: 'none'
                    }} />

                    {/* Side glass reflection */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '2px',
                        height: '100%',
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
                        borderRadius: '24px 0 0 24px',
                        pointerEvents: 'none'
                    }} />

                    {/* Frosted glass texture */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `
                            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 1px, transparent 2px),
                            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.06) 1px, transparent 2px),
                            radial-gradient(circle at 40% 80%, rgba(255,255,255,0.04) 1px, transparent 2px)
                        `,
                        backgroundSize: '30px 30px, 25px 25px, 35px 35px',
                        pointerEvents: 'none',
                        borderRadius: '24px',
                        opacity: 0.6
                    }} />

                    {/* Content Layer */}
                    <div className="relative z-10 p-6 sm:p-10 flex flex-col justify-between h-full">
                        <div>
                            {/* Card Header Badge */}
                            <div className="flex items-center justify-between mb-4">
                                <span 
                                    className="px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border inline-flex items-center gap-1.5"
                                    style={{ 
                                        background: `${color.replace('0.8', '0.12')}`, 
                                        color: color.replace('0.8', '1'),
                                        borderColor: `${color.replace('0.8', '0.35')}`
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color.replace('0.8', '1') }} />
                                    Phase 0{id} · BhojanOS Sovereign Engine
                                </span>
                                <span className="text-xs font-mono text-white/50 tracking-wide">
                                    Stacking Card {index + 1} of {totalCards}
                                </span>
                            </div>

                            {/* Card Title */}
                            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3 drop-shadow-md leading-tight">
                                {title}
                            </h3>

                            {/* Card Description */}
                            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl font-medium mb-6">
                                {description}
                            </p>

                            {/* Optional Stat Chips */}
                            {stats && stats.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                                    {stats.map((st, i) => (
                                        <div 
                                            key={i} 
                                            className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm"
                                        >
                                            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{st.label}</div>
                                            <div className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">{st.value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Feature Pills */}
                            {pills && pills.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {pills.map((pill, i) => (
                                        <span 
                                            key={i}
                                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/[0.06] border border-white/10 text-zinc-200"
                                        >
                                            {pill}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {children}
                        </div>

                        {/* Card Bottom CTA link */}
                        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Active Enterprise Component
                            </span>
                            <a
                                href="/owner/register"
                                className="inline-flex items-center gap-1 text-xs font-bold text-white hover:text-[#F59E0B] transition-colors"
                            >
                                <span>Deploy Platform</span>
                                <ArrowUpRight size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export interface StackedCardsProps {
    cards?: GlassCardItem[];
    headline?: React.ReactNode;
    subheadline?: string;
}

export const StackedCards: React.FC<StackedCardsProps> = ({ 
    cards = cardData,
    headline,
    subheadline = "Scroll down to inspect the four layers of the BhojanOS restaurant operating system."
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        gsap.fromTo(container,
            { opacity: 0 },
            {
                opacity: 1,
                duration: 1.2,
                ease: "power2.out"
            }
        );
    }, []);

    return (
        <main ref={containerRef} style={{ background: '#09090B' }} className="w-full">
            {/* Hero Section */}
            <section style={{
                height: '60vh',
                width: '100%',
                display: 'grid',
                placeContent: 'center',
                position: 'relative',
                color: '#ffffff'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '54px 54px',
                    maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)'
                }} />
                
                <div className="relative z-10 text-center max-w-3xl px-4">
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-[#F59E0B] bg-[#D97706]/10 border border-[#D97706]/30 mb-4">
                        Skeuomorphic Glass Stacking
                    </span>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-4">
                        {headline || (
                            <>
                                Stacking Glass Cards <br />
                                <span className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] bg-clip-text text-transparent">
                                    BhojanOS Architecture
                                </span>
                            </>
                        )}
                    </h2>
                    <p className="text-sm sm:text-base text-zinc-400 font-medium">
                        {subheadline}
                    </p>
                </div>
            </section>

            {/* Cards Section */}
            <section style={{
                color: '#ffffff',
                width: '100%',
                position: 'relative'
            }}>
                {cards.map((card, index) => {
                    return (
                        <Card
                            key={card.id}
                            id={card.id}
                            title={card.title}
                            description={card.description}
                            index={index}
                            totalCards={cards.length}
                            color={card.color}
                            stats={card.stats}
                            pills={card.pills}
                        />
                    );
                })}
            </section>
        </main>
    );
};

export default StackedCards;
