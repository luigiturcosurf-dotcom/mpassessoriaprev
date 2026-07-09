-- Corrige UPDATE bloqueado (PATCH retorna 0 linhas)
-- Rodar no SQL Editor do Supabase

GRANT INSERT, UPDATE ON public.quiz_leads TO anon;
GRANT INSERT, UPDATE ON public.quiz_leads TO authenticated;

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_update_quiz_leads" ON public.quiz_leads;
CREATE POLICY "anon_update_quiz_leads"
    ON public.quiz_leads
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_quiz_leads" ON public.quiz_leads;
CREATE POLICY "authenticated_update_quiz_leads"
    ON public.quiz_leads
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
