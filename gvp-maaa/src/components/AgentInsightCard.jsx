import React from 'react';
import useAgentStream from '../hooks/useAgentStream';
import useAgentData from '../hooks/useAgentData';

export default function AgentInsightCard({ studentId }) {
    const { narrative, streaming, startStream, error: streamError } = useAgentStream(studentId, false);
    const { riskData, taskData, loading: dataLoading, error: dataError } = useAgentData(studentId);
    
    // Fallback info if the stream never started or failed
    const hasData = !dataLoading && !dataError;
    const fallbackText = hasData 
        ? `Student risk level is ${riskData.risk_level}. Priority task: ${taskData?.today_tasks?.[0]?.text || 'Check portal for updates'}. Click Generate AI insight for in-depth analysis.` 
        : 'Loading background metrics...';

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 w-full transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        Advisor AI Insight
                    </h3>
                </div>
                {!streaming && !narrative && (
                    <button 
                        onClick={startStream}
                        disabled={!hasData}
                        className={`text-sm px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${hasData ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                    >
                        Generate Insight
                    </button>
                )}
                {streaming && (
                    <div className="flex justify-center items-center gap-1 opacity-70">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                )}
            </div>

            <div className="min-h-[60px] text-gray-700 dark:text-gray-300">
                {streamError ? (
                    <p className="text-red-500 italic text-sm">{streamError} Using fallback data.</p>
                ) : null}

                {narrative ? (
                    <p className="text-base leading-relaxed animate-fade-in font-medium">
                        {narrative}
                    </p>
                ) : (
                    <p className="text-sm italic text-gray-500 dark:text-gray-400 opacity-80">
                        {fallbackText}
                    </p>
                )}
            </div>
        </div>
    );
}
