-- ==============================================================================
-- RAIDER STUDIO - SUPABASE DATABASE SCHEMA
-- Compatible with Supabase Postgres (Free Tier)
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. RIDERS TABLE (Main technical riders & hospitality specifications)
CREATE TABLE IF NOT EXISTS public.riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    rider_type VARCHAR(50) NOT NULL DEFAULT 'tecnico', -- 'tecnico', 'hospitality', 'seguridad', 'completo'
    venue_name VARCHAR(255),
    event_date VARCHAR(100),
    version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'review', 'approved', 'published'
    channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_riders_updated_at ON public.riders (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_riders_type ON public.riders (rider_type);

-- 3. CHAT SESSIONS TABLE (Conversations linked to riders or general consultations)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Consulta de Producción',
    active_agent VARCHAR(50) NOT NULL DEFAULT 'master', -- 'master', 'audio_foh', 'hospitality', 'security'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_rider_id ON public.chat_sessions (rider_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions (updated_at DESC);

-- 4. CHAT MESSAGES TABLE (Individual messages and actions executed by AI agents)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    agent_role VARCHAR(50), -- 'master', 'audio_foh', 'hospitality', 'security'
    role_name VARCHAR(100),
    role_avatar VARCHAR(20),
    content TEXT NOT NULL,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages (session_id, created_at ASC);

-- 5. FUNCTION & TRIGGER: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_riders_updated_at ON public.riders;
CREATE TRIGGER set_riders_updated_at
    BEFORE UPDATE ON public.riders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER set_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. ROW LEVEL SECURITY (RLS) - Permissive for initial setup / API route proxying
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow read/write via anon key / backend API
CREATE POLICY "Public Read Riders" ON public.riders FOR SELECT USING (true);
CREATE POLICY "Public Insert Riders" ON public.riders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Riders" ON public.riders FOR UPDATE USING (true);
CREATE POLICY "Public Delete Riders" ON public.riders FOR DELETE USING (true);

CREATE POLICY "Public Read Sessions" ON public.chat_sessions FOR SELECT USING (true);
CREATE POLICY "Public Insert Sessions" ON public.chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Sessions" ON public.chat_sessions FOR UPDATE USING (true);

CREATE POLICY "Public Read Messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Public Insert Messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- 7. STORAGE BUCKET FOR RIDER ASSETS (Stage plots, logos, PDF riders)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rider-media', 'rider-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Storage Read" ON storage.objects FOR SELECT USING (bucket_id = 'rider-media');
CREATE POLICY "Public Storage Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rider-media');

-- 8. INITIAL SEED DATA (Default reference riders)
INSERT INTO public.riders (id, title, artist_name, rider_type, version, status, channels, sections)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    'Rider Técnico de Audio & Escenario',
    'SoundWave Live Band',
    'tecnico',
    'v1.0',
    'draft',
    '[
        {"id": "ch-1", "num": "01", "source": "Kick Drum In", "mic": "Shure Beta 91A", "stand": "Boundary", "phantom": false, "notes": "Compresor VCA r ápido"},
        {"id": "ch-2", "num": "02", "source": "Kick Drum Out", "mic": "Audix D6 / Shure Beta 52A", "stand": "Short Boom", "phantom": false, "notes": "Cuerpo subgrave 50Hz"},
        {"id": "ch-3", "num": "03", "source": "Snare Top", "mic": "Shure SM57", "stand": "Short Boom", "phantom": false, "notes": "Cápsula calibrada"},
        {"id": "ch-4", "num": "04", "source": "Snare Bottom", "mic": "Sennheiser e604", "stand": "Clip Rim", "phantom": false, "notes": "Invertir polaridad 180°"},
        {"id": "ch-5", "num": "05", "source": "Hi-Hat", "mic": "AKG C451 B", "stand": "Boom", "phantom": true, "notes": "HPF @ 350Hz"},
        {"id": "ch-6", "num": "06", "source": "Bass DI", "mic": "Radial J48", "stand": "Direct Box", "phantom": true, "notes": "Línea limpia pre-amp"},
        {"id": "ch-7", "num": "07", "source": "Lead Vocal", "mic": "Shure KSM9 / SM58", "stand": "Tall Boom", "phantom": true, "notes": "Voz principal centro"}
    ]'::jsonb,
    '[
        {"id": "sec-1", "num": "01", "title": "Info General & Contactos Clave", "subtitle": "FOH Engineer, Stage Manager & Crew", "tag": "Producción", "tagColor": "bg-slate-100 text-slate-700", "iconName": "users", "content": "FOH Sound Engineer: Mateo Rincón (+57 300 123 4567 • foh@soundwave.com)\nStage Manager & Backline: Carla Mendoza (+57 310 987 6543 • stage@soundwave.com)"},
        {"id": "sec-2", "num": "02", "title": "Sistema de PA & Consola FOH", "subtitle": "Cobertura estéreo 110 dB SPL continuos", "tag": "Acústica", "tagColor": "bg-zinc-100 text-zinc-600", "iconName": "speaker", "content": "Marcas Aprobadas: L-Acoustics (K1 / K2), d&b audiotechnik (GSL / KSL) o Meyer Sound.\nConsola FOH: DiGiCo Quantum 338 o Avid Venue S6L-24D con tarjeta Dante."}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
