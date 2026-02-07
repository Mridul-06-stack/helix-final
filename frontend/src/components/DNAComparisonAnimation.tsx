'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface DNAComparisonAnimationProps {
    isAnimating: boolean;
}

export default function DNAComparisonAnimation({ isAnimating }: DNAComparisonAnimationProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (isAnimating) {
            setProgress(0);
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return prev + 2;
                });
            }, 30);

            return () => clearInterval(interval);
        }
    }, [isAnimating]);

    if (!isAnimating) return null;

    return (
        <div className="relative w-full h-64 flex items-center justify-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-radial from-purple-500/20 via-transparent to-transparent animate-pulse" />

            {/* DNA Helixes */}
            <div className="relative w-full max-w-md h-full flex items-center justify-center gap-8">
                {/* Left DNA Helix (User DNA) */}
                <div className="relative flex-1">
                    <div className="text-xs text-gray-400 mb-2 text-center">Your DNA</div>
                    <DNAHelix color="cyan" delay={0} />
                </div>

                {/* Comparison Arrow */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="flex flex-col items-center gap-2"
                >
                    <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-2xl"
                    >
                        ⚡
                    </motion.div>
                    <div className="text-xs text-gray-500">Matching</div>
                </motion.div>

                {/* Right DNA Helix (Bounty Criteria) */}
                <div className="relative flex-1">
                    <div className="text-xs text-gray-400 mb-2 text-center">Bounty Criteria</div>
                    <DNAHelix color="purple" delay={0.2} />
                </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-4 left-0 right-0 px-8">
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
                <div className="text-center text-xs text-gray-400 mt-2">
                    Analyzing genetic markers... {progress}%
                </div>
            </div>
        </div>
    );
}

interface DNAHelixProps {
    color: 'cyan' | 'purple';
    delay: number;
}

function DNAHelix({ color, delay }: DNAHelixProps) {
    const baseColor = color === 'cyan' ? 'rgb(6, 182, 212)' : 'rgb(168, 85, 247)';
    const glowColor = color === 'cyan' ? 'rgba(6, 182, 212, 0.5)' : 'rgba(168, 85, 247, 0.5)';

    // Generate base pairs
    const basePairs = Array.from({ length: 12 }, (_, i) => i);

    return (
        <div className="relative h-48">
            <svg
                className="w-full h-full"
                viewBox="0 0 100 200"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* DNA Strands */}
                {basePairs.map((i) => {
                    const y = (i / basePairs.length) * 180 + 10;
                    const phase = (i / basePairs.length) * Math.PI * 4;
                    const leftX = 30 + Math.sin(phase) * 15;
                    const rightX = 70 + Math.sin(phase + Math.PI) * 15;

                    return (
                        <motion.g
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: delay + i * 0.05 }}
                        >
                            {/* Base pair connection */}
                            <motion.line
                                x1={leftX}
                                y1={y}
                                x2={rightX}
                                y2={y}
                                stroke={baseColor}
                                strokeWidth="1"
                                opacity="0.4"
                                animate={{
                                    opacity: [0.4, 0.8, 0.4],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2,
                                    delay: i * 0.1,
                                }}
                            />

                            {/* Left base */}
                            <motion.circle
                                cx={leftX}
                                cy={y}
                                r="3"
                                fill={baseColor}
                                filter={`drop-shadow(0 0 4px ${glowColor})`}
                                animate={{
                                    scale: [1, 1.2, 1],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2,
                                    delay: i * 0.1,
                                }}
                            />

                            {/* Right base */}
                            <motion.circle
                                cx={rightX}
                                cy={y}
                                r="3"
                                fill={baseColor}
                                filter={`drop-shadow(0 0 4px ${glowColor})`}
                                animate={{
                                    scale: [1, 1.2, 1],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2,
                                    delay: i * 0.1 + 0.1,
                                }}
                            />
                        </motion.g>
                    );
                })}

                {/* Backbone strands */}
                <motion.path
                    d={`M ${30 + Math.sin(0) * 15} 10 ${basePairs.map((i) => {
                        const y = (i / basePairs.length) * 180 + 10;
                        const phase = (i / basePairs.length) * Math.PI * 4;
                        const x = 30 + Math.sin(phase) * 15;
                        return `L ${x} ${y}`;
                    }).join(' ')}`}
                    stroke={baseColor}
                    strokeWidth="2"
                    fill="none"
                    opacity="0.6"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay }}
                />

                <motion.path
                    d={`M ${70 + Math.sin(Math.PI) * 15} 10 ${basePairs.map((i) => {
                        const y = (i / basePairs.length) * 180 + 10;
                        const phase = (i / basePairs.length) * Math.PI * 4;
                        const x = 70 + Math.sin(phase + Math.PI) * 15;
                        return `L ${x} ${y}`;
                    }).join(' ')}`}
                    stroke={baseColor}
                    strokeWidth="2"
                    fill="none"
                    opacity="0.6"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: delay + 0.2 }}
                />
            </svg>
        </div>
    );
}
