'use client';

import React from 'react';

export default function ExamplesSection() {
    return (
        <section className="py-20 bg-gradient-to-b from-soft-orange-25/30 to-transparent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        See It In Action
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Real examples of how our AI-powered features work for trip planning and expense splitting
                    </p>
                </div>

                {/* Before Trip Example Row */}
                <div className="mb-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* Mock Instagram Post */}
                        <div className="bg-soft-orange-25/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-soft-orange-100/50">
                            <div className="space-y-4">
                                <p className="text-gray-800">
                                    📤 Upload your travel inspiration and start planning your next adventure with friends.
                                </p>
                                <p className="text-gray-800">
                                    👥 Create a group and invite your travel buddies to join the planning process.
                                </p>
                                <p className="text-gray-800">
                                    📱 Upload insta reels and let our AI analyze the activities and locations.
                                </p>
                                <p className="text-gray-800">
                                    🔍 Analyze the content to extract pricing, locations, and activity details.
                                </p>
                                <p className="text-gray-800">
                                    ⏰ Find a time that works for everyone and coordinate your perfect trip.
                                </p>
                            </div>
                        </div>

                        {/* Mock App Screen */}
                        <div className="relative">
                            <img
                                className="aspect-15/8 relative w-full object-cover rounded-2xl"
                                src="/assets/before-mock.png"
                                alt="Travel app screen - Instagram activity planning"
                                width="2700"
                                height="1440"
                            />
                        </div>
                    </div>
                </div>

                {/* After Trip Example Row */}
                <div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* Mock App Screen */}
                        <div className="relative">
                            <img
                                className="aspect-15/8 relative w-full object-cover rounded-2xl"
                                src="/assets/after-mock.png"
                                alt="Travel app screen - Receipt scanning and splitting"
                                width="2700"
                                height="1440"
                            />
                        </div>

                        {/* Mock Receipt Video */}
                        <div className="bg-soft-orange-25/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-soft-orange-100/50">
                            <div className="space-y-4">
                                <p className="text-gray-800">
                                    📤 Upload your receipt and let our AI extract all the important details automatically.
                                </p>
                                <p className="text-gray-800">
                                    🔍 Analyze the receipt to identify items, prices, taxes, and totals with precision.
                                </p>
                                <p className="text-gray-800">
                                    ✏️ Edit and adjust any details that need correction or clarification.
                                </p>
                                <p className="text-gray-800">
                                    👥 Assign expenses to specific group members and split costs fairly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
} 