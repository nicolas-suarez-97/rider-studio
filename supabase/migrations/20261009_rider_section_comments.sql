-- Comentarios por sección del enlace compartido. Seguro de ejecutar más de una vez.
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
