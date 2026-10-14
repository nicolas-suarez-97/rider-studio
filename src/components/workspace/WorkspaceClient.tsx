"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
import { Icon } from '@/components/common/Icon';
import { SectionsNavPanel } from '@/components/workspace/SectionsNavPanel';
import { DocumentEditorPanel } from '@/components/workspace/DocumentEditorPanel';
import { AssistantChatPanel } from '@/components/workspace/AssistantChatPanel';
import { MasterExportModal } from '@/components/modals/MasterExportModal';
import { StagePlotModal } from '@/components/modals/StagePlotModal';
import { ShareLinkModal } from '@/components/modals/ShareLinkModal';
import { Rider } from '@/core/models/Rider';
import { riderService } from '@/core/services/rider.service';
import { chatService } from '@/core/services/chat.service';
import { RiderType, SectionItem, ChannelData, ExportScope, StagePlotConfig } from '@/core/types/rider.types';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem } from '@/core/types/chat.types';
import { SectionCommentItem } from '@/lib/share/comments';
import { buildGapSuggestions, type SectionDocumentPatch } from '@/core/editor/content-doc';
import { materializeSuggestions } from '@/core/editor/suggestions';
import { DocumentSuggestion, EditorContextPayload } from '@/core/types/suggestion.types';
import { EditorBridge } from '@/components/workspace/editor/RiderDocumentSurface';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { isPersistedRiderId, MAX_GALLERY_IMAGES } from '@/lib/media/rider-media';
import { deleteRiderImage, uploadRiderImage } from '@/lib/media/upload-client';

type MobileTab = 'sections' | 'document' | 'assistant';

function riderEditSnapshot(current: Rider) {
  return JSON.stringify({
    artistName: current.artistName,
    season: current.season,
    title: current.title,
    type: current.type,
    sections: current.sections,
    channels: current.channels.map((channel) => channel.toJSON()),
    stagePlot: current.stagePlot,
    media: current.media,
    completedSectionIds: current.completedSectionIds,
  });
}

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
  const riderRef = useRef(rider);
  riderRef.current = rider;
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    return initialRiderData?.sections?.[0]?.id || 'tech-contactos';
  });
  const [activeAgent, setActiveAgent] = useState<AgentRole>(() => {
    const t = initialRiderData?.type || initialType;
    if (t === 'hospitality') return 'hospitality';
    if (t === 'seguridad') return 'security';
    return 'audio_foh';
  });
  // Mostrar el chat expandido solo si hay una conversación asociada al rider; de lo contrario mantenerlo oculto
  const hasAssociatedChat = Boolean(
    initialSessionId ||
    (initialMessages && initialMessages.length > 0) ||
    (initialRiderData?.linkedSessions && initialRiderData.linkedSessions.length > 0)
  );
  const [isChatCollapsed, setIsChatCollapsed] = useState(!hasAssociatedChat);
  const [isSaving, setIsSaving] = useState(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Estado de vista activa en dispositivos móviles (< 1280px)
  const [mobileTab, setMobileTab] = useState<MobileTab>('document');
  const [isAddingSection, setIsAddingSection] = useState(false);

  // Modales
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('master');
  const [showStagePlotModal, setShowStagePlotModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sectionComments, setSectionComments] = useState<SectionCommentItem[]>([]);
  const [openCommentSectionId, setOpenCommentSectionId] = useState<string | null>(null);
  const [agentSuggestions, setAgentSuggestions] = useState<DocumentSuggestion[]>([]);
  const [dismissedGaps, setDismissedGaps] = useState<string[]>([]);
  const bridgeRef = useRef<EditorBridge | null>(null);
  const selectionRef = useRef({ sectionId: '', text: '' });
  const savedSnap = useRef<string | null>(null);
  const saveEpoch = useRef(0);

  // Chat & Sesión Asociada
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId);
  const [currentSessionTitle] = useState<string | null>(initialSessionTitle);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  const isFirstMount = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rider.id) return;
    let cancelled = false;
    fetch(`/api/riders/${rider.id}/comments`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.comments)) setSectionComments(data.comments);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [rider.id]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3500);
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

  // Cambiar tipo de rider preservando artista, temporada, id y contenido de módulos
  const handleSelectRiderType = (type: RiderType) => {
    const updated = new Rider({ ...rider });
    updated.switchType(type);
    setRider(updated);
    setIsAddingSection(false);
    setActiveSectionId(updated.sections[0]?.id || '');
    if (type === 'tecnico') setActiveAgent('audio_foh');
    else if (type === 'hospitality') setActiveAgent('hospitality');
    else if (type === 'seguridad') setActiveAgent('security');

    const sessionQuery = currentSessionId ? `&session=${currentSessionId}` : '';
    const idQuery = updated.id ? `&id=${updated.id}` : '';
    router.replace(`/artista/workspace?type=${type}${idQuery}${sessionQuery}`);
    showToast(`✨ Cambiado a Módulo ${type.toUpperCase()} (${updated.artistName || 'Mismo Artista'})`);
  };

  // Guardar en base de datos Supabase
  const handleSaveRider = async (customRider?: Rider, options?: { silent?: boolean; epoch?: number }) => {
    const epochAtStart = options?.epoch ?? saveEpoch.current;
    const targetRider = customRider ? new Rider(customRider) : new Rider(riderRef.current);
    const hasArtist = Boolean(targetRider.artistName && targetRider.artistName.trim() !== '');

    if (!targetRider.title || targetRider.title.trim() === '') {
      targetRider.title = hasArtist
        ? `Rider de Producción - ${targetRider.artistName.trim()}`
        : 'Rider de Producción';
    }

    setIsSaving(true);
    setDbSyncStatus('saving');
    try {
      const saved = await riderService.save(targetRider);
      if (!hasArtist) {
        saved.artistName = '';
      }
      const changedDuringSave = !customRider && saveEpoch.current !== epochAtStart;
      if (changedDuringSave) {
        if (saved.id && riderRef.current.id !== saved.id) {
          const merged = new Rider({ ...riderRef.current, id: saved.id });
          riderRef.current = merged;
          setRider(merged);
        }
        setDbSyncStatus('saved');
        setTimeout(() => setDbSyncStatus('idle'), 4000);
        return saved;
      }
      riderRef.current = saved;
      setRider(saved);
      savedSnap.current = riderEditSnapshot(saved);
      setDbSyncStatus('saved');
      if (!options?.silent) {
        showToast('✅ Rider sincronizado y guardado en Supabase');
      }

      if (currentSessionId && saved.id) {
        await chatService.linkRider(currentSessionId, saved.id);
      }

      const sessionQuery = currentSessionId ? `&session=${currentSessionId}` : '';
      const newUrl = `/artista/workspace?id=${saved.id}${sessionQuery}`;
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

  useEffect(() => {
    const snap = riderEditSnapshot(rider);
    if (savedSnap.current === null) {
      savedSnap.current = snap;
      return;
    }
    if (snap === savedSnap.current) return;
    saveEpoch.current += 1;
    const epoch = saveEpoch.current;
    const timer = window.setTimeout(() => {
      void handleSaveRider(undefined, { silent: true, epoch });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [rider]);

  const riderWithId = async (): Promise<Rider | null> => {
    const current = riderRef.current;
    if (isPersistedRiderId(current.id)) return current;
    return (await handleSaveRider(current, { silent: true })) ?? null;
  };

  const handleUploadDocumentImage = async (file: File): Promise<string | null> => {
    const current = riderRef.current;
    if (!isPersistedRiderId(current.id)) return null;
    try {
      const uploaded = await uploadRiderImage(file, 'gallery', current.id);
      return uploaded.url;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo subir la imagen');
      throw err;
    }
  };

  const handleAddMedia = async (file: File) => {
    try {
      const base = await riderWithId();
      if (!base?.id) return;
      if (base.media.length >= MAX_GALLERY_IMAGES) {
        showToast('El carrusel admite hasta 8 fotos');
        return;
      }
      const uploaded = await uploadRiderImage(file, 'gallery', base.id);
      const updated = new Rider(base);
      updated.addMedia(uploaded);
      riderRef.current = updated;
      setRider(updated);
      await handleSaveRider(updated, { silent: true });
      showToast('Foto agregada');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo subir la foto');
    }
  };

  const handleRemoveMedia = async (id: string) => {
    const updated = new Rider(riderRef.current);
    const pathname = updated.removeMedia(id);
    riderRef.current = updated;
    setRider(updated);
    await handleSaveRider(updated, { silent: true });
    if (pathname) void deleteRiderImage(pathname);
  };

  const handleMakeCover = async (id: string) => {
    const updated = new Rider(riderRef.current);
    updated.setCover(id);
    riderRef.current = updated;
    setRider(updated);
    await handleSaveRider(updated, { silent: true });
  };

  const handleUploadPlotPhoto = async (file: File) => {
    try {
      const base = await riderWithId();
      if (!base?.id) return;
      const previous = base.stagePlot.referenceImagePath;
      const uploaded = await uploadRiderImage(file, 'plot', base.id);
      const updated = new Rider(base);
      updated.setReferenceImage(uploaded.url, uploaded.pathname);
      riderRef.current = updated;
      setRider(updated);
      await handleSaveRider(updated, { silent: true });
      if (previous && previous !== uploaded.pathname) void deleteRiderImage(previous);
      showToast('Foto del plano guardada');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo subir la foto del plano');
      throw err;
    }
  };

  const handleRemovePlotPhoto = async () => {
    const updated = new Rider(riderRef.current);
    const pathname = updated.clearReferenceImage();
    riderRef.current = updated;
    setRider(updated);
    await handleSaveRider(updated, { silent: true });
    if (pathname) void deleteRiderImage(pathname);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const saved = await handleSaveRider(undefined, { silent: true });
      if (!saved?.id) return;

      const response = await fetch(`/api/riders/${saved.id}/share`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== 'string') {
        throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo generar el enlace');
      }
      setShareUrl(data.url);
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'No se pudo generar el enlace');
    } finally {
      setIsSharing(false);
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

  const handleStartAddSection = () => {
    setIsAddingSection(true);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      setMobileTab('sections');
    }
  };

  const handleAddSectionTitle = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const insertedId = bridgeRef.current?.insertSectionTitle(trimmed) ?? null;
    if (insertedId) {
      setActiveSectionId(insertedId);
      setIsAddingSection(false);
      setMobileTab('document');
      showToast('Nueva sección agregada');
      return;
    }
    const updated = new Rider({ ...rider });
    const section = updated.addSection({
      title: trimmed,
      subtitle: '',
      tag: 'Personalizado',
      tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
      iconName: 'fileText',
      content: '',
    }, activeSectionId);
    setRider(updated);
    setActiveSectionId(section.id);
    setIsAddingSection(false);
    setMobileTab('document');
    showToast('Nueva sección agregada');
    await handleSaveRider(updated);
  };

  // Editar el texto de una sección sin salir del documento
  const handleDocumentChange = (patches: SectionDocumentPatch[]) => {
    setRider((prev) => {
      const updated = new Rider({ ...prev });
      updated.syncSectionsFromDocument(patches);
      return updated;
    });
    setActiveSectionId((current) => {
      if (patches.some((patch) => patch.id === current)) return current;
      return patches[0]?.id || '';
    });
  };

  const documentSuggestions = useMemo(() => {
    const dismissed = new Set(dismissedGaps);
    const gaps = rider.sections.flatMap((section) => (
      buildGapSuggestions(section, dismissed, section.id === activeSectionId)
    ));
    const pending = agentSuggestions
      .filter((item) => item.status === 'pending' || item.status === 'stale')
      .map((suggestion) => {
        if (suggestion.status !== 'pending' || !suggestion.baseText) return suggestion;
        const section = rider.sections.find((item) => item.id === suggestion.sectionId);
        if ((section?.content || '').includes(suggestion.baseText)) return suggestion;
        return { ...suggestion, status: 'stale' as const };
      });
    return [...pending, ...gaps];
  }, [rider.sections, activeSectionId, dismissedGaps, agentSuggestions]);

  const dismissSuggestion = (suggestion: DocumentSuggestion) => {
    if (suggestion.source === 'gap') {
      setDismissedGaps((current) => current.includes(suggestion.id) ? current : [...current, suggestion.id]);
      return;
    }
    setAgentSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
  };

  const handleAcceptSuggestion = (id: string) => {
    const suggestion = documentSuggestions.find((item) => item.id === id);
    if (!suggestion || suggestion.status === 'stale') return;
    if (suggestion.kind === 'add_channel' && suggestion.channel) {
      const channel = suggestion.channel;
      setRider((prev) => {
        const updated = new Rider({ ...prev });
        updated.addChannel(channel.name, channel.mic, channel.stand);
        return updated;
      });
      dismissSuggestion(suggestion);
      showToast('Canal agregado a la Input List');
      return;
    }
    if (suggestion.kind === 'switch_type' && suggestion.riderType) {
      handleSelectRiderType(suggestion.riderType);
      dismissSuggestion(suggestion);
      return;
    }
    const applied = bridgeRef.current?.apply(suggestion) ?? false;
    if (!applied) {
      setAgentSuggestions((current) => current.map((item) => (
        item.id === id ? { ...item, status: 'stale' } : item
      )));
      showToast('La sugerencia ya no coincide con el texto');
      return;
    }
    dismissSuggestion(suggestion);
  };

  const handleRejectSuggestion = (id: string) => {
    const suggestion = documentSuggestions.find((item) => item.id === id);
    if (suggestion) dismissSuggestion(suggestion);
  };

  const handleFocusSuggestion = (id: string) => {
    const suggestion = documentSuggestions.find((item) => item.id === id);
    if (!suggestion) return;
    setActiveSectionId(suggestion.sectionId);
    bridgeRef.current?.focus(suggestion);
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
    setRider((prev) => {
      const updated = new Rider({ ...prev });
      const byId = new Map(prev.sections.map((section) => [section.id, section]));
      updated.reorderSections(newSections.map((section) => byId.get(section.id) || section));
      return updated;
    });
  };

  // Canales
  const handleUpdateChannel = (chId: string, field: keyof ChannelData, val: string | boolean) => {
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

  // Stage Plot
  const handleUpdateStagePlot = (newConfig: StagePlotConfig) => {
    setRider(prev => {
      const updated = new Rider({ ...prev });
      updated.updateStagePlot(newConfig);
      return updated;
    });
  };

  // Restablecer desde ceros
  const handleResetBlank = async () => {
    const ok = window.confirm(
      '¿Deseas empezar este rider completamente de ceros? Se vaciarán los contenidos de todas las secciones, el Input List y el plano de escenario (Stage Plot) para empezar un rider totalmente en blanco.'
    );
    if (!ok) return;

    const updated = new Rider({ ...rider });
    updated.resetFromScratch();
    setRider(updated);
    setIsAddingSection(false);
    setActiveSectionId('');

    showToast('🔄 Rider reiniciado en blanco desde ceros');
    await handleSaveRider(updated);
  };

  // Chat con Asistente
  const handleSendMessage = async (text: string, sectionId?: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = { sender: 'user', text, time: now };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsAgentThinking(true);
    const targetSectionId = sectionId || activeSectionId;
    if (sectionId) setActiveSectionId(sectionId);

    try {
      const section = rider.sections.find((item) => item.id === targetSectionId) || rider.sections[0];
      const editorContext: EditorContextPayload | undefined = section
        ? {
            sectionId: section.id,
            sectionTitle: section.title,
            sectionText: (section.content || '').slice(0, 7000),
            selection: selectionRef.current.sectionId === section.id ? selectionRef.current.text.slice(0, 1800) : '',
            gaps: documentSuggestions
              .filter((item) => item.source === 'gap' && item.sectionId === section.id)
              .map((item) => item.rationale),
          }
        : undefined;
      const data = await chatService.sendMessage({
        messages: updatedMessages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        riderType: rider.type,
        activeAgent,
        sessionId: currentSessionId || undefined,
        riderId: rider.id || undefined,
        editorContext,
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

      if (editorContext && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setAgentSuggestions((current) => [
          ...current,
          ...materializeSuggestions(data.suggestions || [], editorContext),
        ]);
        showToast('Sugerencia lista para revisar');
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

  const isBlankDocument = rider.sections.length === 0 && !rider.artistName.trim();

  const handleAskFromDocument = (text: string, sectionId?: string) => {
    if (text === '__outline__') {
      setRider((prev) => {
        const updated = new Rider({ ...prev });
        updated.applyTemplateOutline();
        if (updated.sections[0]) setActiveSectionId(updated.sections[0].id);
        return updated;
      });
      showToast('Estructura de títulos añadida al documento');
      return;
    }
    setIsChatCollapsed(false);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      setMobileTab('assistant');
    }
    void handleSendMessage(text, sectionId);
  };

  const handleOpenExportModal = (scope: ExportScope = 'master') => {
    setExportScope(scope);
    setShowExportModal(true);
  };

  const handleOpenStagePlot = () => {
    setShowStagePlotModal(true);
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
        moduleStats={rider.getModuleStats()}
        masterProgress={rider.getMasterProgress()}
        onSaveRider={handleSaveRider}
        isSaving={isSaving}
        dbSyncStatus={dbSyncStatus}
        onExport={() => handleOpenExportModal('master')}
        onOpenExportModal={handleOpenExportModal}
        onOpenStagePlot={handleOpenStagePlot}
        onShare={handleShare}
        isSharing={isSharing || isSaving}
        chatSessionId={currentSessionId}
        riderId={rider.id}
      />

      {/* Contenedor de Paneles: 3 columnas simultáneas en desktop (xl:), panel único en móvil/tablet */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Panel 1: Outline y navegación de secciones */}
        <div className={`h-full ${mobileTab === 'sections' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:flex-none xl:w-auto shrink-0`}>
          <SectionsNavPanel
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
            onOpenAddSection={handleStartAddSection}
            onAddSectionTitle={handleAddSectionTitle}
            isAddingSection={isAddingSection}
            onCancelAddSection={() => setIsAddingSection(false)}
            onApplyTemplateOutline={() => handleAskFromDocument('__outline__')}
            onResetBlank={handleResetBlank}
            progressPercent={rider.getProgress()}
            masterProgress={rider.getMasterProgress()}
            moduleStats={rider.getModuleStats()}
            onSaveRider={() => handleSaveRider()}
            isSaving={isSaving}
            dbSyncStatus={dbSyncStatus}
            riderType={rider.type}
            onSelectRiderType={handleSelectRiderType}
            commentCounts={sectionComments.reduce<Record<string, number>>((counts, comment) => {
              counts[comment.sectionId] = (counts[comment.sectionId] || 0) + 1;
              return counts;
            }, {})}
          />
        </div>

        {/* Panel 2: Editor visual del Documento */}
        <div className={`h-full min-w-0 flex-1 ${mobileTab === 'document' ? 'flex w-full' : 'hidden'} xl:flex`}>
          <DocumentEditorPanel
            riderTitle={rider.title}
            artistName={rider.artistName}
            season={rider.season}
            riderType={rider.type}
            sections={rider.sections}
            channels={rider.channels}
            completedSectionIds={rider.completedSectionIds}
            onToggleComplete={handleToggleComplete}
            onDeleteSection={handleDeleteSection}
            onReorderSections={handleReorderSections}
            onInsertSection={handleStartAddSection}
            onUploadDocumentImage={handleUploadDocumentImage}
            onImageError={showToast}
            isBlankDocument={isBlankDocument}
            isAssistantThinking={isAgentThinking}
            onAskAssistant={handleAskFromDocument}
            onDocumentChange={handleDocumentChange}
            onSelectionChange={(sectionId, text) => {
              selectionRef.current = { sectionId, text };
            }}
            suggestions={documentSuggestions}
            onRegisterBridge={(bridge) => {
              bridgeRef.current = bridge;
            }}
            activeSectionId={activeSectionId}
            onActivateSection={setActiveSectionId}
            onUpdateChannel={handleUpdateChannel}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
            onExport={() => handleOpenExportModal('master')}
            onOpenStagePlot={handleOpenStagePlot}
            onSaveRider={() => handleSaveRider()}
            isSaving={isSaving}
            dbSyncStatus={dbSyncStatus}
            onUpdateArtistName={handleUpdateTitle}
            onUpdateSeason={handleUpdateSeason}
            stagePlot={rider.stagePlot}
            onUpdateStagePlot={handleUpdateStagePlot}
            onUploadReferenceImage={handleUploadPlotPhoto}
            onRemoveReferenceImage={handleRemovePlotPhoto}
            media={rider.media}
            onAddMedia={handleAddMedia}
            onRemoveMedia={handleRemoveMedia}
            onMakeCover={handleMakeCover}
            mediaBusy={isSaving}
            sectionComments={sectionComments}
            openCommentSectionId={openCommentSectionId}
            onToggleSectionComments={(sectionId) => {
              setOpenCommentSectionId((current) => current === sectionId ? null : sectionId);
            }}
          />
        </div>

        {/* Panel 3: Copilot Asistente de IA */}
        <div className={`h-full ${mobileTab === 'assistant' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:flex-none ${isChatCollapsed ? 'xl:w-12' : 'xl:w-96'} shrink-0`}>
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
            suggestionMode
            suggestions={documentSuggestions.filter((item) => item.source !== 'gap')}
            sectionTitles={Object.fromEntries(rider.sections.map((section) => [section.id, section.title]))}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onFocusSuggestion={handleFocusSuggestion}
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
          <span className="text-[10px] leading-tight">Sugerencias</span>
        </button>
      </nav>

      <MasterExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        rider={rider}
        initialScope={exportScope}
        onShowToast={showToast}
      />

      <StagePlotModal
        isOpen={showStagePlotModal}
        onClose={() => setShowStagePlotModal(false)}
        artistName={rider.artistName}
        channels={rider.channels}
        riderTitle={rider.title}
        season={rider.season}
        stagePlot={rider.stagePlot}
        onUpdateStagePlot={handleUpdateStagePlot}
        onUploadReferenceImage={handleUploadPlotPhoto}
        onRemoveReferenceImage={handleRemovePlotPhoto}
      />

      <ShareLinkModal
        url={shareUrl}
        onClose={() => setShareUrl(null)}
        onNotify={showToast}
      />
    </div>
  );
}
