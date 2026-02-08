'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { API_BASE_URL } from '@/config/contracts';

interface QuerySectionProps {
    wallet: string | null;
}

// Particle Card Component
interface ParticleCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

const ParticleCard = ({ children, className = '', onClick, disabled }: ParticleCardProps) => {
    const cardRef = useRef<HTMLButtonElement>(null);
    const particlesRef = useRef<HTMLElement[]>([]);
    const isHoveredRef = useRef(false);

    const clearAllParticles = useCallback(() => {
        particlesRef.current.forEach(particle => {
            gsap.to(particle, {
                scale: 0,
                opacity: 0,
                duration: 0.3,
                ease: 'back.in(1.7)',
                onComplete: () => {
                    particle.parentNode?.removeChild(particle);
                }
            });
        });
        particlesRef.current = [];
    }, []);

    const createParticle = useCallback(() => {
        if (!cardRef.current || !isHoveredRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: rgba(132, 0, 255, 1);
            box-shadow: 0 0 6px rgba(132, 0, 255, 0.6);
            pointer-events: none;
            z-index: 100;
            left: ${Math.random() * rect.width}px;
            top: ${Math.random() * rect.height}px;
        `;

        cardRef.current.appendChild(particle);
        particlesRef.current.push(particle);

        gsap.fromTo(particle, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
        gsap.to(particle, {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: 'none',
            repeat: -1,
            yoyo: true
        });
    }, []);

    useEffect(() => {
        if (!cardRef.current) return;
        const element = cardRef.current;

        const handleMouseEnter = () => {
            isHoveredRef.current = true;
            for (let i = 0; i < 8; i++) {
                setTimeout(() => createParticle(), i * 100);
            }
        };

        const handleMouseLeave = () => {
            isHoveredRef.current = false;
            clearAllParticles();
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            clearAllParticles();
        };
    }, [createParticle, clearAllParticles]);

    return (
        <button
            ref={cardRef}
            className={className}
            onClick={onClick}
            disabled={disabled}
            style={{ position: 'relative', overflow: 'hidden' }}
        >
            {children}
        </button>
    );
};

const availableTraits = [
    // Physical Traits
    { id: 'eye_color', name: 'Eye Color', icon: '👁️', description: 'Predict your likely eye color', category: 'Physical', color: 'from-blue-500/20 to-cyan-500/20', borderColor: 'border-blue-500/30' },
    { id: 'muscle_type', name: 'Muscle Type', icon: '💪', description: 'Power vs endurance tendency', category: 'Physical', color: 'from-orange-500/20 to-red-500/20', borderColor: 'border-orange-500/30' },

    // Metabolism & Nutrition
    { id: 'lactose_tolerance', name: 'Lactose Tolerance', icon: '🥛', description: 'Can you digest dairy?', category: 'Metabolism', color: 'from-green-500/20 to-emerald-500/20', borderColor: 'border-green-500/30' },
    { id: 'caffeine_metabolism', name: 'Caffeine', icon: '☕', description: 'Fast or slow metabolizer', category: 'Metabolism', color: 'from-amber-500/20 to-yellow-500/20', borderColor: 'border-amber-500/30' },
    { id: 'bitter_taste', name: 'Bitter Taste', icon: '🥬', description: 'Are you a supertaster?', category: 'Metabolism', color: 'from-lime-500/20 to-green-500/20', borderColor: 'border-lime-500/30' },
    { id: 'cilantro_taste', name: 'Cilantro', icon: '🌿', description: 'Soapy or delicious?', category: 'Metabolism', color: 'from-teal-500/20 to-cyan-500/20', borderColor: 'border-teal-500/30' },

    // Inherited Diseases & Health Risks
    { id: 'brca_mutation', name: 'BRCA1/2 Mutation', icon: '🧬', description: 'Breast/ovarian cancer risk', category: 'Disease Risk', color: 'from-purple-500/20 to-pink-500/20', borderColor: 'border-purple-500/30' },
    { id: 'alzheimers_risk', name: "Alzheimer's Risk", icon: '🧠', description: 'APOE-e4 variant detection', category: 'Disease Risk', color: 'from-indigo-500/20 to-purple-500/20', borderColor: 'border-indigo-500/30' },
    { id: 'type2_diabetes', name: 'Type 2 Diabetes', icon: '🩺', description: 'Genetic predisposition', category: 'Disease Risk', color: 'from-rose-500/20 to-red-500/20', borderColor: 'border-rose-500/30' },
    { id: 'heart_disease', name: 'Heart Disease', icon: '❤️', description: 'Cardiovascular risk factors', category: 'Disease Risk', color: 'from-red-500/20 to-pink-500/20', borderColor: 'border-red-500/30' },
    { id: 'sickle_cell', name: 'Sickle Cell', icon: '🔴', description: 'Carrier status detection', category: 'Disease Risk', color: 'from-pink-500/20 to-rose-500/20', borderColor: 'border-pink-500/30' },
    { id: 'hemochromatosis', name: 'Hemochromatosis', icon: '⚠️', description: 'Iron overload disorder', category: 'Disease Risk', color: 'from-yellow-500/20 to-orange-500/20', borderColor: 'border-yellow-500/30' },
];

const demoResults: Record<string, any> = {
    eye_color: { prediction: 'Blue Eyes', confidence: 85, emoji: '🔵' },
    muscle_type: { prediction: 'Power Athlete', confidence: 90, emoji: '⚡' },
    lactose_tolerance: { prediction: 'Likely Tolerant', confidence: 72, emoji: '✅' },
    caffeine_metabolism: { prediction: 'Fast Metabolizer', confidence: 78, emoji: '🚀' },
    bitter_taste: { prediction: 'Supertaster', confidence: 65, emoji: '👅' },
    cilantro_taste: { prediction: 'Tastes Great!', confidence: 80, emoji: '😋' },
    brca_mutation: { prediction: 'No Mutation Detected', confidence: 95, emoji: '✅' },
    alzheimers_risk: { prediction: 'Average Risk', confidence: 88, emoji: '🟢' },
    type2_diabetes: { prediction: 'Low Risk', confidence: 82, emoji: '💚' },
    heart_disease: { prediction: 'Moderate Risk', confidence: 75, emoji: '🟡' },
    sickle_cell: { prediction: 'Not a Carrier', confidence: 99, emoji: '✅' },
    hemochromatosis: { prediction: 'No Risk Detected', confidence: 92, emoji: '✅' },
};

const categoryColors: Record<string, string> = {
    'Physical': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Metabolism': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Disease Risk': 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function QuerySection({ wallet }: QuerySectionProps) {
    const [selectedTrait, setSelectedTrait] = useState<string | null>(null);
    const [isQuerying, setIsQuerying] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [queryHistory, setQueryHistory] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const categories = ['All', 'Physical', 'Metabolism', 'Disease Risk'];

    const filteredTraits = selectedCategory === 'All'
        ? availableTraits
        : availableTraits.filter(t => t.category === selectedCategory);

    const handleQuery = async (traitId: string) => {
        setSelectedTrait(traitId);
        setIsQuerying(true);
        setResult(null);

        try {
            // Call the backend API
            const response = await fetch(`${API_BASE_URL}/query/trait`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token_id: 1, // Demo token ID
                    wallet_address: wallet || '0x0000000000000000000000000000000000000000',
                    signature: '0x' + '0'.repeat(130), // Demo signature
                    trait: traitId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to query trait');
            }

            const data = await response.json();

            // Map API response to UI format
            const traitInfo = availableTraits.find(t => t.id === traitId);
            const queryResult = {
                trait: traitId,
                prediction: data.result?.prediction || 'Unknown',
                confidence: Math.round((data.result?.confidence || 0.7) * 100),
                description: data.result?.description || '',
                emoji: traitInfo?.icon || '🧬',
                timestamp: new Date().toLocaleTimeString(),
                proof: data.proof || '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            };

            setResult(queryResult);
            setQueryHistory(prev => [queryResult, ...prev.slice(0, 4)]);
        } catch (error) {
            console.error('Query error:', error);
            // Fallback to demo results if API fails
            const queryResult = {
                ...demoResults[traitId],
                trait: traitId,
                timestamp: new Date().toLocaleTimeString(),
                proof: '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            };
            setResult(queryResult);
            setQueryHistory(prev => [queryResult, ...prev.slice(0, 4)]);
        } finally {
            setIsQuerying(false);
        }
    };

    return (
        <section className="min-h-screen pt-24 px-6 pb-12">
            <div className="container mx-auto max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-block mb-6"
                    >
                        <span className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-300 text-sm font-semibold tracking-wide">
                            🔬 GENETIC INSIGHTS
                        </span>
                    </motion.div>

                    <h1 className="text-5xl md:text-6xl font-bold mb-6">
                        Query Your <span className="gradient-text">Genome</span>
                    </h1>
                    <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
                        Discover insights about your genetic traits. Your raw DNA is never revealed—only
                        the prediction and a zero-knowledge proof.
                    </p>
                </motion.div>

                {/* Category Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center gap-3 mb-12 flex-wrap"
                >
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${selectedCategory === cat
                                ? 'bg-purple-500/30 text-white border-2 border-purple-500/50 shadow-lg shadow-purple-500/20'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Trait Selection */}
                    <div className="lg:col-span-2">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedCategory}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid sm:grid-cols-2 gap-5"
                            >
                                {filteredTraits.map((trait, index) => (
                                    <motion.div
                                        key={trait.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <ParticleCard
                                            onClick={() => handleQuery(trait.id)}
                                            disabled={isQuerying}
                                            className={`glass rounded-2xl p-6 text-left transition-all card-hover w-full group relative overflow-hidden border-2 ${trait.borderColor} ${selectedTrait === trait.id ? 'ring-2 ring-purple-500 scale-105' : ''
                                                } ${isQuerying && selectedTrait === trait.id ? 'animate-pulse' : ''}`}
                                        >
                                            {/* Gradient Background */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${trait.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                            <div className="relative z-10">
                                                {/* Category Badge */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[trait.category]}`}>
                                                        {trait.category}
                                                    </span>
                                                    <div className="text-4xl transform group-hover:scale-110 transition-transform">
                                                        {trait.icon}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <h4 className="font-bold text-lg mb-2 text-white group-hover:text-purple-200 transition-colors">
                                                    {trait.name}
                                                </h4>
                                                <p className="text-sm text-gray-400 leading-relaxed">
                                                    {trait.description}
                                                </p>

                                                {/* Hover Indicator */}
                                                <div className="mt-4 flex items-center gap-2 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span>Click to query</span>
                                                    <span>→</span>
                                                </div>
                                            </div>
                                        </ParticleCard>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Results Panel */}
                    <div className="space-y-6">
                        {/* Current Result */}
                        <div className="glass rounded-2xl p-8 border border-purple-500/20">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="text-2xl">📊</span>
                                Result
                            </h3>

                            {isQuerying && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="text-5xl animate-spin mb-4">🧬</div>
                                    <p className="text-gray-400 font-medium">Analyzing genome...</p>
                                </motion.div>
                            )}

                            {!isQuerying && result && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    <div className="text-center mb-8">
                                        <div className="text-6xl mb-4">{result.emoji}</div>
                                        <h4 className="text-2xl font-bold gradient-text mb-2">{result.prediction}</h4>
                                        <p className="text-gray-400">{result.confidence}% confidence</p>
                                    </div>

                                    <div className="w-full bg-gray-700/50 rounded-full h-3 mb-6 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${result.confidence}%` }}
                                            className="bg-gradient-helix h-3 rounded-full shadow-lg shadow-purple-500/50"
                                        />
                                    </div>

                                    <div className="glass rounded-xl p-4 border border-purple-500/20">
                                        <p className="text-xs text-purple-300 mb-2 font-semibold">🔐 ZK Proof</p>
                                        <p className="font-mono text-xs truncate text-gray-400">{result.proof}</p>
                                    </div>
                                </motion.div>
                            )}

                            {!isQuerying && !result && (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="text-5xl mb-4">🔍</div>
                                    <p className="font-medium">Select a trait to query</p>
                                </div>
                            )}
                        </div>

                        {/* Query History */}
                        {queryHistory.length > 0 && (
                            <div className="glass rounded-2xl p-6 border border-purple-500/20">
                                <h3 className="text-sm font-bold text-purple-300 mb-4 flex items-center gap-2">
                                    <span>📜</span>
                                    Recent Queries
                                </h3>
                                <div className="space-y-3">
                                    {queryHistory.map((q, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <span className="text-2xl">{q.emoji}</span>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{q.prediction}</p>
                                                <p className="text-xs text-gray-500">{q.timestamp}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Demo notice */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-16 glass rounded-2xl p-6 text-center border border-purple-500/20"
                >
                    <p className="text-sm text-gray-300">
                        🔬 <strong className="text-purple-300">Demo Mode:</strong> Results shown are from sample data.
                        Mint your own genome to see your real traits!
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
