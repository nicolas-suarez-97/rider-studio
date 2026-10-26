"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Toast } from '@/components/common/Toast';
import { Icon } from '@/components/common/Icon';
import { SectionsNavPanel } from '@/components/workspace/SectionsNavPanel';
import { DocumentEditorPanel } from '@/components/workspace/DocumentEditorPanel';
import { indexTransportAnswersByCardId } from '@/core/constants/transporte-terrestre';
import { transportStateFromAnswer, readStoredContra } from '@/lib/promotor/contra-rider';
import type { TransportContraState } from '@/lib/promotor/transport-contra';
import { AssistantChatPanel } from '@/components/workspace/AssistantChatPanel';
import { MasterExportModal } from '@/components/modals/MasterExportModal';
import { StagePlotModal } from '@/components/modals/StagePlotModal';
import { ShareLinkModal } from '@/components/modals/ShareLinkModal';
import { ImportRiderModal } from '@/components/modals/ImportRiderModal';
import { Rider } from '@/core/models/Rider';
import { riderService } from '@/core/services/rider.service';
import { chatService } from '@/core/services/chat.service';
import { RiderType, RiderDocumentTheme, SectionItem, ChannelData, ExportScope, StagePlotConfig } from '@/core/types/rider.types';
import { isRiderType, type TypeView } from '@/core/constants/rider-type-tokens';
import { countByType, filterSections } from '@/core/utils/type-view';
import { useTypeView } from '@/hooks/useTypeView';
import { AgentRole } from '@/core/types/agent.types';
import { ChatMessageItem } from '@/core/types/chat.types';
import { SectionCommentItem } from '@/lib/share/comments';
import { buildGapSuggestions, docToPlainText, isDocumentIntro, sectionsForOutline, type SectionDocumentPatch } from '@/core/editor/content-doc';
import { materializeSuggestions } from '@/core/editor/suggestions';
import { mergeAppliedDocumentSuggestions } from '@/core/editor/apply-block-correction';
import { chatReplyAfterDocumentApply, ensureChatDocumentSuggestions, planChatDocumentApply } from '@/core/editor/chat-document-sync';
import { confirmProposedOnSection, replaceActiveProposed } from '@/core/editor/proposed-confirmed';
import { REVIEW_HEADING, readReviewSuggestions } from '@/core/editor/review-message';
import { DocumentSuggestion, EditorContextPayload } from '@/core/types/suggestion.types';
import { EditorBridge, scrollSectionIntoCanvas } from '@/components/workspace/editor/RiderDocumentSurface';
import { AGENT_PROFILES } from '@/core/constants/agent-profiles';
import { RIDER_DATA } from '@/core/constants/rider-templates';
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
    documentTheme: current.documentTheme,
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
  const { typeView, setTypeView } = useTypeView();
  const typeViewRef = useRef(typeView);
  typeViewRef.current = typeView;
  const [pendingSectionType, setPendingSectionType] = useState<TypeView>('all');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rider, setRider] = useState<Rider>(() => new Rider(initialRiderData || { type: initialType }));
  const riderRef = useRef(rider);
  riderRef.current = rider;
  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    return initialRiderData?.sections?.[0]?.id || '';
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
  const [transportReviews, setTransportReviews] = useState<Record<string, TransportContraState>>({});

  // Estado de vista activa en dispositivos móviles (< 1280px)
  const [mobileTab, setMobileTab] = useState<MobileTab>('document');
  const [isAddingSection, setIsAddingSection] = useState(false);

  // Sincronizar rider si el usuario navega a un rider diferente desde URL
  useEffect(() => {
    const incomingId = initialRiderData?.id || '';
    if (incomingId !== riderRef.current.id) {
      const incoming = new Rider(initialRiderData || { type: initialType, sections: [] });
      setRider(incoming);
      riderRef.current = incoming;
      setActiveSectionId(incoming.sections[0]?.id || '');
      setCurrentSessionId(initialSessionId || null);
      setMessages(initialMessages || []);
      setAgentSuggestions([]);
      savedSnap.current = null;
    }
  }, [initialRiderData, initialSessionId, initialMessages, initialType]);

  const loadTransportReviews = useCallback(async (riderId: string) => {
    if (!isPersistedRiderId(riderId)) return;
    const response = await fetch(`/api/riders?id=${encodeURIComponent(riderId)}`);
    const data = await response.json().catch(() => ({}));
    const stored = readStoredContra(data.rider?.metadata);
    const byCard = indexTransportAnswersByCardId(stored.answers);
    const next: Record<string, TransportContraState> = {};
    for (const [cardId, answer] of Object.entries(byCard)) {
      next[cardId] = transportStateFromAnswer(answer);
    }
    setTransportReviews(next);
  }, []);

  useEffect(() => {
    const riderId = rider.id || '';
    if (isPersistedRiderId(riderId)) {
      void loadTransportReviews(riderId);
    }
  }, [rider.id, loadTransportReviews]);

  const handleTmDecision = useCallback(async (
    cardId: string,
    decision: 'aprobada' | 'rechazada' | 'requiere_ajustes' | 'reabrir',
  ) => {
    const riderId = riderRef.current.id || '';
    if (!isPersistedRiderId(riderId)) {
      setToastMessage('Guarda el rider para registrar la decisión del TM.');
      return;
    }
    const response = await fetch(`/api/riders/${riderId}/transport-review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToastMessage(typeof data.error === 'string' ? data.error : 'No se pudo registrar la decisión');
      return;
    }
    await loadTransportReviews(riderId);
  }, [loadTransportReviews]);

  // Modales
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('master');
  const [showStagePlotModal, setShowStagePlotModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sectionComments, setSectionComments] = useState<SectionCommentItem[]>([]);
  const [openCommentSectionId, setOpenCommentSectionId] = useState<string | null>(null);
  const [agentSuggestions, setAgentSuggestions] = useState<DocumentSuggestion[]>([]);
  const [dismissedGaps, setDismissedGaps] = useState<string[]>([]);
  const agentSuggestionsRef = useRef(agentSuggestions);
  agentSuggestionsRef.current = agentSuggestions;
  const applyingSectionIdsRef = useRef(new Set<string>());
  useEffect(() => {
    applyingSectionIdsRef.current.clear();
  }, [agentSuggestions]);
  const bridgeRef = useRef<EditorBridge | null>(null);
  const selectionRef = useRef({ sectionId: '', text: '' });
  const savedSnap = useRef<string | null>(null);
  const saveEpoch = useRef(0);

  // Chat & Sesión Asociada
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId);
  const [currentSessionTitle] = useState<string | null>(initialSessionTitle);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [incomingDraftPrompt, setIncomingDraftPrompt] = useState<{ text: string; id: number } | null>(null);

  const isFirstMount = useRef(true);
  const reviewStarted = useRef<string | null>(null);
  const reviewPublished = useRef<string | null>(null);
  const dismissedReviewIds = useRef(new Set<string>());
  const sessionIdRef = useRef(currentSessionId);
  sessionIdRef.current = currentSessionId;
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

  useEffect(() => {
    const stored = messages.flatMap((message) => readReviewSuggestions(message.actions));
    if (stored.length === 0) return;
    setAgentSuggestions((current) => {
      const ids = new Set(current.map((item) => item.id));
      const extra = stored.filter((item) => (
        item.status === 'pending' && !ids.has(item.id) && !dismissedReviewIds.current.has(item.id)
      ));
      return extra.length ? [...extra, ...current] : current;
    });
  }, [messages]);

  useEffect(() => {
    if (!isPersistedRiderId(rider.id)) return;
    if (messages.some((message) => message.text.includes(REVIEW_HEADING))) return;
    const sectionText = (section: SectionItem) => (
      (section.content || '').trim() || (section.contentDoc ? docToPlainText(section.contentDoc) : '')
    );
    const hasBody = rider.sections.some((section) => section.id !== 'doc-cover' && sectionText(section).trim());
    if (!hasBody || reviewStarted.current === rider.id) return;
    reviewStarted.current = rider.id;

    setIsChatCollapsed(false);
    setMobileTab('assistant');
    setIsAgentThinking(true);
    const sections = rider.sections.map((section) => ({
      id: section.id,
      title: section.title,
      content: sectionText(section).slice(0, 1800),
    }));
    const sessionAtStart = sessionIdRef.current;

    fetch('/api/riders/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        riderId: rider.id,
        sessionId: sessionAtStart,
        title: rider.title,
        sections,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data?.ok || typeof data.message !== 'string') return;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => (
          prev.some((message) => message.text.includes(REVIEW_HEADING))
            ? prev
            : [...prev, {
                sender: 'ai' as const,
                text: data.message,
                time: now,
                role: 'master' as const,
                roleName: 'Master Production Copilot',
                roleAvatar: '🧠',
                actions: [{ kind: 'rider-review', suggestions: Array.isArray(data.suggestions) ? data.suggestions : [] }],
              }]
        ));
        if (Array.isArray(data.suggestions)) {
          setAgentSuggestions((current) => {
            const ids = new Set(current.map((item) => item.id));
            const extra = (data.suggestions as DocumentSuggestion[]).filter((item) => item?.id && !ids.has(item.id));
            return extra.length ? [...extra, ...current] : current;
          });
        }
        if (typeof data.sessionId === 'string' && data.sessionId !== sessionIdRef.current) {
          setCurrentSessionId(data.sessionId);
        }
        reviewPublished.current = rider.id;
      })
      .catch((error) => {
        console.warn('[Workspace] No se pudo revisar el rider:', error);
        reviewStarted.current = null;
      })
      .finally(() => {
        setIsAgentThinking(false);
      });
  }, [rider.id, rider.sections, rider.title, messages]);

  useEffect(() => {
    if (!isPersistedRiderId(rider.id) || reviewPublished.current === rider.id) return;
    const review = messages.find((message) => message.text.includes(REVIEW_HEADING));
    if (!review) return;
    reviewPublished.current = rider.id;
    const suggestions = readReviewSuggestions(review.actions);
    void fetch('/api/riders/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        riderId: rider.id,
        sessionId: currentSessionId,
        message: review.text,
        suggestions,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data?.sessionId === 'string' && data.sessionId !== currentSessionId) {
          setCurrentSessionId(data.sessionId);
        }
      })
      .catch(() => {
        reviewPublished.current = null;
      });
  }, [rider.id, messages, currentSessionId]);

  const handleSelectTypeView = (next: TypeView) => {
    setTypeView(next);
    if (next === 'hospitality') setActiveAgent('hospitality');
    else if (next === 'seguridad') setActiveAgent('security');
    else if (next === 'tecnico') setActiveAgent('audio_foh');
  };

  // Crear un nuevo rider en blanco sin secciones prellenadas
  const handleNewRider = useCallback(() => {
    const blank = Rider.createBlank(rider.type || initialType);
    setRider(blank);
    riderRef.current = blank;
    setActiveSectionId('');
    setCurrentSessionId(null);
    setMessages([]);
    setAgentSuggestions([]);
    savedSnap.current = null;
    saveEpoch.current += 1;
    router.replace(`/artista/workspace?type=${rider.type || initialType}`);
    showToast('✨ Nuevo rider en blanco listo');
  }, [rider.type, initialType, router, showToast]);

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
    const base = await riderWithId();
    if (!base?.id) return null;
    try {
      const uploaded = await uploadRiderImage(file, 'gallery', base.id);
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

  const handleThemeChange = (documentTheme: RiderDocumentTheme) => {
    setRider(prev => new Rider({ ...prev, documentTheme }));
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

  const handleStartAddSection = (type?: TypeView) => {
    if (type && type !== 'all') setPendingSectionType(type);
    else if (isRiderType(typeView)) setPendingSectionType(typeView);
    else setPendingSectionType('all');
    setIsAddingSection(true);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      setMobileTab('sections');
    }
  };

  const handleAddSectionTitle = async (title: string, suggestedId?: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const insertedId = bridgeRef.current?.insertSectionTitle(trimmed, suggestedId) ?? null;
    if (insertedId) {
      setActiveSectionId(insertedId);
      setIsAddingSection(false);
      setMobileTab('document');
      showToast('Nueva sección agregada');
      return;
    }
    const baseMatch = Object.values(RIDER_DATA)
      .flatMap((d) => d.sections)
      .find((s) => s.title.trim().toLowerCase() === trimmed.toLowerCase());
    const updated = new Rider({ ...rider });
    const sectionType = isRiderType(pendingSectionType) ? pendingSectionType : rider.type;
    const section = updated.addSection({
      title: trimmed,
      subtitle: baseMatch?.subtitle || '',
      tag: baseMatch?.tag || 'Personalizado',
      tagColor: baseMatch?.tagColor || 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
      iconName: baseMatch?.iconName || 'fileText',
      content: '',
      type: sectionType,
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
      const view = typeViewRef.current;
      const visibleIds = new Set(filterSections(prev.sections, view, prev.type).map((section) => section.id));
      const retainIds = view === 'all'
        ? undefined
        : prev.sections.filter((section) => !visibleIds.has(section.id)).map((section) => section.id);
      const proposedIds = new Set(
        agentSuggestionsRef.current
          .filter((item) => item.status === 'applied' && item.sectionId)
          .map((item) => item.sectionId)
      );
      for (const id of applyingSectionIdsRef.current) proposedIds.add(id);
      const confirmedPatches = patches.map((patch) => {
        if (!proposedIds.has(patch.id)) return patch;
        const existing = prev.sections.find((section) => section.id === patch.id);
        if (!existing) {
          return { ...patch, content: '', contentDoc: undefined };
        }
        return { ...patch, content: existing.content || '', contentDoc: existing.contentDoc };
      });
      updated.syncSectionsFromDocument(confirmedPatches, {
        retainIds,
        defaultType: isRiderType(view) ? view : prev.type,
      });
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
    const livingIds = new Set(rider.sections.map((section) => section.id));
    const pending = agentSuggestions
      .filter((item) => {
        if (!(item.status === 'pending' || item.status === 'applied' || item.status === 'stale')) return false;
        if (!item.sectionId || item.kind === 'add_section') return true;
        return livingIds.has(item.sectionId);
      })
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
    dismissedReviewIds.current.add(suggestion.id);
    setAgentSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
  };

  const handleAcceptSuggestion = (id: string) => {
    const suggestion = documentSuggestions.find((item) => item.id === id);
    if (!suggestion || suggestion.status === 'stale') return;

    if (suggestion.status === 'applied') {
      if (suggestion.sectionId && suggestion.kind !== 'switch_theme' && suggestion.kind !== 'switch_type' && suggestion.kind !== 'add_channel') {
        setRider((prev) => {
          const updated = new Rider({ ...prev });
          const section = updated.sections.find((item) => item.id === suggestion.sectionId);
          if (section) {
            const confirmed = confirmProposedOnSection(section, suggestion);
            updated.updateSection(section.id, {
              content: confirmed.content,
              contentDoc: confirmed.contentDoc,
            });
          }
          return updated;
        });
      }
      bridgeRef.current?.accept(suggestion);
    } else if (suggestion.status === 'pending') {
      if (suggestion.kind === 'add_channel' && suggestion.channel) {
        const channel = suggestion.channel;
        setRider((prev) => {
          const updated = new Rider({ ...prev });
          updated.addChannel(channel.name, channel.mic, channel.stand);
          return updated;
        });
      } else if (suggestion.kind === 'switch_type' && suggestion.riderType) {
        handleSelectTypeView(suggestion.riderType);
      } else if (suggestion.kind === 'switch_theme' && suggestion.theme) {
        handleThemeChange(suggestion.theme);
      } else if (suggestion.kind === 'add_section' && suggestion.newSectionTitle) {
        void handleAddSectionTitle(suggestion.newSectionTitle);
      } else {
        const applied = bridgeRef.current?.apply(suggestion);
        if (!applied?.success) {
          setAgentSuggestions((current) => current.map((item) => (
            item.id === id ? { ...item, status: 'stale' } : item
          )));
          showToast('La sugerencia ya no coincide con el texto');
          return;
        }
        if (applied.oldRange) {
          bridgeRef.current?.accept({ ...suggestion, oldRange: applied.oldRange });
        }
      }
    }

    dismissSuggestion(suggestion);
    showToast('✅ Modificación aprobada y guardada en el documento');
  };

  const handleRejectSuggestion = (id: string) => {
    const suggestion = documentSuggestions.find((item) => item.id === id);
    if (!suggestion) return;

    if (suggestion.status === 'applied') {
      if (suggestion.kind === 'switch_theme' && suggestion.baseText) {
        handleThemeChange(suggestion.baseText as RiderDocumentTheme);
      } else if (suggestion.kind === 'add_section' && suggestion.sectionId) {
        const updated = new Rider({ ...riderRef.current });
        updated.deleteSection(suggestion.sectionId);
        setRider(updated);
      } else if (suggestion.kind === 'add_channel' && suggestion.channel) {
        const ch = riderRef.current.channels.find(
          (c) => c.name === suggestion.channel?.name || c.mic === suggestion.channel?.mic
        );
        if (ch) handleDeleteChannel(ch.id);
      } else {
        bridgeRef.current?.revert(suggestion);
      }
    }

    dismissSuggestion(suggestion);
    showToast('↩️ Modificación rechazada y revertida');
  };

  const acceptRef = useRef(handleAcceptSuggestion);
  const rejectRef = useRef(handleRejectSuggestion);
  acceptRef.current = handleAcceptSuggestion;
  rejectRef.current = handleRejectSuggestion;

  useEffect(() => {
    const onAccept = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id) acceptRef.current(detail.id);
    };
    const onReject = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id) rejectRef.current(detail.id);
    };
    window.addEventListener('rider:accept-suggestion', onAccept);
    window.addEventListener('rider:reject-suggestion', onReject);
    return () => {
      window.removeEventListener('rider:accept-suggestion', onAccept);
      window.removeEventListener('rider:reject-suggestion', onReject);
    };
  }, []);

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
    for (const suggestion of agentSuggestions) dismissedReviewIds.current.add(suggestion.id);
    for (const suggestion of messages.flatMap((message) => readReviewSuggestions(message.actions))) {
      dismissedReviewIds.current.add(suggestion.id);
    }
    setAgentSuggestions([]);
    setDismissedGaps([]);
    reviewStarted.current = null;
    reviewPublished.current = null;

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
      const blockRefs = rider.sections.map((item) => ({ id: item.id, title: item.title }));
      const editorContext: EditorContextPayload = {
        sectionId: section?.id || '',
        sectionTitle: section?.title || '',
        sectionText: (
          (section?.content || '').trim()
          || (section?.contentDoc ? docToPlainText(section.contentDoc) : '')
        ).slice(0, 7000),
        selection: section && selectionRef.current.sectionId === section.id
          ? selectionRef.current.text.slice(0, 1800)
          : '',
        gaps: documentSuggestions
          .filter((item) => item.source === 'gap' && item.sectionId === (section?.id || ''))
          .map((item) => (item.rationale || '').slice(0, 200))
          .filter(Boolean),
        allSections: blockRefs,
        riderTitle: rider.title,
        artistName: rider.artistName,
        currentTheme: rider.documentTheme,
      };
      let data: Awaited<ReturnType<typeof chatService.sendMessage>> | null = null;
      let requestFailed = false;
      try {
        data = await chatService.sendMessage({
          messages: updatedMessages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
            isError: m.isError,
          })),
          riderType: rider.type,
          activeAgent,
          sessionId: currentSessionId || undefined,
          riderId: rider.id || undefined,
          editorContext,
        });
      } catch (sendError) {
        console.error(sendError);
        requestFailed = true;
      }

      if (data?.sessionId && data.sessionId !== currentSessionId) {
        setCurrentSessionId(data.sessionId);
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('session', data.sessionId);
        router.replace(currentUrl.pathname + currentUrl.search);
      }

      const priorAssistant = [...messages].reverse().find((item) => item.sender === 'ai');
      const priorAssistantText = priorAssistant?.text || '';
      const synced = ensureChatDocumentSuggestions({
        userText: text,
        priorAssistantText,
        priorAssistantIsError: Boolean(priorAssistant?.isError),
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
        sections: blockRefs,
        activeSectionId: targetSectionId || editorContext.sectionId,
      });

      const appliedItems: DocumentSuggestion[] = [];
      const failures: string[] = [];

      if (synced.suggestions.length > 0) {
        const drafts = replaceActiveProposed([], materializeSuggestions(synced.suggestions, editorContext)).next;
        const { superseded } = replaceActiveProposed(agentSuggestionsRef.current, drafts);
        for (const previous of superseded) {
          if (previous.status !== 'applied') continue;
          if (previous.kind === 'switch_theme' && previous.baseText) {
            handleThemeChange(previous.baseText as RiderDocumentTheme);
          } else if (previous.kind === 'add_section' && previous.sectionId) {
            const updated = new Rider({ ...riderRef.current });
            updated.deleteSection(previous.sectionId);
            setRider(updated);
          } else if (previous.kind === 'add_channel' && previous.channel) {
            const ch = riderRef.current.channels.find(
              (c) => c.name === previous.channel?.name || c.mic === previous.channel?.mic
            );
            if (ch) handleDeleteChannel(ch.id);
          } else {
            const reverted = bridgeRef.current?.revert(previous);
            if (!reverted) {
              bridgeRef.current?.revert({
                ...previous,
                appliedRange: undefined,
                oldRange: undefined,
              });
            }
          }
        }
        for (const draft of drafts) {
          if (draft.sectionId) applyingSectionIdsRef.current.add(draft.sectionId);
        }
        try {
        for (const draft of drafts) {
          if (draft.kind === 'switch_theme' && draft.theme) {
            draft.baseText = rider.documentTheme;
            handleThemeChange(draft.theme);
            draft.applied = true;
            draft.status = 'applied';
            appliedItems.push(draft);
            continue;
          }
          if (draft.kind === 'switch_type' && draft.riderType) {
            handleSelectTypeView(draft.riderType);
            draft.applied = true;
            draft.status = 'applied';
            appliedItems.push(draft);
            continue;
          }
          if (draft.kind === 'add_channel' && draft.channel) {
            const ch = draft.channel;
            setRider((prev) => {
              const updated = new Rider({ ...prev });
              updated.addChannel(ch.name, ch.mic, ch.stand);
              return updated;
            });
            draft.applied = true;
            draft.status = 'applied';
            appliedItems.push(draft);
            continue;
          }

          const plan = planChatDocumentApply({
            draft,
            sections: blockRefs,
            activeSectionId: targetSectionId || editorContext.sectionId,
          });

          if (plan.action === 'fail') {
            failures.push(plan.error || 'No pude aplicar el cambio al documento.');
            continue;
          }

          if (plan.action === 'create_section') {
            const newTitle = plan.newSectionTitle || draft.newSectionTitle || 'Nueva Sección';
            if (!bridgeRef.current) {
              failures.push('No pude actualizar el editor. Recarga e inténtalo de nuevo. El resto de apartados se mantiene.');
              continue;
            }
            const insertedId = bridgeRef.current.insertSectionTitle(newTitle, plan.sectionId);
            if (!insertedId) {
              failures.push('No pude crear el bloque en el documento. El resto de apartados se mantiene.');
              continue;
            }
            draft.sectionId = insertedId;
            draft.newSectionTitle = newTitle;
            applyingSectionIdsRef.current.add(insertedId);
            draft.applied = true;
            draft.status = 'applied';
            setActiveSectionId(insertedId);
            if (draft.proposedText && draft.proposedText !== newTitle) {
              const res = bridgeRef.current.apply({
                ...draft,
                sectionId: insertedId,
                kind: 'insert',
                baseText: '',
              });
              if (res?.appliedRange) draft.appliedRange = res.appliedRange;
              if (!res?.success) {
                failures.push('Creé el bloque, pero no pude insertar el contenido. El resto de apartados se mantiene.');
              }
            }
            appliedItems.push(draft);
            continue;
          }

          if (plan.sectionId) {
            draft.sectionId = plan.sectionId;
            applyingSectionIdsRef.current.add(plan.sectionId);
            setActiveSectionId(plan.sectionId);
            setTimeout(() => {
              bridgeRef.current?.scrollToSection(plan.sectionId);
            }, 40);
          }

          if (!bridgeRef.current) {
            failures.push('No pude actualizar el editor. Recarga e inténtalo de nuevo. El resto de apartados se mantiene.');
            continue;
          }

          const res = bridgeRef.current.apply(draft);
          if (res?.success) {
            draft.applied = true;
            draft.status = 'applied';
            draft.appliedRange = res.appliedRange;
            draft.oldRange = res.oldRange;
            appliedItems.push(draft);
          } else {
            failures.push('No pude insertar el contenido en el bloque indicado. El resto de apartados se mantiene.');
          }
        }
        } catch (applyError) {
          console.error(applyError);
          failures.push('No pude insertar el contenido en el bloque indicado. El resto de apartados se mantiene.');
        }
      }

      const applied = appliedItems.length > 0;
      const serviceErrorText = data?.notice && !data?.message
        ? data.notice
        : (data?.message || '⚠️ No se pudo obtener una respuesta del servicio de IA en este momento. Por favor, vuelve a intentar.');
      const reply = chatReplyAfterDocumentApply({
        aiText: synced.error
          || data?.message
          || (data?.isError || requestFailed
            ? serviceErrorText
            : 'Entendido. Procesando requerimiento de escenario.'),
        isError: Boolean((data?.isError || requestFailed) && !applied && !synced.error),
        applied,
      });

      let finalText = !applied && synced.error ? synced.error : reply.text;
      if (failures.length > 0) {
        finalText = `${finalText}\n\n⚠️ ${failures.join(' ')}`;
      }

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isError = !applied && (reply.isError || Boolean(synced.error));
      setMessages((prev) => [...prev, {
        sender: 'ai',
        text: finalText,
        time: replyTime,
        role: activeAgent,
        roleName: data?.roleName || AGENT_PROFILES[activeAgent].name,
        roleAvatar: data?.roleAvatar || (isError ? '⚠️' : activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠'),
        isError,
        retryPrompt: isError && !synced.error ? text : undefined,
      }]);

      if (applied) {
        setAgentSuggestions((current) => replaceActiveProposed(current, appliedItems).next);
        showToast('✨ Modificación aplicada en el documento');
      } else {
        applyingSectionIdsRef.current.clear();
        if (synced.error) {
          showToast(synced.error);
        } else if (failures.length > 0) {
          showToast(failures.join(' '));
        }
      }
    } catch (err) {
      console.error(err);
      const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: '⚠️ No se pudo obtener una respuesta del servicio de IA en este momento. Por favor, vuelve a intentar.',
          time: errTime,
          role: activeAgent,
          roleName: AGENT_PROFILES[activeAgent].name,
          roleAvatar: '⚠️',
          isError: true,
          retryPrompt: text
        }
      ]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const typeViewCounts = countByType(rider.sections, rider.type);
  const visibleSections = filterSections(rider.sections, typeView, rider.type);
  const outlineSections = sectionsForOutline(visibleSections);
  const introHasContent = rider.sections.some((section) => isDocumentIntro(section.id) && Boolean((section.content || '').trim()));
  const isBlankDocument = sectionsForOutline(rider.sections).length === 0 && !rider.artistName.trim() && !introHasContent;

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

  const handleDraftWithSelection = useCallback((selectedText: string, sectionId?: string, mode?: 'quote' | 'adjust' | 'analyze') => {
    if (!selectedText.trim()) return;
    setIsChatCollapsed(false);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) {
      setMobileTab('assistant');
    }
    const targetSectionId = sectionId || activeSectionId;
    setActiveSectionId(targetSectionId);
    selectionRef.current = { sectionId: targetSectionId, text: selectedText };

    const clean = selectedText.replace(/\s+/g, ' ').trim();
    let draft = `Sobre "${clean}": `;
    if (mode === 'adjust') {
      draft = `Modificar "${clean}": `;
    } else if (mode === 'analyze') {
      draft = `Analizar "${clean}": `;
    }

    setIncomingDraftPrompt({
      text: draft,
      id: Date.now(),
    });
  }, [activeSectionId]);

  const handleOpenExportModal = (scope: ExportScope = 'master') => {
    setExportScope(scope);
    setShowExportModal(true);
  };

  const handleOpenStagePlot = () => {
    setShowStagePlotModal(true);
  };

  const handleImportSuccess = ({
    riderData,
    welcomeMessage,
    suggestions = [],
  }: {
    riderData: ConstructorParameters<typeof Rider>[0];
    welcomeMessage: string;
    suggestions: DocumentSuggestion[];
  }) => {
    const incomingRider = new Rider({
      ...riderData,
      id: rider.id || undefined,
    });
    setRider(incomingRider);
    riderRef.current = incomingRider;

    const firstSectionId =
      incomingRider.sections[0]?.id ||
      'doc-cover';
    setActiveSectionId(firstSectionId);

    if (incomingRider.type === 'tecnico') setActiveAgent('audio_foh');
    else if (incomingRider.type === 'hospitality') setActiveAgent('hospitality');
    else if (incomingRider.type === 'seguridad') setActiveAgent('security');

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const aiMsg: ChatMessageItem = {
      sender: 'ai',
      text: welcomeMessage,
      time: now,
      role: 'master',
      roleName: 'Master Production Copilot',
      roleAvatar: '🧠',
      actions: [{ kind: 'rider-review', suggestions }],
    };
    setMessages((prev) => [...prev, aiMsg]);

    if (suggestions.length > 0) {
      setAgentSuggestions(suggestions);
    }

    setIsChatCollapsed(false);
    setMobileTab('assistant');

    showToast(`🎉 ¡Rider de "${incomingRider.artistName || 'Artista'}" importado y analizado con éxito!`);
  };

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans antialiased relative">
      <Toast message={toastMessage} />

      <Header
        pageType="workspace"
        typeView={typeView}
        typeViewCounts={typeViewCounts}
        onSelectTypeView={handleSelectTypeView}
        onAddSectionOfType={handleStartAddSection}
        onSaveRider={handleSaveRider}
        isSaving={isSaving}
        dbSyncStatus={dbSyncStatus}
        onExport={() => handleOpenExportModal('master')}
        onOpenExportModal={handleOpenExportModal}
        onOpenImportModal={() => setShowImportModal(true)}
        onNewRider={handleNewRider}
        onOpenStagePlot={handleOpenStagePlot}
        onShare={handleShare}
        isSharing={isSharing || isSaving}
        chatSessionId={currentSessionId}
        riderId={rider.id}
        documentTitle={rider.title}
        onDocumentTitleChange={(title) => setRider((prev) => new Rider({ ...prev, title }))}
      />

      {/* Contenedor de Paneles: 3 columnas simultáneas en desktop (xl:), panel único en móvil/tablet */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Panel 1: Outline y navegación de secciones */}
        <div className={`h-full ${mobileTab === 'sections' ? 'flex flex-1 w-full' : 'hidden'} xl:flex xl:flex-none xl:w-auto shrink-0`}>
          <SectionsNavPanel
            sections={outlineSections}
            onReorderSections={handleReorderSections}
            activeSectionId={activeSectionId}
            onSelectSection={(id) => {
              setActiveSectionId(id);
              // Al tocar una sección en móvil, cambiar automáticamente al documento y hacer scroll
              setMobileTab('document');
              setTimeout(() => {
                if (bridgeRef.current?.scrollToSection) bridgeRef.current.scrollToSection(id);
                else scrollSectionIntoCanvas(id);
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
            riderType={isRiderType(typeView) ? typeView : rider.type}
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
            documentTheme={rider.documentTheme}
            version={rider.version}
            onThemeChange={handleThemeChange}
            sections={visibleSections}
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
            onDraftWithSelection={handleDraftWithSelection}
            onOpenImportModal={() => setShowImportModal(true)}
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
            transportReviews={transportReviews}
            onTmDecision={handleTmDecision}
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
            incomingDraft={incomingDraftPrompt}
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

      <ImportRiderModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
