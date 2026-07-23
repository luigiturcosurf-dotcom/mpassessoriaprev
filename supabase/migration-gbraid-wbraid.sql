-- MP Assessoria · Google Ads click IDs (iOS / Privacy Sandbox)
-- Executar no SQL Editor do Supabase

ALTER TABLE public.quiz_leads
    ADD COLUMN IF NOT EXISTS gbraid TEXT,
    ADD COLUMN IF NOT EXISTS wbraid TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_leads_gclid ON public.quiz_leads (gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_leads_gbraid ON public.quiz_leads (gbraid) WHERE gbraid IS NOT NULL;
