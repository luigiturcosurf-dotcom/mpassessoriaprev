-- MP Assessoria · Quiz v2 — auditoria de eventos Meta (Lead / LeadDesqualificado)
-- Executar no SQL Editor do Supabase

ALTER TABLE public.quiz_leads
    ADD COLUMN IF NOT EXISTS evento_meta TEXT,
    ADD COLUMN IF NOT EXISTS meta_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_leads_evento_meta
    ON public.quiz_leads (evento_meta)
    WHERE evento_meta IS NOT NULL;
