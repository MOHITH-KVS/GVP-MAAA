import React from 'react';
import AgentInsightCard from '../../components/AgentInsightCard';
import AgentStatusBadge from '../../components/AgentStatusBadge';

export default function StudentAgentView() {
    // In a real application, you'd get this from a Context or Redux store
    // For standalone, we extract from localstorage or use a fallback
    let studentId = 1; 
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user && user.id) studentId = user.id;
        }
    } catch (e) {
        console.warn("Failed to parse user from local storage");
    }

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in text-gray-800 dark:text-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">AI Insights Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Personalized academic recommendations powered by the Multi-Agent System.</p>
                </div>
                <AgentStatusBadge />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hero / Insights Card */}
                <div className="w-full">
                    <AgentInsightCard studentId={studentId} />
                </div>
                
                {/* Placeholder for future agent metrics if needed */}
                <div className="bg-white/50 dark:bg-gray-800/30 rounded-2xl p-6 border border-dashed border-gray-300 dark:border-gray-700 flex flex-col justify-center items-center text-center opacity-70">
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400">Detailed Metrics</h4>
                    <p className="text-sm text-gray-500 max-w-sm mt-1">Advanced placement and risk breakdowns will appear here alongside your generated insight.</p>
                </div>
            </div>
        </div>
    );
}
