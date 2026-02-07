'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import MintSection from '@/components/MintSection';
import QuerySection from '@/components/QuerySection';
import BountySection from '@/components/BountySection';
import Footer from '@/components/Footer';
import DNABackground from '@/components/DNABackground';

export default function Home() {
    const [activeSection, setActiveSection] = useState<string>('home');
    const [wallet, setWallet] = useState<string | null>(null);

    const connectWallet = async () => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                const accounts = await (window as any).ethereum.request({
                    method: 'eth_requestAccounts',
                });
                setWallet(accounts[0]);
            } catch (error) {
                console.error('Failed to connect wallet:', error);
            }
        } else {
            alert('Please install MetaMask to use this app!');
        }
    };

    useEffect(() => {
        // Check if already connected
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            (window as any).ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
                if (accounts.length > 0) {
                    setWallet(accounts[0]);
                }
            });
        }
    }, []);

    return (
        <main className="min-h-screen relative overflow-hidden">
            {/* Animated background */}
            <DNABackground />

            {/* Header */}
            <Header
                wallet={wallet}
                onConnect={connectWallet}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
            />

            {/* Main content */}
            <AnimatePresence mode="wait">
                {activeSection === 'home' && (
                    <motion.div
                        key="home"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Hero onGetStarted={() => setActiveSection('mint')} />
                        <Features />
                    </motion.div>
                )}

                {activeSection === 'mint' && (
                    <motion.div
                        key="mint"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                    >
                        <MintSection wallet={wallet} onConnect={connectWallet} />
                    </motion.div>
                )}

                {activeSection === 'query' && (
                    <motion.div
                        key="query"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                    >
                        <QuerySection wallet={wallet} />
                    </motion.div>
                )}

                {activeSection === 'bounties' && (
                    <motion.div
                        key="bounties"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                    >
                        <BountySection wallet={wallet} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <Footer />
        </main>
    );
}
