'use client';

import { motion } from 'framer-motion';

interface HeaderProps {
    wallet: string | null;
    onConnect: () => void;
    activeSection: string;
    onSectionChange: (section: string) => void;
}

export default function Header({ wallet, onConnect, activeSection, onSectionChange }: HeaderProps) {
    const navItems = [
        { id: 'home', label: 'Home' },
        { id: 'mint', label: 'Mint' },
        { id: 'query', label: 'Query' },
        { id: 'bounties', label: 'Bounties' },
    ];

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/10 shadow-2xl"
        >
            <div className="container mx-auto px-6 py-5">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <motion.div
                        className="flex items-center gap-4 cursor-pointer group"
                        onClick={() => onSectionChange('home')}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-gradient-helix flex items-center justify-center shadow-lg shadow-purple-500/40 group-hover:shadow-purple-500/60 transition-all duration-300 border border-purple-400/30">
                                <span className="text-2xl">🧬</span>
                            </div>
                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-helix opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300" />
                        </div>
                        <div>
                            <span className="text-xl font-bold gradient-text block leading-tight">HelixVault</span>
                            <span className="text-xs text-gray-400 font-medium">Genomic Data Platform</span>
                        </div>
                    </motion.div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm">
                        {navItems.map((item) => (
                            <motion.button
                                key={item.id}
                                onClick={() => onSectionChange(item.id)}
                                className={`relative px-6 py-2.5 text-sm font-semibold transition-all rounded-xl ${activeSection === item.id
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {item.label}
                                {activeSection === item.id && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-gradient-helix rounded-xl -z-10 shadow-lg shadow-purple-500/40"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </motion.button>
                        ))}
                    </nav>

                    {/* Wallet Button */}
                    <motion.button
                        onClick={onConnect}
                        className={`relative px-7 py-3 rounded-xl font-semibold text-sm transition-all overflow-hidden ${wallet
                                ? 'bg-green-500/20 text-green-300 border-2 border-green-500/50 shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
                                : 'bg-gradient-helix text-white border-2 border-purple-500/40 shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60'
                            }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {/* Animated background for wallet button */}
                        {!wallet && (
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                animate={{
                                    x: ['-100%', '100%'],
                                }}
                                transition={{
                                    duration: 2.5,
                                    repeat: Infinity,
                                    ease: 'linear',
                                }}
                            />
                        )}

                        <span className="relative z-10 flex items-center gap-2.5">
                            {wallet ? (
                                <>
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/60"></span>
                                    <span className="font-mono">{truncateAddress(wallet)}</span>
                                </>
                            ) : (
                                'Connect Wallet'
                            )}
                        </span>
                    </motion.button>
                </div>
            </div>
        </motion.header>
    );
}
