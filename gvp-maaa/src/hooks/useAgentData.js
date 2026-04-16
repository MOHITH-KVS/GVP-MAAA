import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function useAgentData(studentId) {
    const [riskData, setRiskData] = useState({ risk_score: 0.0, risk_level: 'Low', risk_flags: [], recommendations: [] });
    const [taskData, setTaskData] = useState({ today_tasks: [], week_tasks: [], xp: 0, streak: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!studentId) return;

        let isMounted = true;
        setLoading(true);

        Promise.all([
            api.get(`/agents/risk/${studentId}`).catch(() => ({ data: { risk_score: 0.0, risk_level: 'Low', risk_flags: [], recommendations: [] } })),
            api.get(`/agents/tasks/${studentId}`).catch(() => ({ data: { today_tasks: [], week_tasks: [], xp: 0, streak: 0 } }))
        ])
        .then(([riskRes, taskRes]) => {
            if (isMounted) {
                setRiskData(riskRes.data || { risk_score: 0.0, risk_level: 'Low', risk_flags: [], recommendations: [] });
                setTaskData(taskRes.data || { today_tasks: [], week_tasks: [], xp: 0, streak: 0 });
                setLoading(false);
            }
        })
        .catch((err) => {
            // Promise.all won't reject because of individual catches, but fallbacks cover us
            if (isMounted) {
                setError(err.message || "Failed to fetch agent data");
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [studentId]);

    return { riskData, taskData, loading, error };
}
