-- MP Assessoria · Leads dos formulários das LPs
-- Executar no SQL Editor do Supabase: https://supabase.com/dashboard

CREATE TABLE IF NOT EXISTS public.quiz_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_id TEXT NOT NULL,
    lp_slug TEXT NOT NULL,
    beneficio TEXT NOT NULL,
    resultado TEXT NOT NULL CHECK (resultado IN (
        'qualified', 'qualified-soft', 'disqualified',
        'whatsapp-direct', 'quiz-iniciado'
    )),
    motivo_desqualificacao TEXT,
    respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    fbclid TEXT,
    gclid TEXT,
    gbraid TEXT,
    wbraid TEXT,
    fbp TEXT,
    fbc TEXT,
    status_comercial TEXT NOT NULL DEFAULT 'Novo',
    meta_capi_enviado_em TIMESTAMPTZ,
    clicou_whatsapp BOOLEAN NOT NULL DEFAULT false,
    clicou_whatsapp_em TIMESTAMPTZ,
    nome TEXT,
    telefone TEXT,
    email TEXT
);

CREATE INDEX IF NOT EXISTS idx_quiz_leads_created_at ON public.quiz_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_beneficio ON public.quiz_leads (beneficio);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_lp_slug ON public.quiz_leads (lp_slug);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_session_id ON public.quiz_leads (session_id);

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

GRANT INSERT, UPDATE ON public.quiz_leads TO anon;
GRANT SELECT ON public.quiz_leads TO authenticated;

DROP POLICY IF EXISTS "anon_insert_quiz_leads" ON public.quiz_leads;
CREATE POLICY "anon_insert_quiz_leads"
    ON public.quiz_leads FOR INSERT TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quiz_leads" ON public.quiz_leads;
CREATE POLICY "anon_update_quiz_leads"
    ON public.quiz_leads FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- Leitura apenas autenticada (dashboard interno)
DROP POLICY IF EXISTS "auth_select_quiz_leads" ON public.quiz_leads;
CREATE POLICY "auth_select_quiz_leads"
    ON public.quiz_leads FOR SELECT TO authenticated
    USING (true);
