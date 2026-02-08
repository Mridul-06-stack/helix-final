'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DNAComparisonAnimation from './DNAComparisonAnimation';
import ResearcherRegistration from './ResearcherRegistration';
import VerificationDashboard from './VerificationDashboard';
import { API_BASE_URL } from '@/config/contracts';

interface BountySectionProps {
    wallet: string | null;
}

interface Bounty {
    id: string;
    title: string;
    description: string;
    reward: number;
    maxResponses: number;
    responseCount: number;
    category: string;
    expiresIn: string;
    icon: string;
    color: string;
    borderColor: string;
}

const demoBounties: Bounty[] = [
    {
        id: 'bounty_001',
        title: 'Blue Eye Gene Study',
        description: 'Looking for individuals with the rs12913832 GG variant',
        reward: 0.05,
        maxResponses: 100,
        responseCount: 23,
        category: 'Traits',
        expiresIn: '7 days',
        icon: '👁️',
        color: 'from-blue-500/20 to-cyan-500/20',
        borderColor: 'border-blue-500/30',
    },
    {
        id: 'bounty_002',
        title: 'Lactose Intolerance Research',
        description: 'Studying lactose intolerance gene prevalence',
        reward: 0.03,
        maxResponses: 200,
        responseCount: 87,
        category: 'Health',
        expiresIn: '14 days',
        icon: '🥛',
        color: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'border-green-500/30',
    },
    {
        id: 'bounty_003',
        title: 'Athletic Performance Study',
        description: 'Researching ACTN3 gene for sports genetics',
        reward: 0.08,
        maxResponses: 50,
        responseCount: 12,
        category: 'Fitness',
        expiresIn: '30 days',
        icon: '💪',
        color: 'from-orange-500/20 to-red-500/20',
        borderColor: 'border-orange-500/30',
    },
    {
        id: 'bounty_004',
        title: 'Caffeine Metabolism Study',
        description: 'How genetics affect caffeine processing',
        reward: 0.04,
        maxResponses: 150,
        responseCount: 45,
        category: 'Health',
        expiresIn: '10 days',
        icon: '☕',
        color: 'from-amber-500/20 to-yellow-500/20',
        borderColor: 'border-amber-500/30',
    },
    {
        id: 'bounty_005',
        title: 'BRCA1/2 Cancer Risk Study',
        description: 'Research on hereditary breast and ovarian cancer mutations',
        reward: 0.15,
        maxResponses: 75,
        responseCount: 34,
        category: 'Disease',
        expiresIn: '45 days',
        icon: '🧬',
        color: 'from-purple-500/20 to-pink-500/20',
        borderColor: 'border-purple-500/30',
    },
    {
        id: 'bounty_006',
        title: "Alzheimer's Disease Research",
        description: 'APOE-e4 variant study for neurodegenerative disease risk',
        reward: 0.12,
        maxResponses: 100,
        responseCount: 56,
        category: 'Disease',
        expiresIn: '60 days',
        icon: '🧠',
        color: 'from-indigo-500/20 to-purple-500/20',
        borderColor: 'border-indigo-500/30',
    },
    {
        id: 'bounty_007',
        title: 'Type 2 Diabetes Genetics',
        description: 'TCF7L2 and other diabetes-related gene variants',
        reward: 0.07,
        maxResponses: 120,
        responseCount: 78,
        category: 'Disease',
        expiresIn: '21 days',
        icon: '🩺',
        color: 'from-rose-500/20 to-red-500/20',
        borderColor: 'border-rose-500/30',
    },
    {
        id: 'bounty_008',
        title: 'Ancestry & Migration Patterns',
        description: 'Haplogroup analysis for human migration studies',
        reward: 0.06,
        maxResponses: 200,
        responseCount: 145,
        category: 'Ancestry',
        expiresIn: '90 days',
        icon: '🌍',
        color: 'from-teal-500/20 to-cyan-500/20',
        borderColor: 'border-teal-500/30',
    },
    {
        id: 'bounty_009',
        title: 'Pharmacogenomics Study',
        description: 'Drug response variants (CYP2D6, CYP2C19)',
        reward: 0.10,
        maxResponses: 80,
        responseCount: 29,
        category: 'Pharma',
        expiresIn: '35 days',
        icon: '💊',
        color: 'from-pink-500/20 to-fuchsia-500/20',
        borderColor: 'border-pink-500/30',
    },
    {
        id: 'bounty_010',
        title: 'Rare Variant Discovery',
        description: 'Seeking ultra-rare genetic variants for research database',
        reward: 0.20,
        maxResponses: 25,
        responseCount: 3,
        category: 'Research',
        expiresIn: '120 days',
        icon: '⭐',
        color: 'from-yellow-500/20 to-orange-500/20',
        borderColor: 'border-yellow-500/30',
    },
    {
        id: 'bounty_011',
        title: 'Longevity Gene Study',
        description: 'FOXO3 and other longevity-associated variants',
        reward: 0.09,
        maxResponses: 60,
        responseCount: 18,
        category: 'Health',
        expiresIn: '50 days',
        icon: '🕰️',
        color: 'from-lime-500/20 to-green-500/20',
        borderColor: 'border-lime-500/30',
    },
    {
        id: 'bounty_012',
        title: 'Sickle Cell Carrier Study',
        description: 'HBB gene variants and carrier status research',
        reward: 0.11,
        maxResponses: 90,
        responseCount: 42,
        category: 'Disease',
        expiresIn: '28 days',
        icon: '🔴',
        color: 'from-red-500/20 to-pink-500/20',
        borderColor: 'border-red-500/30',
    },
];

const getCategoryStyle = (category: string) => {
    const styles: Record<string, string> = {
        'Traits': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        'Health': 'bg-green-500/20 text-green-300 border-green-500/30',
        'Fitness': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        'Disease': 'bg-red-500/20 text-red-300 border-red-500/30',
        'Ancestry': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        'Pharma': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
        'Research': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    };
    return styles[category] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
};

const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
        'Traits': '👁️',
        'Health': '🥛',
        'Fitness': '💪',
        'Disease': '🧬',
        'Ancestry': '🌍',
        'Pharma': '💊',
        'Research': '⭐',
    };
    return icons[category] || '🔬';
};

const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
        'Traits': 'from-blue-500/20 to-cyan-500/20',
        'Health': 'from-green-500/20 to-emerald-500/20',
        'Fitness': 'from-orange-500/20 to-red-500/20',
        'Disease': 'from-purple-500/20 to-pink-500/20',
        'Ancestry': 'from-teal-500/20 to-cyan-500/20',
        'Pharma': 'from-pink-500/20 to-fuchsia-500/20',
        'Research': 'from-yellow-500/20 to-orange-500/20',
    };
    return colors[category] || 'from-gray-500/20 to-slate-500/20';
};

const getCategoryBorder = (category: string): string => {
    const borders: Record<string, string> = {
        'Traits': 'border-blue-500/30',
        'Health': 'border-green-500/30',
        'Fitness': 'border-orange-500/30',
        'Disease': 'border-purple-500/30',
        'Ancestry': 'border-teal-500/30',
        'Pharma': 'border-pink-500/30',
        'Research': 'border-yellow-500/30',
    };
    return borders[category] || 'border-gray-500/30';
};

export default function BountySection({ wallet }: BountySectionProps) {
    const [bounties, setBounties] = useState<Bounty[]>(demoBounties);
    const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [matchResult, setMatchResult] = useState<boolean | null>(null);
    const [earnings, setEarnings] = useState(0);
    const [filter, setFilter] = useState<string>('all');

    // Verification system state
    const [showRegistration, setShowRegistration] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<{
        status: 'NotRegistered' | 'Pending' | 'EmailVerified' | 'FullyVerified' | 'Suspended' | 'Revoked';
        name?: string;
        institution?: string;
        email?: string;
        researchField?: string;
        reputationScore?: number;
        totalBounties?: number;
        successfulBounties?: number;
        registeredAt?: number;
        verifiedAt?: number;
    }>({
        status: 'NotRegistered',
        name: '',
        institution: '',
        email: '',
        researchField: '',
        reputationScore: 0,
        totalBounties: 0,
        successfulBounties: 0,
    });

    const categories = ['all', 'Traits', 'Health', 'Fitness', 'Disease', 'Ancestry', 'Pharma', 'Research'];

    // Fetch bounties from API on mount
    useEffect(() => {
        const fetchBounties = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/bounties`);
                if (response.ok) {
                    const data = await response.json();
                    // Map API response to UI format
                    const apiBounties = data.bounties.map((b: any) => ({
                        id: b.id,
                        title: b.title,
                        description: b.description,
                        reward: b.reward_per_response,
                        maxResponses: b.max_responses,
                        responseCount: b.response_count,
                        category: b.category,
                        expiresIn: new Date(b.expires_at).toLocaleDateString(),
                        icon: getCategoryIcon(b.category),
                        color: getCategoryColor(b.category),
                        borderColor: getCategoryBorder(b.category),
                    }));
                    // Merge API bounties with demo bounties
                    setBounties([...apiBounties, ...demoBounties.filter(d => !apiBounties.find((a: Bounty) => a.id === d.id))]);
                }
            } catch (error) {
                console.log('Using demo bounties, API not available:', error);
            }
        };
        fetchBounties();
    }, []);

    const filteredBounties = filter === 'all'
        ? bounties
        : bounties.filter(b => b.category === filter);

    const handleCheckMatch = async (bounty: Bounty) => {
        setSelectedBounty(bounty);
        setIsChecking(true);
        setMatchResult(null);

        try {
            // Call backend API to check match
            const response = await fetch(`${API_BASE_URL}/bounties/check-match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bounty_id: bounty.id,
                    token_id: 1, // Demo token ID
                    wallet_address: wallet || '0x0000000000000000000000000000000000000000',
                    signature: '0x' + '0'.repeat(130), // Demo signature
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setMatchResult(data.matches);
            } else {
                // Fallback to random for demo
                setMatchResult(Math.random() > 0.3);
            }
        } catch (error) {
            console.error('Check match error:', error);
            // Fallback to random for demo
            setMatchResult(Math.random() > 0.3);
        } finally {
            setIsChecking(false);
        }
    };

    const handleRespond = async () => {
        if (!selectedBounty || !matchResult) return;

        setIsChecking(true);

        try {
            // Call backend API to respond to bounty
            const response = await fetch(`${API_BASE_URL}/bounties/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bounty_id: selectedBounty.id,
                    token_id: 1, // Demo token ID
                    wallet_address: wallet || '0x0000000000000000000000000000000000000000',
                    signature: '0x' + '0'.repeat(130), // Demo signature
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setEarnings(prev => prev + data.reward_amount);
                }
            } else {
                // Fallback for demo
                setEarnings(prev => prev + selectedBounty.reward);
            }
        } catch (error) {
            console.error('Respond error:', error);
            // Fallback for demo
            setEarnings(prev => prev + selectedBounty.reward);
        }

        // Update bounty count
        setBounties(prev => prev.map(b =>
            b.id === selectedBounty.id
                ? { ...b, responseCount: b.responseCount + 1 }
                : b
        ));

        setSelectedBounty(null);
        setMatchResult(null);
        setIsChecking(false);
    };

    return (
        <section className="min-h-screen pt-24 px-6 pb-12">
            <div className="container mx-auto max-w-6xl">
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
                        <span className="px-6 py-3 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-green-300 text-sm font-semibold tracking-wide">
                            💰 EARN CRYPTO
                        </span>
                    </motion.div>

                    <h1 className="text-5xl md:text-6xl font-bold mb-6">
                        Research <span className="gradient-text">Bounties</span>
                    </h1>
                    <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
                        Researchers post bounties for specific genetic queries. Match their criteria and
                        earn crypto—your raw DNA is never exposed.
                    </p>
                </motion.div>

                {/* Researcher Verification Dashboard */}
                {wallet && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-12"
                    >
                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">
                                    🔬 Researcher Portal
                                </h2>
                                {verificationStatus.status === 'NotRegistered' && (
                                    <motion.button
                                        onClick={() => setShowRegistration(true)}
                                        className="px-6 py-3 bg-gradient-helix rounded-lg font-semibold glow-button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Register as Researcher
                                    </motion.button>
                                )}
                            </div>

                            <VerificationDashboard
                                verificationStatus={verificationStatus}
                                onRegister={() => setShowRegistration(true)}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Registration Modal */}
                {showRegistration && (
                    <ResearcherRegistration
                        onClose={() => setShowRegistration(false)}
                        onSuccess={() => {
                            setShowRegistration(false);
                            // TODO: Refresh verification status from smart contract
                            setVerificationStatus({
                                ...verificationStatus,
                                status: 'Pending',
                            });
                        }}
                    />
                )}

                {/* Stats Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-xl p-6 mb-8"
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div>
                            <div className="text-3xl font-bold gradient-text">{bounties.length}</div>
                            <div className="text-sm text-gray-400">Active Bounties</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-400">
                                {bounties.reduce((sum, b) => sum + (b.maxResponses - b.responseCount) * b.reward, 0).toFixed(2)} MATIC
                            </div>
                            <div className="text-sm text-gray-400">Available Rewards</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-400">
                                {bounties.reduce((sum, b) => sum + b.responseCount, 0)}
                            </div>
                            <div className="text-sm text-gray-400">Total Responses</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-yellow-400">{earnings.toFixed(2)} MATIC</div>
                            <div className="text-sm text-gray-400">Your Earnings</div>
                        </div>
                    </div>
                </motion.div>

                {/* Category Filter */}
                <div className="flex justify-center gap-3 mb-12 flex-wrap">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${filter === cat
                                ? 'bg-green-500/30 text-white border-2 border-green-500/50 shadow-lg shadow-green-500/20'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {cat === 'all' ? 'All Categories' : cat}
                        </button>
                    ))}
                </div>

                {/* Bounty Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {filteredBounties.map((bounty, index) => (
                        <motion.div
                            key={bounty.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className={`glass rounded-2xl p-7 card-hover relative overflow-hidden border-2 ${bounty.borderColor} group`}
                        >
                            {/* Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${bounty.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                            <div className="relative z-10">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-helix flex items-center justify-center text-3xl transform group-hover:scale-110 transition-transform">
                                            {bounty.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg mb-1.5 text-white group-hover:text-purple-200 transition-colors">{bounty.title}</h3>
                                            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${getCategoryStyle(bounty.category)}`}>
                                                {bounty.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Reward Badge */}
                                <div className="mb-5 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-green-300 mb-1">Reward</div>
                                            <div className="text-2xl font-bold text-green-400">{bounty.reward} MATIC</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-400 mb-1">Per Response</div>
                                            <div className="text-lg font-semibold text-white">{bounty.maxResponses - bounty.responseCount} left</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-gray-400 mb-5 leading-relaxed">{bounty.description}</p>

                                {/* Stats */}
                                <div className="flex items-center justify-between mb-3 text-xs">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <span className="text-white font-bold">{bounty.responseCount}</span>
                                        <span>/</span>
                                        <span>{bounty.maxResponses} responses</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <span>⏰</span>
                                        <span>{bounty.expiresIn}</span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-700/50 rounded-full h-2.5 mb-5 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(bounty.responseCount / bounty.maxResponses) * 100}%` }}
                                        className="bg-gradient-helix h-2.5 rounded-full shadow-lg shadow-purple-500/50"
                                        transition={{ duration: 1, delay: index * 0.1 }}
                                    />
                                </div>

                                {/* Action Button */}
                                <motion.button
                                    onClick={() => handleCheckMatch(bounty)}
                                    disabled={isChecking}
                                    className="w-full py-3.5 bg-gradient-helix rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    🔍 Check If You Match
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Match Result Modal */}
                {selectedBounty && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                        onClick={() => !isChecking && setSelectedBounty(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass rounded-2xl p-8 max-w-md w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            {isChecking && (
                                <div className="text-center">
                                    <DNAComparisonAnimation isAnimating={isChecking} />
                                </div>
                            )}

                            {!isChecking && matchResult === true && (
                                <div className="text-center">
                                    <div className="text-6xl mb-4">🎉</div>
                                    <h3 className="text-2xl font-bold gradient-text mb-2">You Match!</h3>
                                    <p className="text-gray-400 mb-6">
                                        You qualify for this bounty. Submit your response to earn{' '}
                                        <span className="text-green-400 font-bold">{selectedBounty.reward} MATIC</span>
                                    </p>
                                    <motion.button
                                        onClick={handleRespond}
                                        className="w-full py-4 bg-gradient-helix rounded-xl font-semibold glow-button"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        💰 Claim Reward
                                    </motion.button>
                                </div>
                            )}

                            {!isChecking && matchResult === false && (
                                <div className="text-center">
                                    <div className="text-6xl mb-4">😔</div>
                                    <h3 className="text-2xl font-semibold mb-2">No Match</h3>
                                    <p className="text-gray-400 mb-6">
                                        Your genome doesn't match this bounty's criteria. Try other bounties!
                                    </p>
                                    <motion.button
                                        onClick={() => setSelectedBounty(null)}
                                        className="w-full py-4 glass rounded-xl font-semibold"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Browse More Bounties
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </div>
        </section>
    );
}
