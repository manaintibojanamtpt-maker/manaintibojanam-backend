import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Square, X, Sparkles, AlertCircle, ArrowRight, CheckCircle2, Store } from 'lucide-react';
import { OwnerVoiceClient } from '../infrastructure/ownerVoiceClient';
import { useAuth } from '../../../context/AuthContext';
import { useOwnerTenantId } from '../../../hooks/useOwnerTenantId';

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

export const OwnerVoiceAssistantModal: React.FC<OwnerVoiceAssistantModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const tenantId = useOwnerTenantId();
  const navigate = useNavigate();

  const [client, setClient] = useState<OwnerVoiceClient | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      text: 'నమస్కారం! మీ రెస్టారెంట్ సేల్స్, పెండింగ్ ఆర్డర్లు, లేదా స్టాక్ నిర్వహణ కోసం అడగండి. (Hello! Ask about sales, kitchen orders, or stock management.)',
      authorized: true,
    },
  ]);
  const [status, setStatus] = useState<'idle' | 'connected' | 'listening' | 'processing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partialTranscript]);

  useEffect(() => {
    if (!isOpen || !tenantId) return;

    const voiceClient = new OwnerVoiceClient(
      {
        tenantId,
        getToken: async () => (currentUser ? currentUser.getIdToken() : null),
        language: 'te-IN',
      },
      {
        onReady: () => {
          setStatus('connected');
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
        onError: (err) => {
          setErrorMessage(err.message);
          setStatus('error');
          setIsRecording(false);
          setIsPlayingTts(false);
        },
      },
    );

    voiceClient.connect().then((ok) => {
      if (ok) setStatus('connected');
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

  const toggleMic = useCallback(async () => {
    if (!client) return;
    setErrorMessage(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100">BhojanOS Owner Assistant</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Live Voice
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Store className="h-3.5 w-3.5" />
                Store: <span className="font-mono text-slate-300">{tenantId || 'Unknown'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conversation Body */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-amber-600 text-white'
                    : msg.authorized === false
                      ? 'rounded-tl-sm border border-red-500/30 bg-red-950/40 text-red-200'
                      : 'rounded-tl-sm border border-slate-800 bg-slate-800/80 text-slate-200 shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {/* Proposed Actions / Proposal-Only Stock Changes */}
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
                              <AlertCircle className="h-4 w-4 text-amber-400" />
                              <span>Proposal Only (Requires Screen Confirmation)</span>
                            </div>
                            <p className="mt-1 text-slate-300">
                              Item: <span className="font-semibold text-white">{action.payload.itemName || 'Item'}</span>{' '}
                              →{' '}
                              <span
                                className={`font-semibold ${action.payload.isAvailable ? 'text-emerald-400' : 'text-red-400'}`}
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
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
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

          {/* Partial live transcript */}
          {partialTranscript && (
            <div className="flex items-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-sm italic text-amber-300 animate-pulse">
                {partialTranscript}...
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Quick query chips */}
        <div className="border-t border-slate-800/80 bg-slate-900/60 px-6 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
            <span className="shrink-0 text-slate-400">Quick queries:</span>
            <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
              "ఈరోజు సేల్స్ ఎంత?"
            </span>
            <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
              "కిచెన్ లో పెండింగ్ ఆర్డర్లు ఎన్ని?"
            </span>
            <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
              "Mark Biryani out of stock"
            </span>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === 'listening'
                  ? 'bg-amber-400 animate-ping'
                  : status === 'connected'
                    ? 'bg-emerald-400'
                    : 'bg-slate-500'
              }`}
            />
            <span className="text-xs text-slate-400 capitalize">{status}</span>
          </div>

          <div className="flex items-center gap-3">
            {isPlayingTts && (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-900/40"
              >
                <Square className="h-3.5 w-3.5 fill-rose-300" />
                Stop Audio
              </button>
            )}

            <button
              onClick={toggleMic}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition shadow-lg ${
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
