'use client';

import { motion } from 'framer-motion';

interface HeroProps {
    onGetStarted: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
            <div className="container mx-auto text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
                >
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-sm text-gray-300">Powered by Polygon & AI</span>
                </motion.div>

                {/* Main heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl md:text-7xl font-bold mb-6"
                >
                    Your DNA.{' '}
                    <span className="gradient-text">Your Data.</span>
                    <br />
                    Your Profit.
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl text-gray-400 max-w-2xl mx-auto mb-12"
                >
                    Turn your genetic data into an NFT. Monetize insights without exposing
                    your raw DNA. Privacy-preserving science powered by blockchain.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap items-center justify-center gap-4"
                >
                    <motion.button
                        onClick={onGetStarted}
                        className="px-8 py-4 bg-gradient-helix rounded-xl font-semibold text-lg glow-button pulse-ring"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        🧬 Mint Your Genome
                    </motion.button>

                    <motion.a
                        href="#features"
                        className="px-8 py-4 glass rounded-xl font-semibold text-lg text-gray-300 hover:text-white transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Learn More →
                    </motion.a>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="grid grid-cols-3 gap-8 max-w-xl mx-auto mt-16"
                >
                    {[
                        { value: '10+', label: 'Traits Analyzed' },
                        { value: 'ZK', label: 'Privacy Proofs' },
                        { value: '$0', label: 'Gas on Polygon' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                            <div className="text-sm text-gray-500">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>


        </section>
    );
}
