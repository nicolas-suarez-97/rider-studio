"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
import { Icon } from '@/components/common/Icon';
import { SectionsNavPanel } from '@/components/workspace/SectionsNavPanel';
import { DocumentEditorPanel } from '@/components/workspace/DocumentEditorPanel';
import { AssistantChatPanel } from '@/components/workspace/AssistantChatPanel';
import { AddSectionModal } from '@/components/modals/AddSectionModal';
import { EditSectionModal } from '@/components/modals/EditSectionModal';
import { Rider } from '@/core/models/Rider';
import { riderService } from '@/core/services/rider.service';
import { chatService } from '@/core/services/chat.service';
import { RiderType, SectionItem } from '@/core/types/rider.types';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem } from '@/core/types/chat.types';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';

type MobileTab = 'sections' | 'document' | 'assistant';

interface WorkspaceClientProps {
  initialRiderData: ConstructorParameters<typeof Rider>[0];
  initialSessionId?: string | null;
  initialSessionTitle?: string | null;
  initialMessages?: ChatMessageItem[];
  initialType?: RiderType;
}

export function WorkspaceClient({
  initialRiderData,
  initialSessionId = null,
  initialSessionTitle = null,
  initialMessages = [],
  initialType = 'tecnico'
}: WorkspaceClientProps) {
  const router = useRouter();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rider, setRider] = useState<Rider>(() => new Rider(initialRiderData || { type: initialType }));
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    return initialRiderData?.sections?.[0]?.id || 'tech-contactos';
  });
  const [activeAgent, setActiveAgent] = useState<AgentRole>(() => {
    const t = initialRiderData?.type || initialType;
    if (t === 'hospitality') return 'hospitality';
    if (t === 'seguridad') return 'security';
    return 'audio_foh';
  });
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Estado de vista activa en dispositivos móviles (< 1280px)
  const [mobileTab, setMobileTab] = useState<MobileTab>('document');

  // Modales
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);

  // Chat & Sesión Asociada
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId);
  const [currentSessionTitle] = useState<string | null>(initialSessionTitle);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  const isFirstMount = useRef(true);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Persistir en local storage el último rider visto
  useEffect(() => {
    if (rider.id) {
      try {
        localStorage.setItem('raider_last_active_rider_id', rider.id);
      } catch {}
    }
  }, [rider.id]);

  // Cargar historial de mensajes cuando cambie la sesión asociada en el cliente
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    let isMounted = true;

    async function loadSessionHistory() {
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
        console.warn(`[Workspace] Error loading history for ${currentSessionId}:`, err);
      }
    }

    loadSessionHistory();

    return () => {
      isMounted = false;
    };
  }, [currentSessionId]);

  // Cambiar tipo de rider
  const handleSelectRiderType = (type: RiderType) => {
    const blank = Rider.createBlank(type);
    setRider(blank);
    if (blank.sections.length > 0) {
      setActiveSectionId(blank.sections[0].id);
    }
    if (type === 'tecnico') setActiveAgent('audio_foh');
    else if (type === 'hospitality') setActiveAgent('hospitality');
    else if (type === 'seguridad') setActiveAgent('security');

    const sessionQuery = currentSessionId ? `&session=${currentSessionId}` : '';
    router.replace(`/workspace?type=${type}${sessionQuery}`);
    showToast(`✨ Cambiado a Rider ${type.toUpperCase()}`);
  };

  // Guardar en base de datos Supabase
  const handleSaveRider = async (customRider?: Rider) => {
    const targetRider = customRider ? new Rider(customRider) : new Rider(rider);
    if (!targetRider.artistName || targetRider.artistName.trim() === '') {
      targetRider.artistName = 'Nuevo Artista / Banda';
    }
    if (!targetRider.title || targetRider.title.trim() === '') {
      targetRider.title = `Rider de Producción - ${targetRider.artistName}`;
    }

    setIsSaving(true);
    setDbSyncStatus('saving');
    try {
      const saved = await riderService.save(targetRider);
      setRider(saved);
      setDbSyncStatus('saved');
      showToast('✅ Rider sincronizado y guardado en Supabase');

      if (currentSessionId && saved.id) {
        await chatService.linkRider(currentSessionId, saved.id);
      }

      const sessionQuery = currentSessionId ? `&session=${currentSessionId}` : '';
      const newUrl = `/workspace?id=${saved.id}${sessionQuery}`;
      if (typeof window !== 'undefined') {
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
      }
      setTimeout(() => setDbSyncStatus('idle'), 4000);
      return saved;
    } catch (err) {
      console.error(err);
      setDbSyncStatus('error');
      showToast('⚠️ Error al guardar el rider');
    } finally {
      setIsSaving(false);
    }
  };

  // Título y temporada editables
  const handleUpdateTitle = (val: string) => {
    setRider(prev => new Rider({ ...prev, artistName: val }));
  };

  const handleUpdateSeason = (val: string) => {
    setRider(prev => new Rider({ ...prev, season: val }));
  };

  // Toggle completado de sección
  const handleToggleComplete = (secId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRider(prev => {
      const updated = new Rider({ ...prev });
      updated.toggleSectionCompletion(secId);
      return updated;
    });
  };

  // Agregar sección
  const handleAddSection = async (newSec: { title: string; subtitle: string; tag: string; content: string }) => {
    const updated = new Rider({ ...rider });
    updated.addSection({
      title: newSec.title,
      subtitle: newSec.subtitle,
      tag: newSec.tag,
      tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
      iconName: 'fileText',
      content: newSec.content
    });
    setRider(updated);
    showToast('✨ Nueva sección agregada al rider');
    await handleSaveRider(updated);
  };

  // Editar sección
  const handleSaveEditedSection = async (updatedSection: SectionItem) => {
    const updated = new Rider({ ...rider });
    updated.updateSection(updatedSection.id, updatedSection);
    setRider(updated);
    showToast('✅ Sección actualizada');
    await handleSaveRider(updated);
  };

  const handleDeleteSection = async (secId: string, title: string) => {
    const ok = window.confirm(`¿Seguro que deseas eliminar la sección "${title}"?`);
    if (!ok) return;

    const updated = new Rider({ ...rider });
    updated.deleteSection(secId);
    setRider(updated);
    showToast(`🗑️ Sección "${title}" eliminada`);
    await handleSaveRider(updated);
  };

  const handleReorderSections = (newSections: SectionItem[]) => {
    setRider(prev => new Rider({ ...prev, sections: newSections }));
  };

  // Canales
  const handleUpdateChannel = (chId: string, field: 'name' | 'mic' | 'stand', val: string) => {
    setRider(prev => {
      const updated = new Rider({ ...prev });
      updated.updateChannel(chId, { [field]: val });
      return updated;
    });
  };

  const handleAddChannel = () => {
    setRider(prev => {
      const updated = new Rider({ ...prev });
      updated.addChannel();
      return updated;
    });
  };

  const handleDeleteChannel = (chId: string) => {
    setRider(prev => {
      const updated = new Rider({ ...prev });
      updated.deleteChannel(chId);
      return updated;
    });
  };

  // Chat con Asistente
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
        riderType: rider.type,
        activeAgent,
        sessionId: currentSessionId || undefined,
        riderId: rider.id || undefined
      });

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const aiMsg: ChatMessageItem = {
        sender: 'ai',
        text: data.message || 'Entendido. Procesando requerimiento de escenario.',
        time: replyTime,
        role: activeAgent,
        roleName: data.roleName || AGENT_PROFILES[activeAgent].name,
        roleAvatar: data.roleAvatar || (activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠')
      };
      setMessages(prev => [...prev, aiMsg]);

      // Sincronizar ID de sesión si el backend generó una nueva
      if (data.sessionId && data.sessionId !== currentSessionId) {
        setCurrentSessionId(data.sessionId);
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('session', data.sessionId);
        router.replace(currentUrl.pathname + currentUrl.search);
      }

      // Ejecutar acciones sugeridas por el agente (si hay)
      if (Array.isArray(data.actions)) {
        data.actions.forEach((act) => {
          if (act.type === 'add_input_channel' && typeof act.payload === 'object' && act.payload !== null) {
            const p = act.payload as { source?: string; name?: string; mic?: string; stand?: string };
            const channelName = p.source || p.name || 'Nuevo Canal';
            setRider(prev => {
              const updated = new Rider({ ...prev });
              updated.addChannel(channelName, p.mic, p.stand);
              return updated;
            });
            showToast(`🎛️ Canal "${channelName}" agregado por el agente`);
          }
        });
      }
    } catch (err) {
      console.error(err);
      const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Hubo un error de conexión con el agente. Por favor reintenta.',
          time: errTime,
          role: activeAgent,
          roleName: AGENT_PROFILES[activeAgent].name
        }
      ]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleExport = () => {
    window.print();
  };

  const handleOpenStagePlot = () => {
    showToast('📐 Generador de Stage Plot 2D en preparación');
  };

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased relative">
      <Toast message={toastMessage} />

      <Header
        pageType="workspace"
        riderType={rider.type}
        onSelectRiderType={handleSelectRiderType}
        completedCount={rider.completedSectionIds.length}
        totalCount={rider.sections.length}
        progressPercent={rider.getProgress()}
        onSaveRider={handleSaveRider}
        isSaving={isSaving}
        dbSyncStatus={dbSyncStatus}
        onExport={handleExport}
        onOpenStagePlot={handleOpenStagePlot}
        chatSessionId={currentSessionId}
        riderId={rider.id}
      />

      {/* Contenedor de Paneles: 3 columnas simultáneas en desktop (xl:), panel único en móvil/tablet */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Panel 1: Outline y navegación de secciones */}
        <div className={`h-full ${mobileTab === 'sections' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:w-auto shrink-0`}>
          <SectionsNavPanel
            docHeaderTitle={rider.artistName}
            setDocHeaderTitle={handleUpdateTitle}
            docHeaderSeason={rider.season}
            setDocHeaderSeason={handleUpdateSeason}
            sections={rider.sections}
            onReorderSections={handleReorderSections}
            activeSectionId={activeSectionId}
            onSelectSection={(id) => {
              setActiveSectionId(id);
              // Al tocar una sección en móvil, cambiar automáticamente al documento y hacer scroll
              setMobileTab('document');
              setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 80);
            }}
            completedSectionIds={rider.completedSectionIds}
            onToggleComplete={handleToggleComplete}
            onOpenAddSection={() => setShowAddSectionModal(true)}
            onResetBlank={() => handleSelectRiderType(rider.type)}
            progressPercent={rider.getProgress()}
            onSaveRider={() => handleSaveRider()}
            isSaving={isSaving}
            dbSyncStatus={dbSyncStatus}
            riderType={rider.type}
            onSelectRiderType={handleSelectRiderType}
          />
        </div>

        {/* Panel 2: Editor visual del Documento */}
        <div className={`h-full flex-1 ${mobileTab === 'document' ? 'flex w-full' : 'hidden'} xl:flex`}>
          <DocumentEditorPanel
            riderTitle={rider.title}
            artistName={rider.artistName}
            season={rider.season}
            riderType={rider.type}
            sections={rider.sections}
            channels={rider.channels}
            completedSectionIds={rider.completedSectionIds}
            onToggleComplete={handleToggleComplete}
            onEditSection={(s) => setEditingSection(s)}
            onUpdateChannel={handleUpdateChannel}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
            onExport={handleExport}
            onOpenStagePlot={handleOpenStagePlot}
            onSaveRider={() => handleSaveRider()}
            isSaving={isSaving}
            dbSyncStatus={dbSyncStatus}
            onUpdateArtistName={handleUpdateTitle}
            onUpdateSeason={handleUpdateSeason}
          />
        </div>

        {/* Panel 3: Copilot Asistente de IA */}
        <div className={`h-full ${mobileTab === 'assistant' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:w-auto shrink-0`}>
          <AssistantChatPanel
            activeAgent={activeAgent}
            onSelectAgent={(role) => setActiveAgent(role)}
            messages={messages}
            isThinking={isAgentThinking}
            onSendMessage={handleSendMessage}
            isCollapsed={isChatCollapsed}
            onToggleCollapse={() => setIsChatCollapsed(prev => !prev)}
            rider={rider}
            sessionId={currentSessionId}
            sessionTitle={currentSessionTitle}
          />
        </div>
      </div>

      {/* Barra de Navegación Móvil Inferior (Bottom Navigation) visible solo en < xl */}
      <nav 
        aria-label="Navegación del espacio de trabajo"
        className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(100,116,139,0.08)] flex items-center justify-around"
      >
        {/* Pestaña 1: Índice / Secciones */}
        <button
          type="button"
          onClick={() => setMobileTab('sections')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
            mobileTab === 'sections'
              ? 'text-violet-600 bg-violet-50 font-bold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <Icon name="list" className="w-4 h-4" />
            <span className="absolute -top-1 -right-2 text-[8px] font-black px-1 rounded-full bg-slate-200 text-slate-700">
              {rider.completedSectionIds.length}/{rider.sections.length}
            </span>
          </div>
          <span className="text-[10px] leading-tight">Índice</span>
        </button>

        {/* Pestaña 2: Documento Editor */}
        <button
          type="button"
          onClick={() => setMobileTab('document')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
            mobileTab === 'document'
              ? 'text-violet-600 bg-violet-50 font-bold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <Icon name="fileText" className="w-4 h-4" />
            <span className="absolute -top-1 -right-2 text-[8px] font-black px-1 rounded-full bg-emerald-100 text-emerald-700">
              {rider.getProgress()}%
            </span>
          </div>
          <span className="text-[10px] leading-tight">Documento</span>
        </button>

        {/* Pestaña 3: Copilot Asistente */}
        <button
          type="button"
          onClick={() => setMobileTab('assistant')}
          className={`flex-1 py-1.5 px-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
            mobileTab === 'assistant'
              ? 'text-violet-600 bg-violet-50 font-bold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <Icon name="sparkles" className="w-4 h-4" />
            {isAgentThinking ? (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-600 animate-ping" />
            ) : messages.length > 0 ? (
              <span className="absolute -top-1 -right-1.5 text-[8px] font-black px-1 rounded-full bg-violet-100 text-violet-700">
                {messages.length}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] leading-tight">Copilot IA</span>
        </button>
      </nav>

      {/* Modales */}
      <AddSectionModal
        isOpen={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        onAddSection={handleAddSection}
        currentRiderTitle={rider.title}
        nextSectionNum={String(rider.sections.length + 1).padStart(2, '0')}
      />

      <EditSectionModal
        section={editingSection}
        onClose={() => setEditingSection(null)}
        onSave={handleSaveEditedSection}
        onDelete={handleDeleteSection}
      />
    </div>
  );
}
