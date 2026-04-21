import React, { useState, useEffect, useRef } from "react";
import api, { baseURL, getToken } from "../utils/api";
import { trackAnalyticsAction } from "../hooks/useAnalytics";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import AddAlertRoundedIcon from "@mui/icons-material/AddAlertRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const RETRY_RECOMMENDED_WAIT_MS = 90 * 1000;

const makeThreadId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getThreadStorageKey = (role) => `gvp-maaa-chat-thread:${String(role || "student").toLowerCase()}`;

export default function ChatBot({ role }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [analyzingPdfQuestion, setAnalyzingPdfQuestion] = useState(false);
  const [hasUploadedPdf, setHasUploadedPdf] = useState(false);
  const [uploadJustFinished, setUploadJustFinished] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [suggested, setSuggested] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showRetryDecision, setShowRetryDecision] = useState(false);
  const [pendingRetryMessage, setPendingRetryMessage] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [showRetryReadyToast, setShowRetryReadyToast] = useState(false);
  const [alertNotifications, setAlertNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSetAlert, setShowSetAlert] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState("add");
  const [alertRules, setAlertRules] = useState([]);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    type: "attendance",
    condition: "lt",
    threshold: 75,
    message: "",
  });
  const [threadId, setThreadId] = useState(() => {
    try {
      const storedThreadId = localStorage.getItem(getThreadStorageKey(role));
      return storedThreadId || makeThreadId();
    } catch (error) {
      return makeThreadId();
    }
  });
  const messagesEndRef = useRef(null);
  const activeReplyIdRef = useRef(null);
  const pdfInputRef = useRef(null);
  const uploadReadyTimerRef = useRef(null);
  const chatLocked = loading || streaming || pdfUploading;
  const unreadAlertCount = alertNotifications.filter((n) => !n.is_read).length;

  const metricOptionsByRole = {
    student: [
      { value: "attendance", label: "Attendance %" },
      { value: "cgpa", label: "CGPA" },
      { value: "avg_marks", label: "Average Marks" },
      { value: "pending_assignments", label: "Pending Assignments" },
    ],
    faculty: [
      { value: "class_attendance", label: "Class Attendance %" },
      { value: "pending_submissions", label: "Pending Submissions" },
    ],
    admin: [
      { value: "institution_attendance", label: "Institution Attendance %" },
      { value: "at_risk_students", label: "At-Risk Students Count" },
    ],
  };

  const roleMetrics = metricOptionsByRole[role] || metricOptionsByRole.student;

  useEffect(() => {
    const storageKey = getThreadStorageKey(role);
    try {
      const storedThreadId = localStorage.getItem(storageKey);
      if (storedThreadId) {
        setThreadId(storedThreadId);
        return;
      }

      const nextThreadId = makeThreadId();
      localStorage.setItem(storageKey, nextThreadId);
      setThreadId(nextThreadId);
    } catch (error) {
      setThreadId(makeThreadId());
    }
  }, [role]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (uploadReadyTimerRef.current) {
        clearTimeout(uploadReadyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showRetryDecision || !pendingRetryMessage?.retryRecommendedUntil) return;

    const remaining = pendingRetryMessage.retryRecommendedUntil - nowTs;
    if (remaining > 0) return;

    setShowRetryDecision(false);
    setPendingRetryMessage(null);
    setShowRetryReadyToast(true);

    const hideTimer = setTimeout(() => setShowRetryReadyToast(false), 2500);
    return () => clearTimeout(hideTimer);
  }, [nowTs, showRetryDecision, pendingRetryMessage]);

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

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const res = await api.get("/chat/alert-notifications");
        if (!isMounted) return;
        setAlertNotifications(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch chat alert notifications", err);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 15000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (overrideText, options = {}) => {
    if (chatLocked) return;
    const forceLiveAI = Boolean(options.forceLiveAI);
    const isRetry = Boolean(options.isRetry);
    const textToSend = overrideText || inputText.trim();
    if (!textToSend) return;

    const normalizedRole = role === "faculty" ? "teacher" : role;
    const analyticsPage = `/${normalizedRole}/ai-assistant`;
    const actionType = isRetry ? "retry" : (overrideText ? "click" : "submit");
    trackAnalyticsAction({ page: analyticsPage, role: normalizedRole, action: actionType });

    if (!overrideText) {
      setInputText("");
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const replyId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    activeReplyIdRef.current = replyId;
    const pdfKeywords = [
      "pdf", "document", "file", "uploaded",
      "explain", "summarize", "what does it say",
      "according to", "in the document", "the report",
      "project", "technologies", "technology", "tech stack",
      "team members", "members"
    ];
    const lowerText = String(textToSend || "").toLowerCase();
    const isPdfQuestion = hasUploadedPdf && pdfKeywords.some((kw) => lowerText.includes(kw));
    setAnalyzingPdfQuestion(isPdfQuestion);
    const newMessages = [
      ...messages,
      { from: "user", text: textToSend, timestamp, id: `${replyId}-user` },
      {
        from: "ai",
        text: isPdfQuestion ? "Analyzing PDF..." : "Fetching latest data...",
        timestamp,
        id: replyId,
        status: isPdfQuestion ? "analyzing" : "fetching",
        userPrompt: textToSend,
      }
    ];
    
    setMessages(newMessages);
    setLoading(true);
    setStreaming(false);

    try {
      const response = await fetch(`${baseURL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          message: textToSend,
          thread_id: threadId,
          force_live_ai: forceLiveAI,
          history: messages.slice(-6).map(m => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const responseMode = (response.headers.get('x-response-mode') || 'live_ai').toLowerCase();
      const responseSource = response.headers.get('x-response-source') || 'unknown';
      if (!response.ok) {
        const fallbackText = await response.text();
        throw new Error(fallbackText || `Request failed with status ${response.status}`);
      }

      if (contentType.includes('application/json')) {
        const data = await response.json();
        const reply = data.reply || data.message ||
                      "I received your message but could not generate a response.";
        const detectedMode = (
          data.mode ||
          responseMode ||
          inferModeFromText(reply) ||
          'live_ai'
        ).toLowerCase();
        setMessages(prev => prev.map(m => (
          m.id === replyId
            ? {
                ...m,
                text: reply,
                status: 'done',
                mode: detectedMode,
                source: data.source || responseSource,
                retryRecommendedUntil: detectedMode === 'verified_data' ? Date.now() + RETRY_RECOMMENDED_WAIT_MS : null,
                userPrompt: m.userPrompt,
              }
            : m
        )));
      } else if (response.body && response.body.getReader) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let hasFirstChunk = false;

        if (!isPdfQuestion) {
          setMessages(prev => prev.map(m => (
            m.id === replyId
              ? {
                  ...m,
                  text: 'Typing...',
                  status: 'typing',
                  mode: responseMode,
                  source: responseSource,
                  userPrompt: m.userPrompt,
                }
              : m
          )));
          setStreaming(true);
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          if (!hasFirstChunk) {
            hasFirstChunk = true;
            setStreaming(false);
          }

          fullText += chunk;
          setMessages(prev => prev.map(m => (
            m.id === replyId
              ? {
                  ...m,
                  text: fullText,
                  status: 'streaming',
                  mode: responseMode,
                  source: responseSource,
                  userPrompt: m.userPrompt,
                }
              : m
          )));
        }

        const finalText = fullText.trim();
        const detectedMode = (
          responseMode ||
          inferModeFromText(finalText) ||
          'live_ai'
        ).toLowerCase();
        setMessages(prev => prev.map(m => (
          m.id === replyId
            ? {
                ...m,
                text: finalText || m.text,
                status: 'done',
                mode: detectedMode,
                source: responseSource,
                retryRecommendedUntil: detectedMode === 'verified_data' ? Date.now() + RETRY_RECOMMENDED_WAIT_MS : null,
                userPrompt: m.userPrompt,
              }
            : m
        )));
      } else {
        const reply = await response.text();
        const detectedMode = (
          responseMode ||
          inferModeFromText(reply) ||
          'live_ai'
        ).toLowerCase();
        setMessages(prev => prev.map(m => (
          m.id === replyId
            ? {
                ...m,
                text: reply || m.text,
                status: 'done',
                mode: detectedMode,
                source: responseSource,
                retryRecommendedUntil: detectedMode === 'verified_data' ? Date.now() + RETRY_RECOMMENDED_WAIT_MS : null,
                userPrompt: m.userPrompt,
              }
            : m
        )));
      }

    } catch (error) {
      console.error('[CHAT ERROR]', error);

      // Show actual error for debugging, not generic message
      const errMsg = error?.response?.data?.detail ||
                     error?.response?.data?.message ||
                     error?.message ||
                     "Connection error. Please try again.";

      setMessages(prev => prev.map(m => (
        m.id === replyId
          ? {
              ...m,
              text: `I had trouble with that request. ${errMsg}`,
              status: 'done',
              isError: false,
              mode: 'verified_data',
              source: 'error',
              retryRecommendedUntil: Date.now() + RETRY_RECOMMENDED_WAIT_MS,
              userPrompt: m.userPrompt,
            }
          : m
      )));
    } finally {
      setLoading(false);
      setStreaming(false);
      setAnalyzingPdfQuestion(false);
      activeReplyIdRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (pdfUploading) return;
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

  const inferModeFromText = (text) => {
    const lower = String(text || "").toLowerCase();
    if (
      lower.includes("verified dashboard data") ||
      lower.includes("ai-generated wording is temporarily unavailable")
    ) {
      return "verified_data";
    }
    return "live_ai";
  };

  const getModeBadge = (mode) => {
    const normalized = String(mode || "").toLowerCase();
    if (normalized === "verified_data") {
      return {
        label: "Verified Data",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200"
      };
    }
    return {
      label: "Live AI",
      className: "bg-indigo-50 text-indigo-700 border border-indigo-200"
    };
  };

  const formatRetryCountdown = (remainingMs) => {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const handleRetryAI = (message) => {
    if (chatLocked) return;
    const prompt = message?.userPrompt || "";
    if (!prompt) return;

    const remainingMs = Math.max(0, (message?.retryRecommendedUntil || 0) - nowTs);
    if (remainingMs <= 0) {
      handleSend(prompt, { forceLiveAI: true, isRetry: true });
      return;
    }

    setPendingRetryMessage({
      ...message,
      retryRecommendedUntil: message?.retryRecommendedUntil || null,
    });
    setShowRetryDecision(true);
  };

  const closeRetryDecision = () => {
    setShowRetryDecision(false);
    setPendingRetryMessage(null);
  };

  const proceedRetryNow = () => {
    const prompt = pendingRetryMessage?.userPrompt || "";
    if (!prompt) {
      closeRetryDecision();
      return;
    }
    closeRetryDecision();
    handleSend(prompt, { forceLiveAI: true, isRetry: true });
  };

  const handlePdfButtonClick = () => {
    if (chatLocked) return;
    pdfInputRef.current?.click();
  };

  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "Please select a valid PDF file.",
          timestamp,
          id: `pdf-invalid-${Date.now()}`,
          status: "done",
          mode: "verified_data",
          source: "pdf_upload",
        },
      ]);
      return;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msgId = `pdf-${Date.now()}`;
    setUploadJustFinished(false);
    setPdfUploading(true);
    setMessages((prev) => [
      ...prev,
      {
        from: "user",
        text: `Uploaded PDF: ${file.name}`,
        timestamp,
        id: `${msgId}-user`,
      },
      {
        from: "ai",
        text: "Uploading PDF...",
        timestamp,
        id: msgId,
        status: "uploading",
        mode: "verified_data",
        source: "pdf_upload",
      },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/chat/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setHasUploadedPdf(Boolean(response?.data?.has_pdf));
      const uploadMessage =
        response?.data?.summary ||
        response?.data?.message ||
        "PDF uploaded successfully. Ask your question and I will answer using this document.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                text: uploadMessage,
                status: "done",
                mode: "verified_data",
                source: "pdf_upload",
              }
            : m
        )
      );
      setUploadJustFinished(true);
      if (uploadReadyTimerRef.current) {
        clearTimeout(uploadReadyTimerRef.current);
      }
      uploadReadyTimerRef.current = setTimeout(() => {
        setUploadJustFinished(false);
      }, 1600);
    } catch (error) {
      setHasUploadedPdf(false);
      const errMsg =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "PDF upload failed.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                text: `I could not process that PDF. ${errMsg}`,
                status: "done",
                mode: "verified_data",
                source: "pdf_upload",
              }
            : m
        )
      );
      setUploadJustFinished(false);
    } finally {
      setPdfUploading(false);
    }
  };

  const openNotificationsPanel = async () => {
    setShowNotifications((prev) => !prev);
    try {
      await api.post("/chat/alert-notifications/mark-all-read");
      setAlertNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  const saveAlertRule = async () => {
    try {
      setSavingRule(true);
      if (editingRuleId) {
        await api.patch(`/chat/alert-rules/${editingRuleId}`, {
          type: ruleForm.type,
          condition: ruleForm.condition,
          threshold: Number(ruleForm.threshold || 0),
          message: String(ruleForm.message || "").trim(),
        });
      } else {
        await api.post("/chat/alert-rules", {
          type: ruleForm.type,
          condition: ruleForm.condition,
          threshold: Number(ruleForm.threshold || 0),
          message: String(ruleForm.message || "").trim(),
        });
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: editingRuleId
            ? "Alert rule updated successfully."
            : "Alert rule saved. I will notify you when this condition is triggered.",
          timestamp,
          id: `rule-saved-${Date.now()}`,
          status: "done",
          mode: "verified_data",
          source: "rule_setup",
        },
      ]);
      setEditingRuleId(null);
      setRuleForm((prev) => ({ ...prev, message: "" }));
      await loadAlertRules();
      setHistoryTab("history");
    } catch (err) {
      console.error("Failed to save alert rule", err);
    } finally {
      setSavingRule(false);
    }
  };

  const loadAlertRules = async () => {
    try {
      setRulesLoading(true);
      const res = await api.get("/chat/alert-rules");
      setAlertRules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch alert rules", err);
    } finally {
      setRulesLoading(false);
    }
  };

  const openSetAlertModal = async () => {
    setShowSetAlert(true);
    setHistoryTab("add");
    setEditingRuleId(null);
    await loadAlertRules();
  };

  const handleEditRule = (rule) => {
    setEditingRuleId(rule.id);
    setHistoryTab("add");
    setRuleForm({
      type: rule.type || roleMetrics[0]?.value || "attendance",
      condition: rule.condition || "lt",
      threshold: rule.threshold ?? 0,
      message: rule.message || "",
    });
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await api.delete(`/chat/alert-rules/${ruleId}`);
      setAlertRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error("Failed to delete alert rule", err);
    }
  };

  const handleToggleRuleActive = async (rule) => {
    try {
      const nextActive = !Boolean(rule.active);
      await api.patch(`/chat/alert-rules/${rule.id}`, { active: nextActive });
      setAlertRules((prev) =>
        prev.map((item) =>
          item.id === rule.id ? { ...item, active: nextActive } : item
        )
      );
    } catch (err) {
      console.error("Failed to toggle alert rule status", err);
    }
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
              <p className="text-[11px] text-gray-400 mt-0.5">
                The transcript below is the chat history. A new thread is created automatically when needed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openSetAlertModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
            >
              <AddAlertRoundedIcon style={{ fontSize: 16 }} />
              Set Alert
            </button>
            <button
              onClick={openNotificationsPanel}
              className="relative w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
              title="Notifications"
            >
              <NotificationsRoundedIcon style={{ fontSize: 20 }} />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadAlertCount > 99 ? "99+" : unreadAlertCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {showNotifications && (
          <div className="absolute right-6 top-20 z-20 w-[350px] max-w-[95vw] rounded-xl border border-gray-200 bg-white shadow-xl p-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Alert Notifications</p>
              <button onClick={() => setShowNotifications(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <CloseRoundedIcon style={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2 space-y-2">
              {alertNotifications.length === 0 && (
                <p className="text-xs text-gray-500 px-1 py-2">No alert notifications yet.</p>
              )}
              {alertNotifications.map((note) => (
                <div key={note.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs font-semibold text-gray-700">{note.title || "Proactive Alert"}</p>
                  <p className="text-xs text-gray-600 mt-1">{note.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{note.created_at ? new Date(note.created_at).toLocaleString() : ""}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
                        disabled={chatLocked}
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
              <div key={m.id || idx} className={`flex w-full fade-in ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                
                {/* AI Avatar */}
                {m.from !== "user" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-500 mr-3 mt-1 shadow-sm">
                    <AutoAwesomeIcon style={{ fontSize: 14 }} />
                  </div>
                )}
                
                <div className="flex flex-col group max-w-[85%]">
                  {m.from === "ai" && m.status !== "typing" && m.status !== "uploading" && m.status !== "analyzing" && (
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getModeBadge(m.mode).className}`}
                      >
                        {getModeBadge(m.mode).label}
                      </span>
                    </div>
                  )}
                  <div
                    className={`p-4 text-[15px] leading-relaxed shadow-sm relative ${
                      m.from === "user"
                        ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm self-end"
                        : m.isError 
                          ? "bg-red-50 text-red-700 border border-red-100 rounded-2xl rounded-tl-sm"
                          : "bg-gray-100 text-gray-800 border border-gray-200 rounded-2xl rounded-tl-sm"
                    }`}
                  >
                    {m.status === 'typing' || m.status === 'uploading' ? (
                      m.status === 'uploading' ? (
                        <div className="min-w-[180px]">
                          <span className="text-sm text-gray-500">Uploading PDF...</span>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-indigo-100 overflow-hidden">
                            <div className="upload-progress-fill h-full rounded-full bg-indigo-500"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <span className="text-sm text-gray-500">Typing...</span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.32s]"></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.16s]"></span>
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]"></span>
                          </span>
                        </div>
                      )
                    ) : (
                      m.text
                    )}
                    
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
                  {m.from === "ai" && String(m.mode || "").toLowerCase() === "verified_data" && !!m.userPrompt && (
                    <div className="mt-2 flex items-center justify-end gap-2">
                      {Math.max(0, (m.retryRecommendedUntil || 0) - nowTs) > 0 ? (
                        <span className="text-[11px] text-amber-600">
                          Recommended wait: {formatRetryCountdown(Math.max(0, (m.retryRecommendedUntil || 0) - nowTs))}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500">Want AI wording?</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRetryAI(m)}
                        disabled={loading}
                        className="text-[11px] font-semibold px-3 py-1 rounded-md border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 transition disabled:opacity-50"
                      >
                        {Math.max(0, (m.retryRecommendedUntil || 0) - nowTs) > 0
                          ? `Retry in ${formatRetryCountdown(Math.max(0, (m.retryRecommendedUntil || 0) - nowTs))}`
                          : "Retry AI"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && !streaming && !analyzingPdfQuestion && (
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
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handlePdfSelect}
            />
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pdfUploading ? "Uploading PDF... please wait" : "Ask anything about your academics..."}
              disabled={chatLocked}
              className="flex-1 bg-transparent text-[15px] resize-none max-h-32 focus:outline-none disabled:opacity-50 min-h-[24px] pb-1 py-0.5 leading-snug"
              rows={1}
            />
            <button
              onClick={handlePdfButtonClick}
              disabled={chatLocked}
              title="Upload PDF"
              className="w-9 h-9 flex-shrink-0 bg-white text-indigo-600 border border-indigo-200 rounded-full flex items-center justify-center hover:bg-indigo-50 transition disabled:opacity-50"
            >
              <AttachFileRoundedIcon style={{ fontSize: 18 }} />
            </button>
            <button
              onClick={() => handleSend()}
              disabled={chatLocked || !inputText.trim()}
              className="w-9 h-9 flex-shrink-0 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 shadow-sm disabled:shadow-none"
            >
              <SendRoundedIcon style={{ fontSize: 18 }} className={inputText.trim() ? "translate-x-0.5" : ""} />
            </button>
          </div>
          {pdfUploading && (
            <p className="text-center text-[11px] text-indigo-500 mt-2">
              Uploading your PDF. You can ask questions once upload completes.
            </p>
          )}
          {!pdfUploading && uploadJustFinished && (
            <p className="text-center text-[11px] text-emerald-600 mt-2">
              PDF uploaded. Ask your question to start analysis.
            </p>
          )}
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
        .upload-progress-fill {
          width: 45%;
          animation: uploadSweep 1.1s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes uploadSweep {
          0% { transform: translateX(-120%); }
          50% { transform: translateX(40%); }
          100% { transform: translateX(220%); }
        }
      `}} />

      {showRetryDecision && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900">Retry AI Now?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {Math.max(0, ((pendingRetryMessage?.retryRecommendedUntil || 0) - nowTs)) > 0
                ? `Recommended wait: ${formatRetryCountdown(Math.max(0, ((pendingRetryMessage?.retryRecommendedUntil || 0) - nowTs)))} for better AI wording. If you proceed immediately, there is a high chance you may get the same answer.`
                : "If you proceed immediately, there is a high chance you may get the same answer. Waiting for 1 to 2 minutes usually gives better AI wording."}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRetryDecision}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Wait 1 to 2 min
              </button>
              <button
                type="button"
                onClick={proceedRetryNow}
                className="px-3 py-1.5 text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Proceed now
              </button>
            </div>
          </div>
        </div>
      )}

      {showRetryReadyToast && (
        <div className="fixed bottom-6 right-6 z-[1001] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-lg">
          Thanks for waiting. Retry AI is ready.
        </div>
      )}

      {showSetAlert && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Set Proactive Alert</h3>
              <button onClick={() => setShowSetAlert(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <CloseRoundedIcon style={{ fontSize: 18 }} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setHistoryTab("add")}
                className={`text-xs font-semibold rounded-md py-2 ${historyTab === "add" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600"}`}
              >
                Add Alert
              </button>
              <button
                onClick={async () => {
                  setHistoryTab("history");
                  await loadAlertRules();
                }}
                className={`text-xs font-semibold rounded-md py-2 ${historyTab === "history" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600"}`}
              >
                History
              </button>
            </div>

            {historyTab === "add" && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Metric</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={ruleForm.type}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  {roleMetrics.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Condition</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={ruleForm.condition}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, condition: e.target.value }))}
                  >
                    <option value="lt">Below</option>
                    <option value="gt">Above</option>
                    <option value="eq">Equal To</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Threshold</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    value={ruleForm.threshold}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, threshold: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Custom Message (optional)</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Example: Notify me if class attendance falls below 70%"
                  value={ruleForm.message}
                  onChange={(e) => setRuleForm((prev) => ({ ...prev, message: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSetAlert(false);
                    setEditingRuleId(null);
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAlertRule}
                  disabled={savingRule}
                  className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingRule ? "Saving..." : editingRuleId ? "Update Alert" : "Save Alert"}
                </button>
              </div>
            </div>
            )}

            {historyTab === "history" && (
              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
                {rulesLoading && <p className="text-xs text-gray-500">Loading alert history...</p>}
                {!rulesLoading && alertRules.length === 0 && (
                  <p className="text-xs text-gray-500">No alert rules set yet.</p>
                )}
                {alertRules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-700">
                        {(rule.type || "metric").replace(/_/g, " ")} {rule.condition === "gt" ? "above" : rule.condition === "eq" ? "equal to" : "below"} {rule.threshold}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rule.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600 border-gray-300"}`}>
                        {rule.active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{rule.message || "No custom message"}</p>
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleRuleActive(rule)}
                        className={`px-2 py-1 text-[11px] rounded border bg-white ${rule.active ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                      >
                        {rule.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => handleEditRule(rule)}
                        className="px-2 py-1 text-[11px] rounded border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="px-2 py-1 text-[11px] rounded border border-red-200 text-red-700 bg-white hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
