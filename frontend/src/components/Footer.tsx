'use client';

import { motion } from 'framer-motion';

export default function Footer() {
    return (
        <footer className="glass border-t border-white/5 mt-24">
            <div className="container mx-auto px-6 py-12">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-helix flex items-center justify-center">
                                <span className="text-2xl">🧬</span>
                            </div>
                            <span className="text-xl font-bold gradient-text">HelixVault</span>
                        </div>
                        <p className="text-gray-400 text-sm max-w-md">
                            Privacy-preserving genomic data platform. Turn your DNA into an NFT,
                            monetize insights without exposing your raw genetic data.
                        </p>
                        <div className="flex gap-4 mt-6">
                            {['Twitter', 'Discord', 'GitHub'].map((social) => (
                                <motion.a
                                    key={social}
                                    href="#"
                                    className="w-10 h-10 glass rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {social[0]}
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-white transition-colors">Mint NFT</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Query Genome</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Bounties</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Whitepaper</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Smart Contract</a></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">
                        © 2026 HelixVault. Built for DeSci.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Powered by</span>
                        <span className="text-purple-400">Polygon</span>
                        <span>•</span>
                        <span className="text-blue-400">IPFS</span>
                        <span>•</span>
                        <span className="text-green-400">AI</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
