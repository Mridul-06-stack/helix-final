'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/config/contracts';
import { CONTRACTS } from '@/contracts';
import { ethers } from 'ethers';

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

        try {
            // Get the correct Ethereum provider
            const provider = (window as any).ethereum;

            if (!provider) {
                alert('Please install MetaMask or another Web3 wallet');
                setIsProcessing(false);
                return;
            }

            // Ensure wallet is connected and we have permission
            console.log('Requesting account access...');
            const accounts = await provider.request({
                method: 'eth_requestAccounts',
            });

            if (!accounts || accounts.length === 0) {
                alert('Please connect your wallet first');
                setIsProcessing(false);
                return;
            }

            const activeWallet = accounts[0];
            console.log('Using wallet:', activeWallet);

            // Get signing message from API
            console.log('Fetching signing message from:', `${API_BASE_URL}/mint/signing-message/${activeWallet}`);
            const messageResponse = await fetch(`${API_BASE_URL}/mint/signing-message/${activeWallet}`);
            if (!messageResponse.ok) {
                throw new Error(`Failed to get signing message: ${messageResponse.status}`);
            }
            const { message } = await messageResponse.json();
            console.log('Got signing message:', message);

            // Request signature from wallet
            console.log('Requesting signature from wallet...');
            const signature = await provider.request({
                method: 'personal_sign',
                params: [message, activeWallet],
            });
            console.log('Got signature:', signature);

            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('wallet_address', activeWallet);
            formData.append('signature', signature);
            formData.append('gene_type', '23andme');

            // Upload and encrypt
            const response = await fetch(`${API_BASE_URL}/mint/encrypt`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setResult({
                    ipfsCid: data.ipfs_cid,
                    dataHash: data.data_hash,
                    fileSize: data.file_size,
                });
                setStep(3);
            } else {
                alert('Encryption failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Encryption error:', error);
            alert('Failed to encrypt data: ' + (error as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMint = async () => {
        if (!result || !wallet) return;

        setIsProcessing(true);

        try {
            console.log('🚀 Starting mint process...');
            console.log('Wallet:', wallet);
            console.log('Result data:', result);

            // Check if MetaMask is installed
            if (!(window as any).ethereum) {
                throw new Error('MetaMask is not installed! Please install MetaMask to continue.');
            }

            const provider = new ethers.BrowserProvider((window as any).ethereum);
            console.log('✅ Provider created');

            // Check network
            const network = await provider.getNetwork();
            console.log('Current network:', {
                name: network.name,
                chainId: network.chainId.toString(),
            });

            const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

            if (network.chainId !== BigInt(11155111)) {
                console.error('❌ Wrong network detected!');
                console.error('   Current:', network.chainId.toString());
                console.error('   Required: 11155111 (Sepolia)');

                // Try to automatically switch network
                try {
                    console.log('🔄 Attempting to switch to Sepolia...');
                    await (window as any).ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: SEPOLIA_CHAIN_ID }],
                    });

                    // Wait a bit for network to switch
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Verify switch was successful
                    const newNetwork = await provider.getNetwork();
                    if (newNetwork.chainId !== BigInt(11155111)) {
                        throw new Error('Network switch failed');
                    }

                    console.log('✅ Successfully switched to Sepolia!');
                } catch (switchError: any) {
                    console.error('Failed to switch network:', switchError);

                    // If network doesn't exist, try to add it
                    if (switchError.code === 4902) {
                        try {
                            console.log('📡 Adding Sepolia network to MetaMask...');
                            await (window as any).ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: SEPOLIA_CHAIN_ID,
                                    chainName: 'Sepolia Testnet',
                                    nativeCurrency: {
                                        name: 'Sepolia ETH',
                                        symbol: 'ETH',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://ethereum-sepolia.publicnode.com'],
                                    blockExplorerUrls: ['https://sepolia.etherscan.io']
                                }]
                            });
                            console.log('✅ Sepolia network added!');
                        } catch (addError) {
                            console.error('Failed to add network:', addError);
                            alert('❌ Wrong Network!\n\nYou are on Chain ID: ' + network.chainId + '\nRequired: Sepolia (Chain ID: 11155111)\n\nPlease manually switch to Sepolia testnet in MetaMask.\n\n1. Open MetaMask\n2. Click network dropdown\n3. Select "Sepolia" or add it manually');
                            setIsProcessing(false);
                            return;
                        }
                    } else {
                        alert('❌ Wrong Network!\n\nYou are on Chain ID: ' + network.chainId + '\nRequired: Sepolia (Chain ID: 11155111)\n\nPlease switch to Sepolia testnet in MetaMask.');
                        setIsProcessing(false);
                        return;
                    }
                }
            }
            console.log('✅ Connected to Sepolia testnet');

            const signer = await provider.getSigner();
            const signerAddress = await signer.getAddress();
            console.log('✅ Signer address:', signerAddress);

            // Verify wallet matches
            if (signerAddress.toLowerCase() !== wallet.toLowerCase()) {
                throw new Error(`Wallet mismatch! Expected ${wallet} but got ${signerAddress}`);
            }

            // Create contract instance
            console.log('Creating contract instance at:', CONTRACTS.GeneticNFT.address);
            const contract = new ethers.Contract(
                CONTRACTS.GeneticNFT.address,
                CONTRACTS.GeneticNFT.abi,
                signer
            );
            console.log('✅ Contract instance created');

            // Verify contract is deployed
            const code = await provider.getCode(CONTRACTS.GeneticNFT.address);
            if (code === '0x') {
                throw new Error('❌ Contract not deployed at ' + CONTRACTS.GeneticNFT.address);
            }
            console.log('✅ Contract verified on chain (bytecode length:', code.length, ')');

            // Prepare contract parameters
            const ipfsCID = result.ipfsCid;
            const dataHash = result.dataHash.startsWith('0x') ? result.dataHash : '0x' + result.dataHash;
            const encryptionAlgo = "AES-256-GCM";
            const geneType = "23andme";
            const fileSize = result.fileSize;
            const tokenURI = ""; // Token URI (optional)

            console.log('Contract parameters:', {
                ipfsCID,
                dataHash,
                encryptionAlgo,
                geneType,
                fileSize,
            });

            // Get mint fee from contract
            console.log('📞 Calling contract.mintFee()...');
            try {
                const mintFee = await contract.mintFee();
                console.log('✅ Mint fee retrieved:', ethers.formatEther(mintFee), 'ETH');
                console.log('   Mint fee (wei):', mintFee.toString());
            } catch (feeError: any) {
                console.error('❌ Error calling mintFee():', feeError);
                console.error('   Error code:', feeError.code);
                console.error('   Error message:', feeError.message);
                console.error('   Error data:', feeError.data);
                throw new Error(`Failed to read mint fee from contract: ${feeError.message}`);
            }

            const mintFee = await contract.mintFee();

            // Call mintGenome function
            console.log('📤 Sending mint transaction...');
            console.log('Parameters:', {
                ipfsCID,
                dataHash,
                encryptionAlgo,
                geneType,
                fileSize,
                mintFee: ethers.formatEther(mintFee) + ' ETH'
            });

            const tx = await contract.mintGenome(
                ipfsCID,
                dataHash,
                encryptionAlgo,
                geneType,
                fileSize,
                tokenURI,
                { value: mintFee }
            );

            console.log('✅ Transaction sent!');
            console.log('   Hash:', tx.hash);
            console.log('   From:', tx.from);
            console.log('   To:', tx.to);
            console.log('   View on Etherscan:', `https://sepolia.etherscan.io/tx/${tx.hash}`);
            console.log('⏳ Waiting for confirmation (this may take 10-30 seconds)...');

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt);

            // Parse all events to find GenomeMinted
            let tokenId = 'Unknown';
            for (const log of receipt.logs) {
                try {
                    const parsed = contract.interface.parseLog({
                        topics: [...log.topics],
                        data: log.data
                    });

                    if (parsed && parsed.name === 'GenomeMinted') {
                        tokenId = parsed.args.tokenId.toString();
                        console.log('✅ Found Token ID:', tokenId);
                        console.log('Full event:', parsed.args);
                        break;
                    }
                } catch (e) {
                    // Skip logs that don't match our contract
                    continue;
                }
            }

            // If we couldn't find it in events, query the contract
            if (tokenId === 'Unknown') {
                try {
                    const balance = await contract.balanceOf(wallet);
                    const lastTokenId = await contract.tokenOfOwnerByIndex(wallet, balance - BigInt(1));
                    tokenId = lastTokenId.toString();
                    console.log('✅ Got Token ID from contract:', tokenId);
                } catch (e) {
                    console.error('Could not get token ID:', e);
                }
            }

            setResult({
                ...result,
                tokenId,
                txHash: tx.hash,
            });

            setStep(4);
        } catch (error: any) {
            console.error('Minting error:', error);
            alert('Failed to mint NFT: ' + (error.message || error.toString()));
        } finally {
            setIsProcessing(false);
        }
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
                                '🧬 Mint NFT (0.001 ETH)'
                            )}
                        </motion.button>
                    </motion.div>
                )}

                {/* Step 4: Success */}
                {step === 4 && result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass rounded-3xl p-12 text-center"
                    >
                        <div className="text-6xl mb-6">🎉</div>
                        <h2 className="text-3xl font-bold mb-4 gradient-text">Success!</h2>
                        <p className="text-gray-400 mb-8">
                            Your genome has been minted as an NFT on Sepolia testnet. You now have cryptographic
                            ownership of your genetic data!
                        </p>

                        <div className="space-y-4 mb-8">
                            <div className="glass rounded-xl p-6">
                                <p className="text-sm text-gray-400 mb-2">Your Token ID</p>
                                <p className="text-3xl font-bold gradient-text">#{result.tokenId || 'Processing...'}</p>
                            </div>

                            {result.txHash && (
                                <div className="glass rounded-xl p-4">
                                    <p className="text-sm text-gray-400 mb-2">Transaction Hash</p>
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-sm text-purple-400 hover:text-purple-300 break-all"
                                    >
                                        {result.txHash}
                                    </a>
                                </div>
                            )}

                            <div className="glass rounded-xl p-4">
                                <p className="text-sm text-gray-400 mb-2">IPFS CID</p>
                                <a
                                    href={`https://gateway.pinata.cloud/ipfs/${result.ipfsCid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-sm text-purple-400 hover:text-purple-300 break-all"
                                >
                                    {result.ipfsCid}
                                </a>
                            </div>

                            <div className="glass rounded-xl p-4">
                                <p className="text-sm text-gray-400 mb-2">Contract Address</p>
                                <a
                                    href={`https://sepolia.etherscan.io/address/${CONTRACTS.GeneticNFT.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-sm text-purple-400 hover:text-purple-300 break-all"
                                >
                                    {CONTRACTS.GeneticNFT.address}
                                </a>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                You can now query your genome and earn rewards from research bounties!
                            </p>

                            <motion.button
                                onClick={() => {
                                    setFile(null);
                                    setStep(1);
                                    setResult(null);
                                }}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Mint Another NFT
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </div>
        </section>
    );
}
