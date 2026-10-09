-- ==============================================================================
-- RAIDER STUDIO - ATOMIC SUPABASE SCHEMA (Prepared Statement Compatible)
-- Ejecuta todo el esquema envuelto en un único comando atómico PL/pgSQL
-- ==============================================================================

DO $$ 
BEGIN
    -- 1. Extensión UUID
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 2. Tabla de Riders
    CREATE TABLE IF NOT EXISTS public.riders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID, -- Opcional: Vinculación con auth.users(id) para multi-tenancy
        title VARCHAR(255) NOT NULL,
        artist_name VARCHAR(255) NOT NULL,
        rider_type VARCHAR(50) NOT NULL DEFAULT 'tecnico',
        venue_name VARCHAR(255),
        event_date VARCHAR(100),
        version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        channels JSONB NOT NULL DEFAULT '[]'::jsonb,
        sections JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );

    CREATE INDEX IF NOT EXISTS idx_riders_updated_at ON public.riders (updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_riders_type ON public.riders (rider_type);
    CREATE INDEX IF NOT EXISTS idx_riders_user_id ON public.riders (user_id);

    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS share_token TEXT;
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_riders_share_token ON public.riders (share_token) WHERE share_token IS NOT NULL;

    CREATE TABLE IF NOT EXISTS public.rider_section_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
        section_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
        CONSTRAINT rider_section_comments_author_len CHECK (char_length(author_name) BETWEEN 1 AND 80),
        CONSTRAINT rider_section_comments_body_len CHECK (char_length(body) BETWEEN 1 AND 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_rider_section_comments_lookup
        ON public.rider_section_comments (rider_id, section_id, created_at);

    ALTER TABLE public.rider_section_comments ENABLE ROW LEVEL SECURITY;

    -- 3. Tabla de Sesiones de Chat
    CREATE TABLE IF NOT EXISTS public.chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID, -- Opcional: Vinculación con auth.users(id)
        rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'Consulta de Producción',
        active_agent VARCHAR(50) NOT NULL DEFAULT 'master',
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_rider_id ON public.chat_sessions (rider_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions (updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions (user_id);

    -- 4. Tabla de Mensajes de Chat
    CREATE TABLE IF NOT EXISTS public.chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        agent_role VARCHAR(50),
        role_name VARCHAR(100),
        role_avatar VARCHAR(20),
        content TEXT NOT NULL,
        actions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages (session_id, created_at ASC);

    -- 5. Habilitar Seguridad por Fila (Row Level Security - RLS)
    ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

    -- 6. Políticas de acceso (Preparadas para Demo y listas para producción con auth.uid())
    -- En producción con autenticación activa, reemplaza (true) por (auth.uid() = user_id OR user_id IS NULL)
    EXECUTE 'DROP POLICY IF EXISTS "Public Read Riders" ON public.riders';
    EXECUTE 'CREATE POLICY "Public Read Riders" ON public.riders FOR SELECT USING (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Public Insert Riders" ON public.riders';
    EXECUTE 'CREATE POLICY "Public Insert Riders" ON public.riders FOR INSERT WITH CHECK (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Public Update Riders" ON public.riders';
    EXECUTE 'CREATE POLICY "Public Update Riders" ON public.riders FOR UPDATE USING (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Public Delete Riders" ON public.riders';
    EXECUTE 'CREATE POLICY "Public Delete Riders" ON public.riders FOR DELETE USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Public Read Sessions" ON public.chat_sessions';
    EXECUTE 'CREATE POLICY "Public Read Sessions" ON public.chat_sessions FOR SELECT USING (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Public Insert Sessions" ON public.chat_sessions';
    EXECUTE 'CREATE POLICY "Public Insert Sessions" ON public.chat_sessions FOR INSERT WITH CHECK (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Public Update Sessions" ON public.chat_sessions';
    EXECUTE 'CREATE POLICY "Public Update Sessions" ON public.chat_sessions FOR UPDATE USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Public Delete Sessions" ON public.chat_sessions';
    EXECUTE 'CREATE POLICY "Public Delete Sessions" ON public.chat_sessions FOR DELETE USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Public Read Messages" ON public.chat_messages';
    EXECUTE 'CREATE POLICY "Public Read Messages" ON public.chat_messages FOR SELECT USING (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Public Insert Messages" ON public.chat_messages';
    EXECUTE 'CREATE POLICY "Public Insert Messages" ON public.chat_messages FOR INSERT WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Public Delete Messages" ON public.chat_messages';
    EXECUTE 'CREATE POLICY "Public Delete Messages" ON public.chat_messages FOR DELETE USING (true)';

    -- 7. Datos iniciales de prueba (Seed Rider)
    INSERT INTO public.riders (id, title, artist_name, rider_type, version, status, channels, sections)
    VALUES (
        'a1b2c3d4-e5f6-7890-abcd-111111111111',
        'Rider Técnico de Audio & Escenario',
        'SoundWave Live Band',
        'tecnico',
        'v1.0',
        'draft',
        '[
            {"id": "ch-1", "num": "01", "source": "Kick Drum In", "mic": "Shure Beta 91A", "stand": "Boundary", "phantom": false, "notes": "Compresor VCA rápido"},
            {"id": "ch-2", "num": "02", "source": "Kick Drum Out", "mic": "Audix D6 / Beta 52A", "stand": "Short Boom", "phantom": false, "notes": "Cuerpo subgrave 50Hz"},
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

END $$;
