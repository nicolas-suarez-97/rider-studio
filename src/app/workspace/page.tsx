"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
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

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const riderIdParam = searchParams.get('id');
  const riderTypeParam = (searchParams.get('type') as RiderType) || 'tecnico';

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rider, setRider] = useState<Rider>(() => Rider.createBlank(riderTypeParam));
  const [activeSectionId, setActiveSectionId] = useState<string>('tech-contactos');
  const [activeAgent, setActiveAgent] = useState<AgentRole>('audio_foh');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Modals
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Cargar rider desde ID o inicializar plantilla guiada
  useEffect(() => {
    let isMounted = true;

    async function initializeRider() {
      if (riderIdParam) {
        try {
          const loaded = await riderService.getById(riderIdParam);
          if (loaded && isMounted) {
            setRider(loaded);
            if (loaded.sections.length > 0) {
              setActiveSectionId(loaded.sections[0].id);
            }
            if (loaded.type === 'tecnico') setActiveAgent('audio_foh');
            else if (loaded.type === 'hospitality') setActiveAgent('hospitality');
            else if (loaded.type === 'seguridad') setActiveAgent('security');
            showToast(`✅ Rider de "${loaded.artistName}" cargado`);
            return;
          }
        } catch (err) {
          console.warn('Error loading rider by id:', err);
        }
      }

      // Si no hay id o falló, crear plantilla limpia
      const validTypes: RiderType[] = ['tecnico', 'hospitality', 'seguridad'];
      const targetType = validTypes.includes(riderTypeParam) ? riderTypeParam : 'tecnico';
      const blank = Rider.createBlank(targetType);
      if (isMounted) {
        setRider(blank);
        if (blank.sections.length > 0) {
          setActiveSectionId(blank.sections[0].id);
        }
        if (targetType === 'tecnico') setActiveAgent('audio_foh');
        else if (targetType === 'hospitality') setActiveAgent('hospitality');
        else if (targetType === 'seguridad') setActiveAgent('security');
      }
    }

    initializeRider();

    return () => {
      isMounted = false;
    };
  }, [riderIdParam, riderTypeParam, showToast]);

  // Persistir en local storage el último rider visto para navegación resiliente
  useEffect(() => {
    if (rider.id) {
      try {
        localStorage.setItem('raider_last_active_rider_id', rider.id);
      } catch {}
    }
  }, [rider.id]);

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

    router.replace(`/workspace?type=${type}`);
    showToast(`✨ Cambiado a Rider ${type.toUpperCase()}`);
  };

  // Guardar en base de datos Supabase
  const handleSaveRider = async () => {
    setIsSaving(true);
    setDbSyncStatus('saving');
    try {
      const saved = await riderService.save(rider);
      setRider(saved);
      setDbSyncStatus('saved');
      showToast('✅ Rider sincronizado y guardado en Supabase');
      
      // Actualizar la URL para incluir el ID sin recargar la página
      router.replace(`/workspace?id=${saved.id}`);
      setTimeout(() => setDbSyncStatus('idle'), 4000);
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
    setRider(prev => {
      const updated = new Rider({ ...prev, artistName: val });
      return updated;
    });
  };

  const handleUpdateSeason = (val: string) => {
    setRider(prev => {
      const updated = new Rider({ ...prev, season: val });
      return updated;
    });
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
  const handleAddSection = (newSec: { title: string; subtitle: string; tag: string; content: string }) => {
    setRider(prev => {
      const updated = new Rider({ ...prev });
      updated.addSection({
        title: newSec.title,
        subtitle: newSec.subtitle,
        tag: newSec.tag,
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'fileText',
        content: newSec.content
      });
      return updated;
    });
    showToast('✨ Nueva sección agregada al rider');
  };

  // Editar sección
  const handleSaveEditedSection = (updatedSection: SectionItem) => {
    setRider(prev => {
      const updated = new Rider({ ...prev });
      updated.updateSection(updatedSection.id, updatedSection);
      return updated;
    });
    showToast('✅ Sección actualizada');
  };

  const handleDeleteSection = (secId: string, title: string) => {
    const ok = window.confirm(`¿Seguro que deseas eliminar la sección "${title}"?`);
    if (!ok) return;

    setRider(prev => {
      const updated = new Rider({ ...prev });
      updated.deleteSection(secId);
      return updated;
    });
    showToast(`🗑️ Sección "${title}" eliminada`);
  };

  const handleReorderSections = (newSections: SectionItem[]) => {
    setRider(prev => {
      const updated = new Rider({ ...prev, sections: newSections });
      return updated;
    });
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

      // Ejecutar acciones sugeridas por el agente (si hay)
      if (Array.isArray(data.actions)) {
        data.actions.forEach((act: any) => {
          if (act.type === 'add_input_channel' && act.payload) {
            setRider(prev => {
              const updated = new Rider({ ...prev });
              updated.addChannel(act.payload.source || act.payload.name, act.payload.mic, act.payload.stand);
              return updated;
            });
            showToast(`🎛️ Canal "${act.payload.source || act.payload.name}" agregado por el agente`);
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
    <div className="h-screen max-h-screen overflow-hidden bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans select-none antialiased">
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
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: Outline y navegación de secciones */}
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
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          completedSectionIds={rider.completedSectionIds}
          onToggleComplete={handleToggleComplete}
          onOpenAddSection={() => setShowAddSectionModal(true)}
          onResetBlank={() => handleSelectRiderType(rider.type)}
          progressPercent={rider.getProgress()}
        />

        {/* Panel 2: Editor visual del Documento */}
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
        />

        {/* Panel 3: Copilot Asistente de IA */}
        <AssistantChatPanel
          activeAgent={activeAgent}
          onSelectAgent={(role) => setActiveAgent(role)}
          messages={messages}
          isThinking={isAgentThinking}
          onSendMessage={handleSendMessage}
          isCollapsed={isChatCollapsed}
          onToggleCollapse={() => setIsChatCollapsed(prev => !prev)}
        />
      </div>

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

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#f8f9fa] text-slate-500 font-bold text-sm">
        <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-3" />
        Cargando espacio de trabajo...
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
