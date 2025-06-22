'use client';

import React, { useState } from 'react';
import { CameraIcon, DocumentTextIcon, UsersIcon, CreditCardIcon, VideoCameraIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export default function HowItWorks() {
    const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');

    const afterTripSteps = [
        {
            icon: CameraIcon,
            title: "Record Your Receipt",
            description: "Simply point your camera at any receipt and record a quick video. Our AI works with any receipt format - from restaurants to retail stores.",
            color: "bg-gradient-to-r from-soft-orange-500 to-soft-orange-600"
        },
        {
            icon: DocumentTextIcon,
            title: "AI Extracts Data",
            description: "Our advanced computer vision automatically detects and extracts all the important information: items, prices, taxes, and totals.",
            color: "bg-gradient-to-r from-soft-orange-500 to-soft-orange-600"
        },
        {
            icon: UsersIcon,
            title: "Split with Friends",
            description: "Select which friends were part of the expense and our smart algorithm calculates exactly who owes what.",
            color: "bg-gradient-to-r from-soft-orange-400 to-soft-orange-500"
        },
        {
            icon: CreditCardIcon,
            title: "Track & Settle",
            description: "Keep track of all shared expenses and settle up easily with integrated payment options or manual tracking.",
            color: "bg-gradient-to-r from-soft-orange-500 to-soft-orange-600"
        }
    ];

    const beforeTripSteps = [
        {
            icon: VideoCameraIcon,
            title: "Find & Add Activities",
            description: "Find exciting activities on Instagram and add them to your trip with just a URL. Our AI automatically extracts all the details, pricing, and location information from any Instagram post.",
            color: "bg-gradient-to-r from-soft-orange-400 to-soft-orange-500"
        },
        {
            icon: ChartBarIcon,
            title: "AI Analyzes & Estimates",
            description: "Our AI analyzes your video and creates detailed expense estimates, breaking down costs by category and activity. For Instagram activities, it extracts location, pricing, and activity details automatically.",
            color: "bg-gradient-to-r from-soft-orange-500 to-soft-orange-600"
        },
        {
            icon: UsersIcon,
            title: "Plan with Friends",
            description: "Share the estimated budget with friends, get their input, and adjust plans based on everyone's preferences and budget. Instagram activities are automatically shared with your group.",
            color: "bg-gradient-to-r from-soft-orange-500 to-soft-orange-600"
        },
        {
            icon: CreditCardIcon,
            title: "Pre-fund & Track",
            description: "Set up pre-funding for the trip and track actual expenses against your estimates in real-time. Instagram activity costs are automatically included in your budget tracking.",
            color: "bg-gradient-to-r from-soft-orange-500 to-soft-orange-600"
        }
    ];

    const currentSteps = activeTab === 'before' ? beforeTripSteps : afterTripSteps;
    const stepNumberColor = 'bg-gradient-to-r from-soft-orange-500 to-soft-orange-600';
    const cardBgColor = 'bg-soft-orange-25/80 backdrop-blur-sm';
    const cardBorderColor = 'border-soft-orange-200/50';

    return (
        <section className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Toggle Buttons */}
                <div className="flex justify-center mb-16">
                    <div className="bg-soft-orange-25/50 backdrop-blur-sm rounded-2xl p-2 flex shadow-lg border border-soft-orange-100/50 relative">
                        {/* Sliding Background */}
                        <motion.div
                            className="absolute top-2 bottom-2 w-[calc(50%-4px)] bg-gradient-to-r from-soft-orange-500 to-soft-orange-600 rounded-xl shadow-md"
                            animate={{
                                x: activeTab === 'before' ? 0 : '100%'
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30
                            }}
                        />

                        <button
                            onClick={() => setActiveTab('before')}
                            className={`relative px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 z-10 ${activeTab === 'before' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Before Your Trip
                        </button>
                        <button
                            onClick={() => setActiveTab('after')}
                            className={`relative px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 z-10 ${activeTab === 'after' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            After Your Trip
                        </button>
                    </div>
                </div>

                {/* Active Tab Description */}
                <div className="text-center mb-12">
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                        {activeTab === 'before' ? 'Plan and Budget Your Trip' : 'Settle Up Expenses'}
                    </h3>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        {activeTab === 'before'
                            ? 'Plan and budget your trip expenses with AI-powered video analysis'
                            : 'Settle up expenses with receipt scanning and automatic splitting'
                        }
                    </p>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {currentSteps.map((step, index) => {
                        const IconComponent = step.icon;
                        return (
                            <div key={index} className="relative">
                                {/* Step Number */}
                                <div className={`absolute -top-4 -left-4 w-8 h-8 ${stepNumberColor} text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10`}>
                                    {index + 1}
                                </div>

                                {/* Step Card */}
                                <div className={`${cardBgColor} rounded-2xl p-8 h-full ${cardBorderColor} hover:shadow-xl transition-all duration-300 border shadow-lg`}>
                                    {/* Icon */}
                                    <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                        {step.title}
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Request Demo Button */}
                <div className="text-center mt-16">
                    <button className="bg-gradient-to-r from-soft-orange-500 to-soft-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-soft-orange-600 hover:to-soft-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                        Request Demo
                    </button>
                </div>
            </div>
        </section>
    );
} 