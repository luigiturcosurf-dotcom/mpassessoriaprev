-- Rodar no SQL Editor do Supabase (corrige gravação das LPs)

GRANT INSERT, UPDATE ON public.quiz_leads TO anon;
GRANT SELECT ON public.quiz_leads TO authenticated;

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quiz_leads ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.quiz_leads ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.quiz_leads ADD COLUMN IF NOT EXISTS email TEXT;

DROP POLICY IF EXISTS "anon_insert_quiz_leads" ON public.quiz_leads;
CREATE POLICY "anon_insert_quiz_leads"
    ON public.quiz_leads FOR INSERT TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quiz_leads" ON public.quiz_leads;
CREATE POLICY "anon_update_quiz_leads"
    ON public.quiz_leads FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);
