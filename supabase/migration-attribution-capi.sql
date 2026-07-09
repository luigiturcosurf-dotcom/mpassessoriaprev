-- MP Assessoria · Atribuição (UTM/fbclid/gclid) + status comercial + CAPI
-- Executar no SQL Editor do Supabase

ALTER TABLE public.quiz_leads
    ADD COLUMN IF NOT EXISTS utm_content TEXT,
    ADD COLUMN IF NOT EXISTS utm_term TEXT,
    ADD COLUMN IF NOT EXISTS fbclid TEXT,
    ADD COLUMN IF NOT EXISTS gclid TEXT,
    ADD COLUMN IF NOT EXISTS fbp TEXT,
    ADD COLUMN IF NOT EXISTS fbc TEXT,
    ADD COLUMN IF NOT EXISTS status_comercial TEXT NOT NULL DEFAULT 'Novo',
    ADD COLUMN IF NOT EXISTS meta_capi_enviado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_quiz_leads_status ON public.quiz_leads (status_comercial);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_fbclid ON public.quiz_leads (fbclid) WHERE fbclid IS NOT NULL;

-- Permite Apps Script (service role / secret) atualizar status via REST
GRANT UPDATE ON public.quiz_leads TO anon;
