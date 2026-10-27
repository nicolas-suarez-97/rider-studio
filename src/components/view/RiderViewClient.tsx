"use client";

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
import { Icon } from '@/components/common/Icon';
import { SectionsNavPanel } from '@/components/workspace/SectionsNavPanel';
import { DocumentEditorPanel } from '@/components/workspace/DocumentEditorPanel';
import { scrollSectionIntoCanvas } from '@/components/workspace/editor/RiderDocumentSurface';
import { sectionsForOutline } from '@/core/editor/content-doc';
import { AssistantChatPanel } from '@/components/workspace/AssistantChatPanel';
import { Rider } from '@/core/models/Rider';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem } from '@/core/types/chat.types';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { SectionCommentItem } from '@/lib/share/comments';
import { guestStorageKey } from '@/lib/share/confirm';
import { countByType, filterSections } from '@/core/utils/type-view';
import { useTypeView } from '@/hooks/useTypeView';
import type { ContraLine, ContraResponse } from '@/core/types/contra-rider.types';
import { GuestNameDialog } from '@/components/view/GuestNameDialog';
import { ConfirmRequestsPanel } from '@/components/view/ConfirmRequestsPanel';

type MobileTab = 'sections' | 'document' | 'assistant';

interface RiderViewClientProps {
  shareToken: string;
  initialRiderData: ConstructorParameters<typeof Rider>[0];
}

export function RiderViewClient({ shareToken, initialRiderData }: RiderViewClientProps) {
  const { typeView, setTypeView } = useTypeView();
  const [rider] = useState<Rider>(() => new Rider(initialRiderData));
  const [activeSectionId, setActiveSectionId] = useState<string>(
    () => initialRiderData?.sections?.[0]?.id || ''
  );
  const [activeAgent, setActiveAgent] = useState<AgentRole>('master');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('document');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [readSectionIds, setReadSectionIds] = useState<string[]>([]);
  const [sectionComments, setSectionComments] = useState<SectionCommentItem[]>([]);
  const [openCommentSectionId, setOpenCommentSectionId] = useState<string | null>(null);
  const [commentAuthorName, setCommentAuthorName] = useState('');
  const [enteredName, setEnteredName] = useState('');
  const storedName = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.localStorage.getItem(guestStorageKey(shareToken))?.trim() || '';
      } catch {
        return '';
      }
    },
    () => ''
  );
  const guestName = enteredName || storedName || null;
  const [confirming, setConfirming] = useState(false);
  const [confirmLines, setConfirmLines] = useState<ContraLine[]>([]);

  const typeViewCounts = countByType(rider.sections, rider.type);
  const visibleSections = filterSections(rider.sections, typeView, rider.type);
  const outlineSections = sectionsForOutline(visibleSections);
  const readCount = outlineSections.filter((section) => readSectionIds.includes(section.id)).length;
  const readPercent = outlineSections.length === 0
    ? 0
    : Math.round((readCount / outlineSections.length) * 100);

  const toggleReadSection = (id: string) => {
    setReadSectionIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const persistGuestName = (name: string) => {
    try {
      window.localStorage.setItem(guestStorageKey(shareToken), name);
    } catch {
      // si no hay localStorage, el nombre vive solo en esta visita
    }
    setEnteredName(name);
    setCommentAuthorName(name);
  };

  const loadConfirmLines = async (name: string) => {
    const response = await fetch(`/api/share/${shareToken}/confirm?guest=${encodeURIComponent(name)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'No se pudieron leer los pedidos');
    }
    if (Array.isArray(data.lines)) setConfirmLines(data.lines);
  };

  const enterAsGuest = (name: string) => {
    persistGuestName(name);
    void loadConfirmLines(name).catch(() => setConfirmLines([]));
  };

  const startConfirm = () => {
    if (guestName) void loadConfirmLines(guestName).catch(() => setConfirmLines([]));
    setConfirming(true);
  };

  const saveConfirm = async (lineId: string, response: Exclude<ContraResponse, ''>, text: string) => {
    if (!guestName) throw new Error('Escribe tu nombre para entrar');
    const result = await fetch(`/api/share/${shareToken}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestName, lineId, response, text }),
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo guardar la respuesta');
    }
    if (Array.isArray(data.lines)) setConfirmLines(data.lines);
    setToastMessage('Respuesta guardada');
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/share/${shareToken}/comments`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.comments)) setSectionComments(data.comments);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const toggleSectionComments = (sectionId: string) => {
    setOpenCommentSectionId((current) => current === sectionId ? null : sectionId);
  };

  const submitSectionComment = async (sectionId: string, authorName: string, body: string) => {
    const response = await fetch(`/api/share/${shareToken}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId, authorName, body }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.comment) {
      setToastMessage(typeof data.error === 'string' ? data.error : 'No se pudo guardar la nota');
      window.setTimeout(() => setToastMessage(null), 3500);
      throw new Error('comment');
    }
    setCommentAuthorName(authorName);
    setSectionComments((current) => [...current, data.comment]);
  };

  const commentCounts = sectionComments.reduce<Record<string, number>>((counts, comment) => {
    counts[comment.sectionId] = (counts[comment.sectionId] || 0) + 1;
    return counts;
  }, {});

  const handleSelectSection = (id: string) => {
    setActiveSectionId(id);
    setMobileTab('document');
    window.requestAnimationFrame(() => {
      scrollSectionIntoCanvas(id);
    });
  };

  const handleSendMessage = async (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = { sender: 'user', text, time: now };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsThinking(true);

    try {
      const response = await fetch(`/api/share/${shareToken}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((message) => ({
            role: message.sender === 'user' ? 'user' : 'assistant',
            content: message.text,
          })),
          activeAgent,
          sessionId: sessionId || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo consultar el rider');
      }

      if (typeof data.sessionId === 'string') setSessionId(data.sessionId);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: data.message || 'No encuentro ese dato en el rider.',
          time: replyTime,
          role: activeAgent,
          roleName: data.roleName || AGENT_PROFILES[activeAgent].name,
          roleAvatar: data.roleAvatar || '🧠',
        },
      ]);
    } catch (err) {
      console.error(err);
      const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'No pude consultar el rider. Intenta de nuevo.',
          time: errTime,
          role: activeAgent,
          roleName: AGENT_PROFILES[activeAgent].name,
        },
      ]);
      setToastMessage('No se pudo enviar la consulta');
      window.setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased relative">
      <Toast message={toastMessage} />
      <Header
        pageType="view"
        typeView={typeView}
        typeViewCounts={typeViewCounts}
        onSelectTypeView={setTypeView}
        completedCount={readCount}
        totalCount={outlineSections.length}
        progressPercent={readPercent}
        onStartConfirm={guestName ? startConfirm : undefined}
        documentTitle={rider.title}
      />

      {guestName ? (
        <div className="shrink-0 px-3 sm:px-6 py-2 bg-violet-50 border-b border-violet-100 flex items-center justify-between gap-3">
          <p className="text-xs text-violet-900 font-medium min-w-0 truncate">
            Hola, {guestName}. El rider está en solo lectura.
          </p>
          <button
            type="button"
            onClick={startConfirm}
            className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white h-8 px-3 rounded-full text-xs font-bold"
          >
            Empezar a confirmar
          </button>
        </div>
      ) : null}

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`h-full ${mobileTab === 'sections' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:w-auto shrink-0`}>
          <SectionsNavPanel
            readOnly
            sections={outlineSections}
            onReorderSections={() => {}}
            activeSectionId={activeSectionId}
            onSelectSection={handleSelectSection}
            completedSectionIds={readSectionIds}
            onToggleComplete={toggleReadSection}
            onOpenAddSection={() => {}}
            onResetBlank={() => {}}
            progressPercent={rider.getProgress()}
            commentCounts={commentCounts}
          />
        </div>

        <div className={`h-full flex-1 ${mobileTab === 'document' ? 'flex w-full' : 'hidden'} xl:flex`}>
          <DocumentEditorPanel
            readOnly
            riderTitle={rider.title}
            artistName={rider.artistName}
            season={rider.season}
            riderType={rider.type}
            documentTheme={rider.documentTheme}
            version={rider.version}
            absoluteExclusions={rider.absoluteExclusions}
            sections={visibleSections}
            channels={rider.channels}
            completedSectionIds={readSectionIds}
            onToggleComplete={toggleReadSection}
            onUpdateChannel={() => {}}
            onAddChannel={() => {}}
            onDeleteChannel={() => {}}
            onExport={() => {}}
            onOpenStagePlot={() => {}}
            stagePlot={rider.stagePlot}
            media={rider.media}
            sectionComments={sectionComments}
            openCommentSectionId={openCommentSectionId}
            onToggleSectionComments={toggleSectionComments}
            commentAuthorName={commentAuthorName || guestName || ''}
            onSubmitSectionComment={submitSectionComment}
          />
        </div>

        <div className={`h-full ${mobileTab === 'assistant' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:w-auto shrink-0`}>
          <AssistantChatPanel
            consultMode
            activeAgent={activeAgent}
            onSelectAgent={setActiveAgent}
            messages={messages}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            isCollapsed={isChatCollapsed}
            onToggleCollapse={() => setIsChatCollapsed((prev) => !prev)}
            rider={rider}
          />
        </div>
      </div>

      {!guestName ? <GuestNameDialog onEnter={enterAsGuest} /> : null}
      {guestName && confirming ? (
        <ConfirmRequestsPanel
          guestName={guestName}
          lines={confirmLines}
          onClose={() => setConfirming(false)}
          onSave={saveConfirm}
        />
      ) : null}

      <nav
        aria-label="Navegación de la vista compartida"
        className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around"
      >
        <button
          type="button"
          onClick={() => setMobileTab('sections')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center gap-0.5 ${
            mobileTab === 'sections' ? 'text-violet-600 bg-violet-50 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icon name="list" className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Índice</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('document')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center gap-0.5 ${
            mobileTab === 'document' ? 'text-violet-600 bg-violet-50 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icon name="fileText" className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Rider</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('assistant')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center gap-0.5 ${
            mobileTab === 'assistant' ? 'text-violet-600 bg-violet-50 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Icon name="sparkles" className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Consulta</span>
        </button>
      </nav>
    </div>
  );
}
