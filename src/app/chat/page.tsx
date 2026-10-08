"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
import { ChatView } from '@/components/chat/ChatView';
import { chatService } from '@/core/services/chat.service';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem, ChatSessionSummary } from '@/core/types/chat.types';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionIdParam = searchParams.get('session');
  const initialPromptParam = searchParams.get('prompt');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessionIdParam || '');
  const [activeAgent, setActiveAgent] = useState<AgentRole>('master');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isThinking, setIsAgentThinking] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Cargar lista de sesiones
  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await chatService.getSessions();
        setSessions(data);

        // Si no hay parámetro de sesión en la URL pero hay sesiones previas, usar la primera o la de localStorage
        if (!sessionIdParam && data.length > 0) {
          const stored = typeof window !== 'undefined' ? localStorage.getItem('raider_last_chat_session') : null;
          const target = data.find(s => s.id === stored) || data[0];
          setCurrentSessionId(target.id);
          router.replace(`/chat?session=${target.id}`);
        }
      } catch (err) {
        console.warn('Error loading sessions:', err);
      }
    }
    loadSessions();
  }, [sessionIdParam, router]);

  // Cargar historial de la sesión activa
  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!currentSessionId) return;

      try {
        const history = await chatService.getHistory(currentSessionId);
        if (isMounted) {
          setMessages(history);
          try {
            localStorage.setItem('raider_last_chat_session', currentSessionId);
          } catch {}
        }
      } catch (err) {
        console.warn(`Error loading history for ${currentSessionId}:`, err);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [currentSessionId]);

  // Si vino un prompt inicial desde la landing, enviarlo automáticamente
  useEffect(() => {
    if (initialPromptParam) {
      handleSendMessage(decodeURIComponent(initialPromptParam));
    }
  }, [initialPromptParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    router.replace(`/chat?session=${sessionId}`);
    showToast('Cargando conversación...');
  };

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    router.replace(`/chat?session=${newId}`);
    showToast('✨ Nueva conversación iniciada');
  };

  const handleSendMessage = async (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = { sender: 'user', text, time: now };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsAgentThinking(true);

    try {
      const data = await chatService.sendMessage({
        messages: updatedMessages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        riderType: 'tecnico',
        activeAgent,
        sessionId: currentSessionId || undefined
      });

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiMsg: ChatMessageItem = {
        sender: 'ai',
        text: data.message || 'Entendido. Procesando requerimiento.',
        time: replyTime,
        role: activeAgent,
        roleName: data.roleName || AGENT_PROFILES[activeAgent].name,
        roleAvatar: data.roleAvatar || '🧠'
      };
      setMessages(prev => [...prev, aiMsg]);

      // Refrescar sesiones si es nueva
      if (!sessions.some(s => s.id === currentSessionId)) {
        const refreshed = await chatService.getSessions();
        setSessions(refreshed);
      }
    } catch (err) {
      console.error(err);
      const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Error de comunicación con el agente. Por favor verifica tu conexión.',
          time: errTime,
          role: activeAgent,
          roleName: AGENT_PROFILES[activeAgent].name
        }
      ]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans select-none antialiased">
      <Toast message={toastMessage} />
      
      <Header pageType="chat" />

      <ChatView
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        activeAgent={activeAgent}
        onSelectAgent={(role) => setActiveAgent(role)}
        messages={messages}
        isThinking={isThinking}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#f8f9fa] text-slate-500 font-bold text-sm">
        <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
        Cargando chat de producción...
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
