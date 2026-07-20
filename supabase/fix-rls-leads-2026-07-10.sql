-- MP Assessoria · Corrige gravação de leads (RLS) + permite resultado sem-provas
-- Diagnóstico 10/07/2026 ~01:50 BRT: inserts das LPs falhando com:
--   "new row violates row-level security policy for table quiz_leads"
-- Meta e WhatsApp continuavam ok porque não dependem do Supabase.
-- Planilha parou porque o Apps Script só sincroniza o que está em quiz_leads.
--
-- Executar no SQL Editor do projeto mpassessoria (jiuxiyxsausauqfsudus):
-- https://supabase.com/dashboard/project/jiuxiyxsausauqfsudus/sql/new

-- 1) Permissões básicas
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON public.quiz_leads TO anon;
GRANT SELECT, UPDATE ON public.quiz_leads TO authenticated;
GRANT ALL ON public.quiz_leads TO service_role;

-- 2) RLS ligado + policies de insert/update para anon (chave publishable das LPs)
ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_quiz_leads" ON public.quiz_leads;
CREATE POLICY "anon_insert_quiz_leads"
    ON public.quiz_leads
    FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quiz_leads" ON public.quiz_leads;
CREATE POLICY "anon_update_quiz_leads"
    ON public.quiz_leads
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_quiz_leads" ON public.quiz_leads;
CREATE POLICY "auth_select_quiz_leads"
    ON public.quiz_leads
    FOR SELECT
    TO authenticated
    USING (true);

-- 3) Amplia CHECK de resultado (rural passou a gravar sem-provas)
ALTER TABLE public.quiz_leads
    DROP CONSTRAINT IF EXISTS quiz_leads_resultado_check;

ALTER TABLE public.quiz_leads
    ADD CONSTRAINT quiz_leads_resultado_check
    CHECK (resultado IN (
        'qualified',
        'qualified-soft',
        'disqualified',
        'whatsapp-direct',
        'quiz-iniciado',
        'sem-provas'
    ));
