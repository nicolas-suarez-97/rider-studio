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
import { riderService } from '@/core/services/rider.service';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionIdParam = searchParams.get('session');
  const riderIdParam = searchParams.get('riderId');
  const initialPromptParam = searchParams.get('prompt');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [availableRiders, setAvailableRiders] = useState<Array<{ id: string; title: string; artist: string; type: string }>>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessionIdParam || '');
  const [activeAgent, setActiveAgent] = useState<AgentRole>('master');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isThinking, setIsAgentThinking] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Cargar lista de riders disponibles para vincular
  useEffect(() => {
    async function loadRiders() {
      try {
        const list = await riderService.getAll();
        setAvailableRiders(list.map(r => ({
          id: r.id,
          title: r.title,
          artist: r.artistName,
          type: r.type
        })));
      } catch (err) {
        console.warn('Error loading riders for chat:', err);
      }
    }
    loadRiders();
  }, []);

  // Cargar lista de sesiones
  const loadSessionsList = useCallback(async () => {
    try {
      const data = await chatService.getSessions();
      setSessions(data);
      return data;
    } catch (err) {
      console.warn('Error loading sessions:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    async function init() {
      const data = await loadSessionsList();

      // Si vino riderIdParam, buscar sesión existente de ese rider o crear una
      if (riderIdParam) {
        const matching = data.find(s => s.riderId === riderIdParam);
        if (matching) {
          setCurrentSessionId(matching.id);
          router.replace(`/chat?session=${matching.id}`);
          return;
        } else {
          // Crear nueva sesión vinculada al rider
          const newSession = await chatService.createSession({
            title: `Consulta de Producción`,
            riderId: riderIdParam,
            activeAgent: 'master'
          });
          setSessions(prev => [newSession, ...prev]);
          setCurrentSessionId(newSession.id);
          router.replace(`/chat?session=${newSession.id}`);
          return;
        }
      }

      // Si no hay parámetro de sesión en la URL pero hay sesiones previas, usar la primera o la de localStorage
      if (!sessionIdParam && data.length > 0) {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('raider_last_chat_session') : null;
        const target = data.find(s => s.id === stored) || data[0];
        setCurrentSessionId(target.id);
        router.replace(`/chat?session=${target.id}`);
      }
    }
    init();
  }, [sessionIdParam, riderIdParam, router, loadSessionsList]);

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

  const handleNewSession = async () => {
    try {
      const newSession = await chatService.createSession({
        title: 'Nueva Consulta',
        activeAgent
      });
      setSessions(prev => [newSession, ...prev.filter(s => s.id !== newSession.id)]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      router.replace(`/chat?session=${newSession.id}`);
      showToast('✨ Nueva conversación creada');
    } catch (err) {
      console.error('Error creating new session', err);
      showToast('⚠️ Error al crear nueva conversación');
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = window.confirm('¿Seguro que deseas eliminar esta conversación?');
    if (!ok) return;

    const success = await chatService.deleteSession(sessionId);
    if (success) {
      const updated = sessions.filter(s => s.id !== sessionId);
      setSessions(updated);
      showToast('🗑️ Conversación eliminada');

      // Si borramos la conversación actual, cambiar a la siguiente o crear una
      if (currentSessionId === sessionId) {
        if (updated.length > 0) {
          handleSelectSession(updated[0].id);
        } else {
          handleNewSession();
        }
      }
    } else {
      showToast('⚠️ No se pudo eliminar la conversación');
    }
  };

  const handleLinkRider = async (sessionId: string, riderId: string | null) => {
    const success = await chatService.linkRider(sessionId, riderId);
    if (success) {
      await loadSessionsList();
      showToast(riderId ? '🔗 Rider vinculado a la conversación' : 'Rider desvinculado');
    } else {
      showToast('⚠️ No se pudo actualizar el vínculo');
    }
  };

  const handleSendMessage = async (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = { sender: 'user', text, time: now };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsAgentThinking(true);

    const activeSession = sessions.find(s => s.id === currentSessionId);

    try {
      const data = await chatService.sendMessage({
        messages: updatedMessages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        riderType: activeSession?.riderInfo?.riderType || 'tecnico',
        activeAgent,
        sessionId: currentSessionId || undefined,
        riderId: activeSession?.riderId || undefined
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

      // Si el backend devolvió un sessionId que difiere del actual, sincronizar
      if (data.sessionId && data.sessionId !== currentSessionId) {
        setCurrentSessionId(data.sessionId);
        router.replace(`/chat?session=${data.sessionId}`);
      }

      // Actualizar inmediatamente la lista de sesiones para reflejar el título actualizado
      const refreshed = await chatService.getSessions();
      setSessions(refreshed);
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
        onDeleteSession={handleDeleteSession}
        activeAgent={activeAgent}
        onSelectAgent={(role) => setActiveAgent(role)}
        messages={messages}
        isThinking={isThinking}
        onSendMessage={handleSendMessage}
        availableRiders={availableRiders}
        onLinkRider={handleLinkRider}
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
