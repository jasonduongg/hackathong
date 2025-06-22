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

                {/* Instagram Activity Example */}
                {activeTab === 'before' && (
                    <div className="mt-16 bg-gradient-to-r from-soft-orange-50/80 to-soft-orange-100/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-soft-orange-100/50 shadow-lg">
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                Example: Find a Post & Add to App
                            </h3>
                            <p className="text-lg text-gray-600">
                                Discover amazing activities on Instagram and add them to your trip with one click
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            {/* Mock Instagram Post */}
                            <div className="bg-soft-orange-25/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-soft-orange-100/50">
                                <div className="flex items-center mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-r from-soft-orange-500 to-soft-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                                        T
                                    </div>
                                    <div className="ml-3">
                                        <p className="font-semibold text-gray-900">Travel Adventures</p>
                                        <p className="text-sm text-gray-500">📍 Bali, Indonesia</p>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-soft-orange-50 to-soft-orange-100 rounded-xl h-48 mb-4 flex items-center justify-center border border-soft-orange-100/50">
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">🏝️</div>
                                        <p className="text-gray-700 font-medium">Bali Sunset Dinner Cruise</p>
                                        <p className="text-sm text-gray-500">$85 per person</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-gray-800">
                                        "Amazing sunset dinner cruise in Bali! 🌅 Perfect for couples or groups.
                                        Includes dinner, drinks, and live music. Book now for $85/person!
                                        #bali #sunset #dinner #cruise #travel"
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-soft-orange-100 text-soft-orange-800 text-xs rounded-full">#bali</span>
                                        <span className="px-2 py-1 bg-soft-orange-100 text-soft-orange-800 text-xs rounded-full">#sunset</span>
                                        <span className="px-2 py-1 bg-soft-orange-100 text-soft-orange-800 text-xs rounded-full">#dinner</span>
                                        <span className="px-2 py-1 bg-soft-orange-100 text-soft-orange-800 text-xs rounded-full">#cruise</span>
                                    </div>
                                </div>
                            </div>

                            {/* AI Analysis Results */}
                            <div className="space-y-6">
                                <div className="bg-soft-orange-25/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-soft-orange-100/50">
                                    <h4 className="font-semibold text-gray-900 mb-3">🤖 AI Extracted Details</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Activity:</span>
                                            <span className="font-medium">Bali Sunset Dinner Cruise</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Location:</span>
                                            <span className="font-medium">Bali, Indonesia</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Price:</span>
                                            <span className="font-medium text-soft-orange-600">$85/person</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Duration:</span>
                                            <span className="font-medium">3-4 hours</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-soft-orange-500 to-soft-orange-600 text-white rounded-xl p-6 shadow-lg">
                                    <h4 className="font-semibold mb-3">✨ Added to Trip</h4>
                                    <p className="text-soft-orange-100">
                                        This activity has been automatically added to your trip budget and shared with your group!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
} 