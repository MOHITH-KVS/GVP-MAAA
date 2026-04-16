import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function AgentStatusBadge() {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        let isMounted = true;
        api.get('/agents/status')
            .then(res => {
                if (isMounted && res.data) {
                    setStatus(res.data.graph === 'ok' ? 'ok' : 'error');
                }
            })
            .catch(() => {
                if (isMounted) setStatus('error');
            });
        
        return () => { isMounted = false; };
    }, []);

    if (!status) return null; // Render nothing if pending

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm w-max" title={status === 'ok' ? "Multi-Agent System Online" : "Multi-Agent System Offline"}>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">AI Agents</span>
            <div className={`w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.2)] ${status === 'ok' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
        </div>
    );
}
