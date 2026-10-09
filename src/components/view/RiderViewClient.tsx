"use client";

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
import { Icon } from '@/components/common/Icon';
import { SectionsNavPanel } from '@/components/workspace/SectionsNavPanel';
import { DocumentEditorPanel } from '@/components/workspace/DocumentEditorPanel';
import { AssistantChatPanel } from '@/components/workspace/AssistantChatPanel';
import { Rider } from '@/core/models/Rider';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem } from '@/core/types/chat.types';
import { RiderType } from '@/core/types/rider.types';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { SectionCommentItem } from '@/lib/share/comments';

type MobileTab = 'sections' | 'document' | 'assistant';

interface RiderViewClientProps {
  shareToken: string;
  initialRiderData: ConstructorParameters<typeof Rider>[0];
}

export function RiderViewClient({ shareToken, initialRiderData }: RiderViewClientProps) {
  const [rider, setRider] = useState<Rider>(() => new Rider(initialRiderData));
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

  const readableTypes = rider.getReadableTypes();
  const readCount = rider.sections.filter((section) => readSectionIds.includes(section.id)).length;
  const readPercent = rider.sections.length === 0
    ? 0
    : Math.round((readCount / rider.sections.length) * 100);

  const toggleReadSection = (id: string) => {
    setReadSectionIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
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

  const handleSelectRiderType = (type: RiderType) => {
    const updated = new Rider(rider);
    updated.switchType(type);
    setRider(updated);
    setActiveSectionId(updated.sections[0]?.id || '');
    setMobileTab('document');
  };

  const handleSelectSection = (id: string) => {
    setActiveSectionId(id);
    setMobileTab('document');
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        riderType={rider.type}
        onSelectRiderType={readableTypes.length > 1 ? handleSelectRiderType : undefined}
        visibleModuleTypes={readableTypes}
        completedCount={readCount}
        totalCount={rider.sections.length}
        progressPercent={readPercent}
        contraRiderHref={rider.id ? `/promotor/shows/${rider.id}/contra-rider` : undefined}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`h-full ${mobileTab === 'sections' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:w-auto shrink-0`}>
          <SectionsNavPanel
            readOnly
            sections={rider.sections}
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
            sections={rider.sections}
            channels={rider.channels}
            completedSectionIds={readSectionIds}
            onToggleComplete={toggleReadSection}
            onEditSection={() => {}}
            onUpdateChannel={() => {}}
            onAddChannel={() => {}}
            onDeleteChannel={() => {}}
            onExport={() => {}}
            onOpenStagePlot={() => {}}
            stagePlot={rider.stagePlot}
            sectionComments={sectionComments}
            openCommentSectionId={openCommentSectionId}
            onToggleSectionComments={toggleSectionComments}
            commentAuthorName={commentAuthorName}
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
