'use client';

import { motion } from 'framer-motion';
import { useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import './Features.css';

const DEFAULT_GLOW_COLOR = '132, 0, 255';

interface ParticleCardProps {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
}

const ParticleCard = ({ children, className = '', glowColor = DEFAULT_GLOW_COLOR }: ParticleCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const particlesRef = useRef<HTMLElement[]>([]);
    const isHoveredRef = useRef(false);

    const clearAllParticles = useCallback(() => {
        particlesRef.current.forEach(particle => {
            gsap.to(particle, {
                scale: 0,
                opacity: 0,
                duration: 0.3,
                ease: 'back.in(1.7)',
                onComplete: () => particle.parentNode?.removeChild(particle)
            });
        });
        particlesRef.current = [];
    }, []);

    const createParticle = useCallback(() => {
        if (!cardRef.current || !isHoveredRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: rgba(${glowColor}, 1);
            box-shadow: 0 0 8px rgba(${glowColor}, 0.8);
            pointer-events: none;
            z-index: 100;
            left: ${Math.random() * rect.width}px;
            top: ${Math.random() * rect.height}px;
        `;

        cardRef.current.appendChild(particle);
        particlesRef.current.push(particle);

        gsap.fromTo(particle, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
        gsap.to(particle, {
            x: (Math.random() - 0.5) * 120,
            y: (Math.random() - 0.5) * 120,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: 'none',
            repeat: -1,
            yoyo: true
        });
        gsap.to(particle, {
            opacity: 0.3,
            duration: 1.5,
            ease: 'power2.inOut',
            repeat: -1,
            yoyo: true
        });
    }, [glowColor]);

    useEffect(() => {
        if (!cardRef.current) return;
        const element = cardRef.current;

        const handleMouseEnter = () => {
            isHoveredRef.current = true;
            for (let i = 0; i < 12; i++) {
                setTimeout(() => createParticle(), i * 80);
            }
        };

        const handleMouseLeave = () => {
            isHoveredRef.current = false;
            clearAllParticles();
            element.style.setProperty('--glow-intensity', '0');
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const relativeX = (x / rect.width) * 100;
            const relativeY = (y / rect.height) * 100;

            element.style.setProperty('--glow-x', `${relativeX}%`);
            element.style.setProperty('--glow-y', `${relativeY}%`);
            element.style.setProperty('--glow-intensity', '1');
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
        element.addEventListener('mousemove', handleMouseMove);

        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            element.removeEventListener('mousemove', handleMouseMove);
            clearAllParticles();
        };
    }, [createParticle, clearAllParticles]);

    return (
        <div
            ref={cardRef}
            className={`${className} magic-bento-effect`}
            style={{ '--glow-color': glowColor } as React.CSSProperties}
        >
            {children}
        </div>
    );
};

export default function Features() {
    const steps = {
        users: [
            { icon: '🔗', title: 'Connect Wallet', desc: 'Link your MetaMask or Web3 wallet to receive crypto payments' },
            { icon: '🧬', title: 'Upload DNA Data', desc: 'Import files from 23andMe, AncestryDNA, or any genetic testing service' },
            { icon: '🎨', title: 'Mint Helix NFT', desc: 'Your data is encrypted with AES-256, stored on IPFS, and minted as an NFT' },
            { icon: '🔍', title: 'Discover Traits', desc: 'Query your genome for insights on health, ancestry, and unique characteristics' },
            { icon: '💰', title: 'Earn Rewards', desc: 'Match research bounties and get paid in crypto—your raw DNA stays private' }
        ],
        researchers: [
            { icon: '🔗', title: 'Connect Wallet', desc: 'Link your MetaMask or Web3 wallet to get started' },
            { icon: '📝', title: 'Register & Verify', desc: 'Submit institutional credentials: email, ORCID, IRB approval' },
            { icon: '✅', title: 'Get Approved', desc: 'Admin team reviews your application within 24-48 hours' },
            { icon: '🎯', title: 'Create Bounties', desc: 'Post genetic queries, fund rewards, receive ZK-proof verified results' }
        ]
    };

    return (
        <section id="features" className="py-32 px-6 relative">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-24"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="inline-block mb-6"
                    >
                        <span className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-300 text-sm font-semibold tracking-wide">
                            ✨ PLATFORM OVERVIEW
                        </span>
                    </motion.div>

                    <h2 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
                        How <span className="gradient-text">HelixVault</span> Works
                    </h2>

                    <p className="text-gray-300 text-xl max-w-3xl mx-auto leading-relaxed">
                        Two distinct pathways designed for different users.<br />
                        <span className="text-green-400 font-semibold">Users</span> own and monetize their DNA. <span className="text-purple-400 font-semibold">Researchers</span> access insights ethically.
                    </p>
                </motion.div>

                {/* Cards */}
                <div className="grid lg:grid-cols-2 gap-10">
                    {/* FOR USERS */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        <ParticleCard className="glass rounded-3xl p-10 border-2 border-green-500/30 h-full relative" glowColor="34, 197, 94">
                            <div className="card-header-gradient" style={{ '--glow-color': '34, 197, 94' } as React.CSSProperties} />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="header-icon">👤</div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-green-400 mb-1">For Users</h3>
                                        <p className="text-gray-400 text-sm">Own your DNA, earn rewards</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {steps.users.map((step, i) => (
                                        <div key={i}>
                                            <div className="flex gap-5 items-start">
                                                <div className="step-number bg-green-500/20 text-green-400 flex-shrink-0">
                                                    {step.icon}
                                                </div>
                                                <div className="step-content">
                                                    <h4 className="font-bold text-lg mb-1.5 text-white">{step.title}</h4>
                                                    <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                                                </div>
                                            </div>
                                            {i < steps.users.length - 1 && <div className="step-divider ml-14" />}
                                        </div>
                                    ))}
                                </div>

                                <div className="security-badge mt-8 p-5 bg-green-500/10 rounded-2xl border border-green-500/30">
                                    <p className="text-sm text-green-300 flex items-center gap-2">
                                        <span className="text-xl">🔒</span>
                                        <span><strong>Bank-level encryption.</strong> Your raw DNA is never exposed to researchers.</span>
                                    </p>
                                </div>
                            </div>
                        </ParticleCard>
                    </motion.div>

                    {/* FOR RESEARCHERS */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    >
                        <ParticleCard className="glass rounded-3xl p-10 border-2 border-purple-500/30 h-full relative">
                            <div className="card-header-gradient" style={{ '--glow-color': '132, 0, 255' } as React.CSSProperties} />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="header-icon">🔬</div>
                                    <div>
                                        <h3 className="text-3xl font-bold text-purple-400 mb-1">For Researchers</h3>
                                        <p className="text-gray-400 text-sm">Access insights ethically</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {steps.researchers.map((step, i) => (
                                        <div key={i}>
                                            <div className="flex gap-5 items-start">
                                                <div className="step-number bg-purple-500/20 text-purple-400 flex-shrink-0">
                                                    {step.icon}
                                                </div>
                                                <div className="step-content">
                                                    <h4 className="font-bold text-lg mb-1.5 text-white">{step.title}</h4>
                                                    <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                                                </div>
                                            </div>
                                            {i < steps.researchers.length - 1 && <div className="step-divider ml-14" />}
                                        </div>
                                    ))}
                                </div>

                                <div className="security-badge mt-8 p-5 bg-purple-500/10 rounded-2xl border border-purple-500/30">
                                    <p className="text-sm text-purple-300 flex items-center gap-2">
                                        <span className="text-xl">🛡️</span>
                                        <span><strong>Verification required.</strong> Protects user data from unauthorized access.</span>
                                    </p>
                                </div>
                            </div>
                        </ParticleCard>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
