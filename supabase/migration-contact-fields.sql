-- Executar no SQL Editor do Supabase (projetos já criados)
ALTER TABLE public.quiz_leads ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.quiz_leads ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.quiz_leads ADD COLUMN IF NOT EXISTS email TEXT;
