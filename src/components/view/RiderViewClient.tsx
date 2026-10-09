"use client";

import React, { useState } from 'react';
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
        onSelectRiderType={handleSelectRiderType}
        completedCount={rider.completedSectionIds.length}
        totalCount={rider.sections.length}
        progressPercent={rider.getProgress()}
        moduleStats={rider.getModuleStats()}
        masterProgress={rider.getMasterProgress()}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`h-full ${mobileTab === 'sections' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:w-auto shrink-0`}>
          <SectionsNavPanel
            readOnly
            sections={rider.sections}
            onReorderSections={() => {}}
            activeSectionId={activeSectionId}
            onSelectSection={handleSelectSection}
            completedSectionIds={rider.completedSectionIds}
            onToggleComplete={() => {}}
            onOpenAddSection={() => {}}
            onResetBlank={() => {}}
            progressPercent={rider.getProgress()}
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
            completedSectionIds={rider.completedSectionIds}
            onToggleComplete={() => {}}
            onEditSection={() => {}}
            onUpdateChannel={() => {}}
            onAddChannel={() => {}}
            onDeleteChannel={() => {}}
            onExport={() => {}}
            onOpenStagePlot={() => {}}
            stagePlot={rider.stagePlot}
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
          <Icon name="messageSquare" className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Consulta</span>
        </button>
      </nav>
    </div>
  );
}
