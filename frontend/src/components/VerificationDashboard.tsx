'use client';

import { motion } from 'framer-motion';

interface VerificationStatus {
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
}

interface VerificationDashboardProps {
    verificationStatus: VerificationStatus;
    onRegister: () => void;
}

export default function VerificationDashboard({ verificationStatus, onRegister }: VerificationDashboardProps) {
    const getStatusInfo = () => {
        switch (verificationStatus.status) {
            case 'NotRegistered':
                return {
                    icon: '📝',
                    title: 'Not Registered',
                    description: 'Register as a researcher to create bounties',
                    color: 'gray',
                    action: 'Register Now'
                };
            case 'Pending':
                return {
                    icon: '⏳',
                    title: 'Verification Pending',
                    description: 'Your application is under review. We\'ll notify you within 24-48 hours.',
                    color: 'yellow',
                    action: null
                };
            case 'EmailVerified':
                return {
                    icon: '📧',
                    title: 'Email Verified',
                    description: 'Email verified. Awaiting full verification approval.',
                    color: 'blue',
                    action: null
                };
            case 'FullyVerified':
                return {
                    icon: '✅',
                    title: 'Fully Verified',
                    description: 'You can now create research bounties!',
                    color: 'green',
                    action: null
                };
            case 'Suspended':
                return {
                    icon: '⚠️',
                    title: 'Account Suspended',
                    description: 'Your account has been temporarily suspended. Contact support for details.',
                    color: 'orange',
                    action: null
                };
            case 'Revoked':
                return {
                    icon: '🚫',
                    title: 'Verification Revoked',
                    description: 'Your verification has been revoked. Contact support for more information.',
                    color: 'red',
                    action: null
                };
        }
    };

    const statusInfo = getStatusInfo();

    const getColorClasses = (color: string) => {
        const colors = {
            gray: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
            yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
            blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
            green: 'bg-green-500/10 border-green-500/20 text-green-400',
            orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
            red: 'bg-red-500/10 border-red-500/20 text-red-400',
        };
        return colors[color as keyof typeof colors] || colors.gray;
    };

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass rounded-xl p-6 border ${getColorClasses(statusInfo.color)}`}
            >
                <div className="flex items-start gap-4">
                    <div className="text-4xl">{statusInfo.icon}</div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{statusInfo.title}</h3>
                        <p className="text-gray-400 mb-4">{statusInfo.description}</p>

                        {statusInfo.action && (
                            <motion.button
                                onClick={onRegister}
                                className="px-6 py-3 bg-gradient-helix rounded-lg font-semibold glow-button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {statusInfo.action}
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Researcher Profile (if registered) */}
            {verificationStatus.status !== 'NotRegistered' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-xl p-6"
                >
                    <h4 className="text-lg font-semibold mb-4">Researcher Profile</h4>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium">{verificationStatus.name || 'N/A'}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Institution</p>
                            <p className="font-medium">{verificationStatus.institution || 'N/A'}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium text-sm">{verificationStatus.email || 'N/A'}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Research Field</p>
                            <p className="font-medium">{verificationStatus.researchField || 'N/A'}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Reputation & Stats (if fully verified) */}
            {verificationStatus.status === 'FullyVerified' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-xl p-6"
                >
                    <h4 className="text-lg font-semibold mb-4">Reputation & Statistics</h4>

                    <div className="space-y-4">
                        {/* Reputation Score */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Reputation Score</span>
                                <span className="font-bold text-lg gradient-text">
                                    {verificationStatus.reputationScore || 50}/100
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${verificationStatus.reputationScore || 50}%` }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                    className="bg-gradient-helix h-2 rounded-full"
                                />
                            </div>
                        </div>

                        {/* Bounty Stats */}
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="glass rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold gradient-text">
                                    {verificationStatus.totalBounties || 0}
                                </p>
                                <p className="text-sm text-gray-400">Total Bounties</p>
                            </div>

                            <div className="glass rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold text-green-400">
                                    {verificationStatus.successfulBounties || 0}
                                </p>
                                <p className="text-sm text-gray-400">Successful</p>
                            </div>
                        </div>

                        {/* Success Rate */}
                        {(verificationStatus.totalBounties || 0) > 0 && (
                            <div className="glass rounded-lg p-4 bg-purple-500/10">
                                <p className="text-sm text-gray-400 mb-1">Success Rate</p>
                                <p className="text-xl font-bold text-purple-400">
                                    {Math.round(
                                        ((verificationStatus.successfulBounties || 0) /
                                            (verificationStatus.totalBounties || 1)) *
                                        100
                                    )}%
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Verification Timeline (if registered) */}
            {verificationStatus.status !== 'NotRegistered' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass rounded-xl p-6"
                >
                    <h4 className="text-lg font-semibold mb-4">Verification Timeline</h4>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="flex-1">
                                <p className="font-medium">Registration Submitted</p>
                                <p className="text-sm text-gray-500">
                                    {verificationStatus.registeredAt
                                        ? new Date(verificationStatus.registeredAt * 1000).toLocaleDateString()
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {verificationStatus.verifiedAt && (
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <div className="flex-1">
                                    <p className="font-medium">Verification Approved</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(verificationStatus.verifiedAt * 1000).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
