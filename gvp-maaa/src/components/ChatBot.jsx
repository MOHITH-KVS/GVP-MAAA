import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export default function ChatBot({ role }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggested, setSuggested] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch suggested questions on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSuggestions = async () => {
      try {
        const response = await api.get(`/chat/suggested/${role}`);
        if (isMounted) {
          setSuggested(response.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch chat suggestions", err);
      }
    };
    fetchSuggestions();
    return () => {
      isMounted = false;
    };
  }, [role]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (overrideText) => {
    const textToSend = overrideText || inputText.trim();
    if (!textToSend) return;

    if (!overrideText) {
      setInputText("");
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...messages, { from: "user", text: textToSend, timestamp }];
    
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await api.post("/chat/message", {
        message: textToSend,
        history: messages
      });
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages([...newMessages, { from: "ai", text: response.data.reply, timestamp: aiTimestamp }]);
    } catch (error) {
      console.error("Chat error:", error);
      const errTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages([...newMessages, { 
        from: "ai", 
        text: `Error: ${error?.response?.data?.reply || error.message || "Unable to connect"}`,
        isError: true,
        timestamp: errTimestamp
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col items-center bg-[#f9fafb]">
      
      {/* Centered Chat Container */}
      <div className="w-full max-w-4xl h-full flex flex-col bg-white shadow-sm border-x border-gray-100 relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <AutoAwesomeIcon fontSize="small" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 tracking-tight">AI Assistant</h2>
              <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">
                {role === 'faculty' ? 'teacher' : role} Mode
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-8 fade-in">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm rotate-3 border border-indigo-100">
                <AutoAwesomeIcon fontSize="large" className="animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                  Hi, I'm your AI Assistant 👋
                </h3>
                <p className="text-gray-500 text-[15px]">
                  Ask me anything about your academics, attendance, or performance. I'm here to help.
                </p>
              </div>

              {suggested.length > 0 && (
                <div className="w-full pt-4">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-4">Suggested Queries</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                    {suggested.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s)}
                        className="text-sm bg-white text-gray-700 border border-gray-200 px-4 py-3 rounded-xl hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all w-full leading-snug group"
                      >
                        <span className="flex items-center justify-between">
                          <span>{s}</span>
                          <SendRoundedIcon className="text-gray-300 group-hover:text-indigo-400 transition" style={{ fontSize: 16 }} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex w-full fade-in ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                
                {/* AI Avatar */}
                {m.from !== "user" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-500 mr-3 mt-1 shadow-sm">
                    <AutoAwesomeIcon style={{ fontSize: 14 }} />
                  </div>
                )}
                
                <div className="flex flex-col group max-w-[85%]">
                  <div
                    className={`p-4 text-[15px] leading-relaxed shadow-sm relative ${
                      m.from === "user"
                        ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm self-end"
                        : m.isError 
                          ? "bg-red-50 text-red-700 border border-red-100 rounded-2xl rounded-tl-sm"
                          : "bg-gray-100 text-gray-800 border border-gray-200 rounded-2xl rounded-tl-sm"
                    }`}
                  >
                    {m.text}
                    
                    {/* Copy Button (only for AI responses) */}
                    {m.from === "ai" && !m.isError && (
                      <button 
                        onClick={() => copyToClipboard(m.text, idx)}
                        className={`absolute -right-8 bottom-0 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-indigo-600 transition-all rounded-md ${copiedIndex === idx ? 'text-green-500' : ''}`}
                        title="Copy message"
                      >
                         <ContentCopyIcon style={{ fontSize: 16 }} />
                      </button>
                    )}
                  </div>
                  {m.timestamp && (
                    <span className={`text-[11px] text-gray-400 mt-1.5 px-1 font-medium ${m.from === "user" ? "text-right" : "text-left"}`}>
                      {m.timestamp}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start w-full fade-in">
                 <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-500 mr-3 mt-1 shadow-sm">
                    <AutoAwesomeIcon style={{ fontSize: 14 }} />
                  </div>
                <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-tl-sm py-4 px-5 shadow-sm flex items-center gap-2 max-w-[85%]">
                  {/* CSS typing bounce animation */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.32s]"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.16s]"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 z-10 w-full mb-2">
          <div className="flex items-end gap-3 relative max-w-4xl mx-auto rounded-3xl border border-gray-300 bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your academics..."
              disabled={loading}
              className="flex-1 bg-transparent text-[15px] resize-none max-h-32 focus:outline-none disabled:opacity-50 min-h-[24px] pb-1 py-0.5 leading-snug"
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
              className="w-9 h-9 flex-shrink-0 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 shadow-sm disabled:shadow-none"
            >
              <SendRoundedIcon style={{ fontSize: 18 }} className={inputText.trim() ? "translate-x-0.5" : ""} />
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-3 hidden md:block">
            AI Assistant can make mistakes. Verify important academic information.
          </p>
        </div>

      </div>
      
      {/* Required CSS injected gracefully */}
      <style dangerouslySetInnerHTML={{__html: `
        .fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
