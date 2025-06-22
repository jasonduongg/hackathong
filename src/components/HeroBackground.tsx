'use client';

import React from 'react';

export default function HeroBackground() {
    return (
        <div className="relative min-h-screen bg-gradient-to-br from-soft-orange-50 via-soft-orange-25 to-soft-orange-100 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-72 h-72 bg-soft-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 right-1/4 w-72 h-72 bg-soft-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-soft-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* Floating elements */}
            <div className="absolute top-20 right-10 w-20 h-20 bg-gradient-to-r from-soft-orange-400 to-soft-orange-500 rounded-full opacity-20 animate-bounce"></div>
            <div className="absolute bottom-20 left-10 w-16 h-16 bg-gradient-to-r from-soft-orange-400 to-soft-orange-500 rounded-full opacity-20 animate-pulse"></div>
        </div>
    );
} 