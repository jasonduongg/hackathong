'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline';

export default function Hero() {
    const router = useRouter();

    const handleGetStarted = () => {
        router.push('/auth?tab=signup');
    };

    return (
        <div className="relative z-10 max-w-5xl mx-auto pt-32 pb-16">
            <div className="text-left">
                {/* Tagline */}
                <div className="mb-8">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
                        <span className="block">Dilly Dally</span>
                        <span className="block text-soft-orange-600">
                            Now
                        </span>
                        <span className="block">Split Later</span>
                    </h1>
                </div>

                {/* Subtitle */}
                <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl leading-relaxed">
                    Stop worrying about who owes what. Our smart video analysis automatically detects receipts and splits expenses with your friends.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 items-start mb-16">
                    <button
                        onClick={handleGetStarted}
                        className="group relative px-8 py-4 bg-gradient-to-r from-soft-orange-500 to-soft-orange-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center gap-2"
                    >
                        Get Started Free
                        <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                    </button>
                    <button
                        onClick={() => router.push('/plans')}
                        className="group px-8 py-4 bg-white/80 backdrop-blur-sm text-soft-orange-600 font-semibold rounded-full border-2 border-soft-orange-600 hover:bg-soft-orange-600 hover:text-white transition-all duration-200 flex items-center gap-2 shadow-lg"
                    >
                        View Plans
                    </button>
                </div>

                {/* Social proof */}
                <div className="mt-16">
                    <p className="text-gray-700 mb-4 font-medium">Trusted by thousands of users</p>
                    <div className="flex items-center gap-8 opacity-70">
                        <div className="text-2xl font-bold text-gray-900">4.9★</div>
                        <div className="text-gray-600">•</div>
                        <div className="text-gray-700">10,000+ receipts processed</div>
                        <div className="text-gray-600">•</div>
                        <div className="text-gray-700">99% accuracy</div>
                    </div>
                </div>
            </div>
        </div>
    );
} 