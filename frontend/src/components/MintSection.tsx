'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface MintSectionProps {
    wallet: string | null;
    onConnect: () => void;
}

export default function MintSection({ wallet, onConnect }: MintSectionProps) {
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<number>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setStep(2);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStep(2);
        }
    };

    const handleEncrypt = async () => {
        if (!file || !wallet) return;

        setIsProcessing(true);

        // Simulate encryption process
        await new Promise(resolve => setTimeout(resolve, 2000));

        setResult({
            ipfsCid: 'QmDemo' + Math.random().toString(36).substr(2, 9),
            dataHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            fileSize: file.size,
        });

        setStep(3);
        setIsProcessing(false);
    };

    const handleMint = async () => {
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setStep(4);
        setIsProcessing(false);
    };

    if (!wallet) {
        return (
            <section className="min-h-screen flex items-center justify-center pt-20 px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-3xl p-12 max-w-md text-center"
                >
                    <div className="text-6xl mb-6">🔐</div>
                    <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
                    <p className="text-gray-400 mb-8">
                        Connect your MetaMask wallet to encrypt and mint your genetic data as an NFT.
                    </p>
                    <motion.button
                        onClick={onConnect}
                        className="px-8 py-4 bg-gradient-helix rounded-xl font-semibold glow-button w-full"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Connect MetaMask
                    </motion.button>
                </motion.div>
            </section>
        );
    }

    return (
        <section className="min-h-screen pt-24 px-6 pb-12">
            <div className="container mx-auto max-w-4xl">
                {/* Progress steps */}
                <div className="flex justify-center mb-12">
                    {[
                        { num: 1, label: 'Upload' },
                        { num: 2, label: 'Encrypt' },
                        { num: 3, label: 'Mint' },
                        { num: 4, label: 'Done' },
                    ].map((s, i) => (
                        <div key={s.num} className="flex items-center">
                            <motion.div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s.num
                                    ? 'bg-gradient-helix text-white'
                                    : 'glass text-gray-500'
                                    }`}
                                animate={{ scale: step === s.num ? 1.1 : 1 }}
                            >
                                {step > s.num ? '✓' : s.num}
                            </motion.div>
                            <span className={`ml-2 text-sm ${step >= s.num ? 'text-white' : 'text-gray-500'}`}>
                                {s.label}
                            </span>
                            {i < 3 && <div className={`w-12 h-0.5 mx-4 ${step > s.num ? 'bg-gradient-helix' : 'bg-gray-700'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Upload */}
                {step === 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-3xl p-8"
                    >
                        <h2 className="text-2xl font-bold mb-6 text-center">Upload Your Genetic Data</h2>

                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragActive
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-600 hover:border-gray-500'
                                }`}
                        >
                            <div className="text-5xl mb-4">📁</div>
                            <h3 className="text-xl font-semibold mb-2">Drag & Drop Your File</h3>
                            <p className="text-gray-400 mb-4">Supports 23andMe, Ancestry, and VCF formats</p>
                            <label className="inline-block">
                                <input
                                    type="file"
                                    accept=".txt,.csv,.vcf,.gz"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <span className="px-6 py-3 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors">
                                    Or Browse Files
                                </span>
                            </label>
                        </div>

                        <div className="mt-8 p-4 glass rounded-xl">
                            <h4 className="font-semibold mb-2 text-sm text-gray-400">🔒 Privacy Guarantee</h4>
                            <p className="text-sm text-gray-500">
                                Your genetic data never leaves your browser unencrypted. It is processed locally
                                and encrypted with your wallet signature before upload.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Encrypt */}
                {step === 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-3xl p-8"
                    >
                        <h2 className="text-2xl font-bold mb-6 text-center">Encrypt Your Data</h2>

                        <div className="glass rounded-xl p-6 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">📄</div>
                                <div>
                                    <p className="font-semibold">{file?.name}</p>
                                    <p className="text-sm text-gray-400">{(file?.size || 0 / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-gray-400">
                                <span className="text-green-400">✓</span>
                                <span>AES-256-GCM encryption</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-400">
                                <span className="text-green-400">✓</span>
                                <span>Key derived from your wallet signature</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-400">
                                <span className="text-green-400">✓</span>
                                <span>Uploaded to IPFS (decentralized storage)</span>
                            </div>
                        </div>

                        <motion.button
                            onClick={handleEncrypt}
                            disabled={isProcessing}
                            className="w-full px-8 py-4 bg-gradient-helix rounded-xl font-semibold glow-button disabled:opacity-50"
                            whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⚙️</span>
                                    Encrypting...
                                </span>
                            ) : (
                                '🔐 Sign & Encrypt'
                            )}
                        </motion.button>
                    </motion.div>
                )}

                {/* Step 3: Mint */}
                {step === 3 && result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-3xl p-8"
                    >
                        <h2 className="text-2xl font-bold mb-6 text-center">🎉 Ready to Mint!</h2>

                        <div className="space-y-4 mb-8">
                            <div className="glass rounded-xl p-4">
                                <p className="text-sm text-gray-400">IPFS CID</p>
                                <p className="font-mono text-sm break-all">{result.ipfsCid}</p>
                            </div>
                            <div className="glass rounded-xl p-4">
                                <p className="text-sm text-gray-400">Data Hash</p>
                                <p className="font-mono text-sm break-all">{result.dataHash}</p>
                            </div>
                            <div className="glass rounded-xl p-4">
                                <p className="text-sm text-gray-400">File Size</p>
                                <p>{result.fileSize} bytes (encrypted)</p>
                            </div>
                        </div>

                        <motion.button
                            onClick={handleMint}
                            disabled={isProcessing}
                            className="w-full px-8 py-4 bg-gradient-helix rounded-xl font-semibold glow-button disabled:opacity-50"
                            whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⚙️</span>
                                    Minting...
                                </span>
                            ) : (
                                '🧬 Mint NFT (0.001 MATIC)'
                            )}
                        </motion.button>
                    </motion.div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass rounded-3xl p-12 text-center"
                    >
                        <div className="text-6xl mb-6">🎉</div>
                        <h2 className="text-3xl font-bold mb-4 gradient-text">Success!</h2>
                        <p className="text-gray-400 mb-8">
                            Your genome has been minted as an NFT. You now have cryptographic
                            ownership of your genetic data!
                        </p>

                        <div className="glass rounded-xl p-6 mb-8">
                            <p className="text-sm text-gray-400 mb-2">Your Token ID</p>
                            <p className="text-3xl font-bold gradient-text">#1</p>
                        </div>

                        <p className="text-sm text-gray-500">
                            You can now query your genome and earn rewards from research bounties!
                        </p>
                    </motion.div>
                )}
            </div>
        </section>
    );
}
