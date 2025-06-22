'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface InstagramData {
    screenshots: string[];
    captionText: string;
    accountMentions: string[];
    locationTags: string[];
    hashtags: string[];
    allText: string;
    screenshotCount: number;
    videoDuration: number;
}

interface AnalysisProgress {
    step: string;
    percentage: number;
    details?: string;
}

export interface LoadingTask {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'loading' | 'completed' | 'error';
    percentage?: number;
}

interface VideoAnalysisState {
    // Form state
    url: string;

    // Processing state
    loading: boolean;
    progress: AnalysisProgress;
    result: any;
    error: string | null;

    // Instagram specific data
    instagramData: InstagramData | null;

    // Save state
    savingEvent: boolean;
    saveStatus: 'idle' | 'success' | 'error';

    // Loading tasks state
    loadingTasks: LoadingTask[];
}

interface VideoAnalysisContextType {
    state: VideoAnalysisState;
    setUrl: (url: string) => void;
    setLoading: (loading: boolean) => void;
    setProgress: (progress: AnalysisProgress) => void;
    setResult: (result: any) => void;
    setError: (error: string | null) => void;
    setInstagramData: (data: InstagramData | null) => void;
    setSavingEvent: (saving: boolean) => void;
    setSaveStatus: (status: 'idle' | 'success' | 'error') => void;
    setLoadingTasks: (tasks: LoadingTask[]) => void;
    updateLoadingTask: (taskId: string, status: LoadingTask['status'], percentage?: number) => void;
    resetState: () => void;
    clearError: () => void;
}

const initialState: VideoAnalysisState = {
    url: '',
    loading: false,
    progress: { step: '', percentage: 0 },
    result: null,
    error: null,
    instagramData: null,
    savingEvent: false,
    saveStatus: 'idle',
    loadingTasks: []
};

const VideoAnalysisContext = createContext<VideoAnalysisContextType | undefined>(undefined);

export const VideoAnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<VideoAnalysisState>(initialState);

    const setUrl = (url: string) => {
        setState(prev => ({ ...prev, url, error: null }));
    };

    const setLoading = (loading: boolean) => {
        setState(prev => ({ ...prev, loading }));
    };

    const setProgress = (progress: AnalysisProgress) => {
        setState(prev => ({ ...prev, progress }));
    };

    const setResult = (result: any) => {
        setState(prev => ({ ...prev, result }));
    };

    const setError = (error: string | null) => {
        setState(prev => ({ ...prev, error }));
    };

    const setInstagramData = (instagramData: InstagramData | null) => {
        setState(prev => ({ ...prev, instagramData }));
    };

    const setSavingEvent = (savingEvent: boolean) => {
        setState(prev => ({ ...prev, savingEvent }));
    };

    const setSaveStatus = (saveStatus: 'idle' | 'success' | 'error') => {
        setState(prev => ({ ...prev, saveStatus }));
    };

    const setLoadingTasks = (loadingTasks: LoadingTask[]) => {
        setState(prev => ({ ...prev, loadingTasks }));
    };

    const updateLoadingTask = (taskId: string, status: LoadingTask['status'], percentage?: number) => {
        setState(prev => ({
            ...prev,
            loadingTasks: prev.loadingTasks.map(task =>
                task.id === taskId
                    ? { ...task, status, percentage }
                    : task
            )
        }));
    };

    const resetState = () => {
        setState(initialState);
    };

    const clearError = () => {
        setState(prev => ({ ...prev, error: null }));
    };

    const value: VideoAnalysisContextType = {
        state,
        setUrl,
        setLoading,
        setProgress,
        setResult,
        setError,
        setInstagramData,
        setSavingEvent,
        setSaveStatus,
        setLoadingTasks,
        updateLoadingTask,
        resetState,
        clearError
    };

    return (
        <VideoAnalysisContext.Provider value={value}>
            {children}
        </VideoAnalysisContext.Provider>
    );
};

export const useVideoAnalysis = () => {
    const context = useContext(VideoAnalysisContext);
    if (context === undefined) {
        throw new Error('useVideoAnalysis must be used within a VideoAnalysisProvider');
    }
    return context;
}; 