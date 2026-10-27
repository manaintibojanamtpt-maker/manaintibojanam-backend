import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Square,
  X,
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Store,
  Send,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import {
  OwnerVoiceClient,
  type OwnerVoiceError,
  type OwnerVoiceClientState,
} from '../infrastructure/ownerVoiceClient';
import { useAuth } from '../../../context/AuthContext';
import { useOwnerTenantId } from '../../../hooks/useOwnerTenantId';
import { EnvironmentConfig } from '../../../config/environment';

interface Message {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly text: string;
  readonly intent?: string;
  readonly proposedActions?: Array<{ type: string; payload: Record<string, any> }>;
  readonly authorized?: boolean;
}

interface OwnerVoiceAssistantModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const QUICK_QUERIES = [
  'ఈరోజు సేల్స్ ఎంత?',
  'కిచెన్ లో పెండింగ్ ఆర్డర్లు ఎన్ని?',
  'Mark Biryani out of stock',
] as const;

export const OwnerVoiceAssistantModal: React.FC<OwnerVoiceAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const tenantId = useOwnerTenantId();
  const navigate = useNavigate();

  const [client, setClient] = useState<OwnerVoiceClient | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      text: 'నమస్కారం! మీ రెస్టారెంట్ సేల్స్, పెండింగ్ ఆర్డర్లు, లేదా స్టాక్ నిర్వహణ కోసం అడగండి. (Hello! Ask about sales, kitchen orders, or stock management.)',
      authorized: true,
    },
  ]);
  const [status, setStatus] = useState<
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'listening'
    | 'processing'
    | 'speaking'
    | 'permission_denied'
    | 'connection_error'
    | 'error'
  >('idle');
  const [activeError, setActiveError] = useState<OwnerVoiceError | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partialTranscript]);

  const initClient = useCallback(() => {
    if (!isOpen || !tenantId) return;

    setActiveError(null);
    setStatus('connecting');

    const voiceClient = new OwnerVoiceClient(
      {
        baseUrl: EnvironmentConfig.getApiUrl(),
        tenantId,
        getToken: async () => (currentUser ? currentUser.getIdToken() : null),
        language: 'te-IN',
      },
      {
        onReady: () => {
          setStatus('connected');
          setActiveError(null);
        },
        onStateChange: (clientState: OwnerVoiceClientState) => {
          if (clientState === 'speaking') {
            setIsPlayingTts(true);
            setStatus('speaking');
          } else if (clientState === 'listening') {
            setIsRecording(true);
            setStatus('listening');
          } else if (clientState === 'processing') {
            setStatus('processing');
          } else if (clientState === 'connected') {
            setIsRecording(false);
            setIsPlayingTts(false);
            setStatus('connected');
          } else if (clientState === 'disconnected') {
            setIsRecording(false);
            setIsPlayingTts(false);
          }
        },
        onPartialTranscript: (data) => {
          setPartialTranscript(data.transcript);
          setStatus('listening');
        },
        onFinalTranscript: (data) => {
          setPartialTranscript('');
          if (data.transcript.trim()) {
            setMessages((prev) => [
              ...prev,
              {
                id: `u_${Date.now()}`,
                role: 'user',
                text: data.transcript,
              },
            ]);
            setStatus('processing');
          }
        },
        onTurnResult: (data) => {
          setStatus('connected');
          setMessages((prev) => [
            ...prev,
            {
              id: `a_${Date.now()}`,
              role: 'assistant',
              text: data.reply,
              intent: data.intent,
              proposedActions: data.proposedActions,
              authorized: data.authorized !== false,
            },
          ]);
        },
        onTtsStart: () => setIsPlayingTts(true),
        onTtsEnd: () => setIsPlayingTts(false),
        onTtsCancelled: () => setIsPlayingTts(false),
        onError: (err: OwnerVoiceError) => {
          setActiveError(err);
          setIsRecording(false);
          setIsPlayingTts(false);

          if (err.code === 'MIC_PERMISSION_DENIED') {
            setStatus('permission_denied');
          } else if (err.code === 'CONNECT_ERROR' || err.code === 'CONNECT_TIMEOUT') {
            setStatus('connection_error');
          } else {
            setStatus('error');
          }
        },
      },
    );

    voiceClient.connect().then((ok) => {
      if (ok) {
        setStatus('connected');
        setActiveError(null);
      }
    });

    setClient(voiceClient);

    return () => {
      voiceClient.disconnect();
      setClient(null);
      setIsRecording(false);
      setIsPlayingTts(false);
      setStatus('idle');
    };
  }, [isOpen, tenantId, currentUser]);

  useEffect(() => {
    const cleanup = initClient();
    return () => {
      cleanup?.();
    };
  }, [initClient]);

  const toggleMic = useCallback(async () => {
    if (!client) return;
    setActiveError(null);

    if (isRecording) {
      client.stopMicrophoneCapture();
      setIsRecording(false);
      setStatus('connected');
    } else {
      const ok = await client.startMicrophoneCapture();
      if (ok) {
        setIsRecording(true);
        setStatus('listening');
      }
    }
  }, [client, isRecording]);

  const stopSpeaking = useCallback(() => {
    if (client) {
      client.stopSpeaking();
      setIsPlayingTts(false);
    }
  }, [client]);

  const handleSendQuery = (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean || !client) return;

    setActiveError(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `u_${Date.now()}`,
        role: 'user',
        text: clean,
      },
    ]);

    const sent = client.sendText(clean);
    if (!sent) {
      setStatus('connection_error');
      setActiveError({
        code: 'CONNECT_ERROR',
        message: 'Cannot send message: voice gateway disconnected',
        userGuidance: 'Please reconnect to send your query.',
        retryable: true,
      });
    } else {
      setStatus('processing');
    }
    setInputText('');
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendQuery(inputText);
  };

  const handleActionClick = (action: { type: string; payload: Record<string, any> }) => {
    if (action.type === 'navigate_pos_orders') {
      onClose();
      navigate('/owner/orders');
    } else if (action.type === 'navigate_analytics') {
      onClose();
      navigate('/owner/dashboard');
    } else if (action.type === 'navigate_pos_eod') {
      onClose();
      navigate('/owner/operations');
    } else if (action.type === 'menu_stock_proposal') {
      if (action.payload.navigationPath) {
        onClose();
        navigate(action.payload.navigationPath);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-assistant-title"
    >
      <div className="relative flex h-[90dvh] max-h-[800px] w-full max-w-xl flex-col rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="owner-assistant-title" className="font-semibold text-slate-100 text-sm sm:text-base truncate">
                  BhojanOS Owner Assistant
                </h3>
                {/* Dynamic Status Pill */}
                {status === 'connected' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live Voice · Ready
                  </span>
                )}
                {status === 'listening' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    Listening…
                  </span>
                )}
                {status === 'processing' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] font-medium text-sky-400 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    Thinking…
                  </span>
                )}
                {status === 'speaking' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Speaking…
                  </span>
                )}
                {status === 'connecting' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Connecting…
                  </span>
                )}
                {status === 'permission_denied' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    Mic Blocked
                  </span>
                )}
                {(status === 'connection_error' || status === 'error') && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    Voice Offline
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400 truncate mt-0.5">
                <Store className="h-3 w-3 shrink-0" />
                Store: <span className="font-mono text-slate-300 truncate">{tenantId || 'Unknown'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white shrink-0 ml-2"
            aria-label="Close assistant"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conversation Body */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-amber-600 text-white shadow'
                    : msg.authorized === false
                      ? 'rounded-tl-sm border border-red-500/30 bg-red-950/40 text-red-200'
                      : 'rounded-tl-sm border border-slate-800 bg-slate-800/80 text-slate-200 shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Proposed Actions */}
                {msg.proposedActions && msg.proposedActions.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-700/60 pt-3">
                    {msg.proposedActions.map((action, idx) => {
                      if (action.type === 'menu_stock_proposal') {
                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200"
                          >
                            <div className="flex items-center gap-2 font-medium">
                              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                              <span>Proposal Only (Requires Screen Confirmation)</span>
                            </div>
                            <p className="mt-1 text-slate-300">
                              Item:{' '}
                              <span className="font-semibold text-white">
                                {action.payload.itemName || 'Item'}
                              </span>{' '}
                              →{' '}
                              <span
                                className={`font-semibold ${
                                  action.payload.isAvailable ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {action.payload.isAvailable ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </p>
                            <button
                              onClick={() => handleActionClick(action)}
                              className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
                            >
                              Review in Menu Management
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleActionClick(action)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>
                            {action.type === 'navigate_pos_orders' && 'View Pending Orders'}
                            {action.type === 'navigate_analytics' && 'Open Daily Analytics'}
                            {action.type === 'navigate_pos_eod' && 'Open EOD Reconciliation'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Partial Live Transcript */}
          {partialTranscript && (
            <div className="flex items-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-sm italic text-amber-300 animate-pulse">
                {partialTranscript}…
              </div>
            </div>
          )}

          {/* Actionable Error Banners */}
          {activeError && (
            <div
              className={`rounded-xl border p-3.5 text-xs ${
                activeError.code === 'MIC_PERMISSION_DENIED'
                  ? 'border-red-500/40 bg-red-950/50 text-red-200'
                  : activeError.code === 'CONNECT_ERROR' || activeError.code === 'CONNECT_TIMEOUT'
                    ? 'border-amber-500/40 bg-amber-950/40 text-amber-200'
                    : 'border-rose-500/30 bg-rose-950/40 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    activeError.code === 'MIC_PERMISSION_DENIED'
                      ? 'text-red-400'
                      : activeError.code === 'CONNECT_ERROR'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-white">{activeError.message}</p>
                  {activeError.userGuidance && (
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {activeError.userGuidance}
                    </p>
                  )}
                  <div className="pt-2 flex items-center gap-2">
                    {activeError.code === 'MIC_PERMISSION_DENIED' && (
                      <button
                        onClick={toggleMic}
                        className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition"
                      >
                        Retry Microphone
                      </button>
                    )}
                    {(activeError.code === 'CONNECT_ERROR' || activeError.code === 'CONNECT_TIMEOUT') && (
                      <button
                        onClick={initClient}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reconnect Gateway
                      </button>
                    )}
                    <button
                      onClick={() => inputRef.current?.focus()}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                    >
                      Type Query Instead
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Query Chips */}
        <div className="border-t border-slate-800/80 bg-slate-900/60 px-4 sm:px-6 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
            <span className="shrink-0 text-slate-400 font-medium">Quick queries:</span>
            {QUICK_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendQuery(q)}
                className="shrink-0 rounded-full border border-slate-700 bg-slate-800/90 px-3 py-1 text-slate-300 transition hover:border-amber-500/50 hover:text-white"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Fallback Bar */}
        <form
          onSubmit={handleTextSubmit}
          className="flex items-center gap-2 border-t border-slate-800 bg-slate-950 px-4 py-2.5"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask sales, orders, or inventory in Telugu, Hindi, or English…"
              disabled={status === 'processing'}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || status === 'processing'}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-30 transition font-bold"
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Voice Controls Bar */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === 'listening'
                  ? 'bg-amber-400 animate-ping'
                  : status === 'speaking'
                    ? 'bg-emerald-400 animate-pulse'
                    : status === 'connected'
                      ? 'bg-emerald-400'
                      : status === 'permission_denied'
                        ? 'bg-red-400'
                        : 'bg-slate-500'
              }`}
            />
            <span className="text-xs text-slate-400 capitalize">
              {status === 'permission_denied'
                ? 'Permission denied'
                : status === 'connection_error'
                  ? 'Connection error'
                  : status}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isPlayingTts && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-900/40"
              >
                <Square className="h-3.5 w-3.5 fill-rose-300" />
                Stop Audio
              </button>
            )}

            <button
              type="button"
              onClick={toggleMic}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold transition shadow-lg ${
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Mute Mic
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Tap to Speak
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
