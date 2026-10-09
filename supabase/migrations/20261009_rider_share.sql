-- Enlace público de solo lectura. Seguro de ejecutar más de una vez.
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_riders_share_token ON public.riders (share_token) WHERE share_token IS NOT NULL;
