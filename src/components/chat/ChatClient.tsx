"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
import { ChatView } from '@/components/chat/ChatView';
import { chatService } from '@/core/services/chat.service';
import { riderService } from '@/core/services/rider.service';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem, ChatSessionSummary } from '@/core/types/chat.types';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { Rider } from '@/core/models/Rider';
import { RiderType } from '@/core/types/rider.types';

interface ChatClientProps {
  initialSessions: ChatSessionSummary[];
  initialSessionId: string;
  initialMessages: ChatMessageItem[];
  initialAvailableRiders: Array<{ id: string; title: string; artist: string; type: string }>;
  initialPrompt?: string | null;
}

export function ChatClient({
  initialSessions,
  initialSessionId,
  initialMessages,
  initialAvailableRiders,
  initialPrompt
}: ChatClientProps) {
  const router = useRouter();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>(initialSessions);
  const [availableRiders, setAvailableRiders] = useState(initialAvailableRiders);
  const [currentSessionId, setCurrentSessionId] = useState<string>(initialSessionId);
  const [activeAgent, setActiveAgent] = useState<AgentRole>('master');
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [isThinking, setIsAgentThinking] = useState(false);

  const [prevInitialSessions, setPrevInitialSessions] = useState(initialSessions);
  if (initialSessions !== prevInitialSessions) {
    setPrevInitialSessions(initialSessions);
    setSessions(initialSessions);
  }

  const isFirstMount = useRef(true);
  const hasTriggeredInitialPrompt = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

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

  // Refrescar sesiones y riders cuando la ventana vuelve a ser visible
  useEffect(() => {
    let isCancelled = false;

    async function syncOnFocus() {
      try {
        const [sessList, riderList] = await Promise.all([
          chatService.getSessions(),
          riderService.getAll()
        ]);
        if (!isCancelled) {
          if (Array.isArray(sessList)) setSessions(sessList);
          if (Array.isArray(riderList)) {
            setAvailableRiders(riderList.map(r => ({ id: r.id, title: r.title, artist: r.artistName, type: r.type })));
          }
        }
      } catch (e) {
        console.warn('[ChatClient] Error syncing on focus:', e);
      }
    }

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        syncOnFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = { sender: 'user', text, time: now };
    
    setMessages(prev => [...prev, userMsg]);
    setIsAgentThinking(true);

    const activeSession = sessions.find(s => s.id === currentSessionId);

    try {
      const currentSnapshot = [...messages, userMsg];
      const data = await chatService.sendMessage({
        messages: currentSnapshot.map(m => ({
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

      if (data.sessionId && data.sessionId !== currentSessionId) {
        setCurrentSessionId(data.sessionId);
        router.replace(`/chat?session=${data.sessionId}`);
      }

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
  }, [activeAgent, currentSessionId, messages, router, sessions]);

  // Cargar historial de la sesión solo cuando el usuario cambia de conversación en el cliente
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (currentSessionId) {
        try {
          localStorage.setItem('raider_last_chat_session', currentSessionId);
        } catch {}
      }
      return;
    }

    let isMounted = true;

    async function loadHistory() {
      if (!currentSessionId) {
        setMessages([]);
        return;
      }

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

  // Si vino un prompt inicial, enviarlo automáticamente una sola vez al montar
  useEffect(() => {
    if (initialPrompt && !hasTriggeredInitialPrompt.current) {
      hasTriggeredInitialPrompt.current = true;
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, handleSendMessage]);

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
    let targetSessionId = sessionId;

    if (!targetSessionId && riderId) {
      try {
        const newSession = await chatService.createSession({
          title: 'Nueva Consulta',
          riderId,
          activeAgent
        });
        targetSessionId = newSession.id;
        setCurrentSessionId(newSession.id);
        router.replace(`/chat?session=${newSession.id}`);
      } catch (e) {
        console.warn('Could not auto-create session', e);
      }
    }

    if (targetSessionId) {
      const success = await chatService.linkRider(targetSessionId, riderId);
      if (success) {
        await loadSessionsList();
        showToast(riderId ? '🔗 Rider vinculado al chat correctamente' : 'Rider desvinculado del chat');
        return;
      }
    }
    showToast('⚠️ No se pudo actualizar el vínculo');
  };

  const handleCreateAndLinkRider = async (artistName: string, type: RiderType = 'tecnico'): Promise<string | null> => {
    try {
      const blank = Rider.createBlank(type);
      const cleanArtist = artistName.trim() || 'Nuevo Artista / Banda';
      blank.artistName = cleanArtist;
      blank.title = `Rider ${type === 'tecnico' ? 'Técnico de Audio' : type === 'hospitality' ? 'de Hospitality' : 'de Seguridad'} - ${cleanArtist}`;

      const saved = await riderService.save(blank);
      if (saved && saved.id) {
        let targetSessionId = currentSessionId;
        if (!targetSessionId) {
          const newSession = await chatService.createSession({
            title: `Consulta - ${cleanArtist}`,
            riderId: saved.id,
            activeAgent
          });
          targetSessionId = newSession.id;
          setCurrentSessionId(newSession.id);
          router.replace(`/chat?session=${newSession.id}`);
        } else {
          await chatService.linkRider(targetSessionId, saved.id);
        }

        await loadSessionsList();
        const list = await riderService.getAll();
        setAvailableRiders(list.map(r => ({ id: r.id, title: r.title, artist: r.artistName, type: r.type })));
        showToast(`✨ Rider "${saved.artistName}" creado y vinculado al chat`);

        return saved.id;
      }
    } catch (err) {
      console.error('Error creating rider from chat:', err);
      showToast('⚠️ Error al crear el nuevo rider');
    }
    return null;
  };

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased">
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
        onCreateRider={handleCreateAndLinkRider}
      />
    </div>
  );
}
