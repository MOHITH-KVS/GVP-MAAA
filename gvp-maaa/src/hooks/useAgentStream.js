import { useState, useEffect, useRef } from 'react';

export default function useAgentStream(studentId, autoStart = false) {
    const [narrative, setNarrative] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState(null);
    const eventSourceRef = useRef(null);

    const startStream = () => {
        if (!studentId || streaming) return;

        setNarrative("");
        setStreaming(true);
        setError(null);

        const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;
        const rawBaseUrl = configuredBaseUrl || 'http://localhost:8000';
        const baseURL = rawBaseUrl ? (rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl) : '';
        
        const url = `${baseURL}/agents/stream/report/${studentId}`;

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            if (event.data === "[DONE]") {
                es.close();
                setStreaming(false);
            } else {
                setNarrative((prev) => prev ? `${prev} ${event.data}` : event.data);
            }
        };

        es.onerror = (err) => {
            console.error("Agent Stream Error:", err);
            es.close();
            setStreaming(false);
            setError("Stream disconnected or failed.");
        };
    };

    useEffect(() => {
        if (autoStart) {
            startStream();
        }
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [studentId, autoStart]);

    return { narrative, streaming, startStream, error };
}
