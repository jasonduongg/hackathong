'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

interface ProgressStep {
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    percentage: number;
    details?: string;
    startTime?: number;
    endTime?: number;
    duration?: number;
}

interface EnhancedProgressBarProps {
    steps: ProgressStep[];
    currentStepId?: string;
    overallPercentage: number;
    isComplete: boolean;
    error?: string | null;
}

export const EnhancedProgressBar: React.FC<EnhancedProgressBarProps> = ({
    steps,
    currentStepId,
    overallPercentage,
    isComplete,
    error
}) => {
    const getStepIcon = (step: ProgressStep) => {
        switch (step.status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'running':
                return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStepColor = (step: ProgressStep) => {
        switch (step.status) {
            case 'completed':
                return 'text-green-700 bg-green-50 border-green-200';
            case 'error':
                return 'text-red-700 bg-red-50 border-red-200';
            case 'running':
                return 'text-blue-700 bg-blue-50 border-blue-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const formatDuration = (duration?: number) => {
        if (!duration) return '';
        if (duration < 1000) return `${duration}ms`;
        return `${(duration / 1000).toFixed(1)}s`;
    };

    return (
        <div className="mt-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">Processing Progress</h3>
                    {isComplete && !error && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {error && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                        {Math.round(overallPercentage)}%
                    </div>
                    <div className="text-sm text-gray-500">
                        {isComplete ? 'Complete' : 'In Progress'}
                    </div>
                </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                            error ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${overallPercentage}%` }}
                    />
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-700 font-medium">Error:</span>
                    </div>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Detailed Steps */}
            <div className="space-y-3">
                {steps.map((step, index) => (
                    <div 
                        key={step.id}
                        className={`p-4 border rounded-md transition-all duration-300 ${getStepColor(step)}`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {getStepIcon(step)}
                                <div>
                                    <div className="font-medium text-sm">
                                        {step.title}
                                    </div>
                                    {step.details && (
                                        <div className="text-xs opacity-75 mt-1">
                                            {step.details}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium">
                                    {step.percentage}%
                                </div>
                                {step.duration && (
                                    <div className="text-xs opacity-75">
                                        {formatDuration(step.duration)}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Step Progress Bar */}
                        <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        step.status === 'error' ? 'bg-red-400' :
                                        step.status === 'completed' ? 'bg-green-400' :
                                        step.status === 'running' ? 'bg-blue-400' : 'bg-gray-400'
                                    }`}
                                    style={{ width: `${step.percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Command Line Style Log */}
            <div className="mt-4 p-3 bg-gray-900 text-green-400 rounded-md font-mono text-xs">
                <div className="mb-2 text-gray-400">$ Processing Log:</div>
                {steps.map((step, index) => (
                    <div key={step.id} className="mb-1">
                        <span className="text-gray-500">[{index + 1}]</span>
                        <span className="ml-2">
                            {step.status === 'completed' && '✓'}
                            {step.status === 'error' && '✗'}
                            {step.status === 'running' && '⟳'}
                            {step.status === 'pending' && '○'}
                        </span>
                        <span className="ml-2">{step.title}</span>
                        {step.duration && (
                            <span className="text-gray-500 ml-2">
                                ({formatDuration(step.duration)})
                            </span>
                        )}
                        {step.details && (
                            <div className="ml-6 text-gray-500">
                                → {step.details}
                            </div>
                        )}
                    </div>
                ))}
                {isComplete && (
                    <div className="text-green-400 mt-2">
                        ✓ All tasks completed successfully!
                    </div>
                )}
                {error && (
                    <div className="text-red-400 mt-2">
                        ✗ Process failed: {error}
                    </div>
                )}
            </div>
        </div>
    );
}; 