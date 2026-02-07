'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResearcherRegistrationProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function ResearcherRegistration({ onClose, onSuccess }: ResearcherRegistrationProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        institution: '',
        email: '',
        researchField: '',
        orcidId: '',
        irbApprovalNumber: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateStep1 = () => {
        if (!formData.name.trim()) {
            setError('Please enter your full name');
            return false;
        }
        if (!formData.institution.trim()) {
            setError('Please enter your institution');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.email.trim()) {
            setError('Please enter your email');
            return false;
        }
        // Check for institutional email domains
        const emailDomain = formData.email.split('@')[1]?.toLowerCase();
        const validDomains = ['.edu', '.ac.', '.org', 'nih.gov', 'who.int'];
        const isValidDomain = validDomains.some(domain => emailDomain?.includes(domain));

        if (!isValidDomain) {
            setError('Please use an institutional email (.edu, .ac., .org, etc.)');
            return false;
        }
        if (!formData.researchField.trim()) {
            setError('Please enter your research field');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2()) {
            setStep(3);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            // Simulate API call to register researcher
            await new Promise(resolve => setTimeout(resolve, 2000));

            // TODO: Call smart contract registerResearcher function
            // const tx = await researcherRegistry.registerResearcher(
            //     formData.name,
            //     formData.institution,
            //     formData.email,
            //     formData.researchField
            // );
            // await tx.wait();

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold gradient-text">Researcher Registration</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Verify your identity to create research bounties
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center flex-1">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step >= s
                                        ? 'bg-gradient-helix text-white'
                                        : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                {s}
                            </div>
                            {s < 3 && (
                                <div
                                    className={`flex-1 h-1 mx-2 transition-all ${step > s ? 'bg-gradient-helix' : 'bg-gray-700'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h3 className="text-xl font-semibold mb-4">Personal Information</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className="w-full px-4 py-3 glass rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="Dr. Jane Smith"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Institution / Organization *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.institution}
                                        onChange={(e) => handleInputChange('institution', e.target.value)}
                                        className="w-full px-4 py-3 glass rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="Stanford University"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h3 className="text-xl font-semibold mb-4">Professional Details</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Institutional Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className="w-full px-4 py-3 glass rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="jane.smith@stanford.edu"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Must be from .edu, .ac., .org, or recognized research institution
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Research Field *
                                    </label>
                                    <select
                                        value={formData.researchField}
                                        onChange={(e) => handleInputChange('researchField', e.target.value)}
                                        className="w-full px-4 py-3 glass rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="">Select your field</option>
                                        <option value="Genetics">Genetics</option>
                                        <option value="Oncology">Oncology</option>
                                        <option value="Neuroscience">Neuroscience</option>
                                        <option value="Pharmacogenomics">Pharmacogenomics</option>
                                        <option value="Bioinformatics">Bioinformatics</option>
                                        <option value="Epidemiology">Epidemiology</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h3 className="text-xl font-semibold mb-4">Additional Credentials (Optional)</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        ORCID iD
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.orcidId}
                                        onChange={(e) => handleInputChange('orcidId', e.target.value)}
                                        className="w-full px-4 py-3 glass rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="0000-0002-1234-5678"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Helps verify your research credentials
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        IRB Approval Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.irbApprovalNumber}
                                        onChange={(e) => handleInputChange('irbApprovalNumber', e.target.value)}
                                        className="w-full px-4 py-3 glass rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="IRB-2024-12345"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Institutional Review Board approval (if applicable)
                                    </p>
                                </div>

                                <div className="glass rounded-lg p-4 bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-sm text-blue-300">
                                        <strong>📋 Next Steps:</strong> After registration, your application will be reviewed by our team.
                                        You'll receive an email notification once verified (typically within 24-48 hours).
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8">
                    {step > 1 && (
                        <motion.button
                            onClick={() => setStep(step - 1)}
                            className="flex-1 py-3 glass rounded-lg font-medium hover:bg-white/10 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Back
                        </motion.button>
                    )}

                    {step < 3 ? (
                        <motion.button
                            onClick={handleNext}
                            className="flex-1 py-3 bg-gradient-helix rounded-lg font-semibold glow-button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Next
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-gradient-helix rounded-lg font-semibold glow-button disabled:opacity-50"
                            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span>
                                    Submitting...
                                </span>
                            ) : (
                                'Submit Registration'
                            )}
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
