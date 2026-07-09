# Pensão por Morte · Hospedagem Vercel

## URLs no Vercel (produção)

| LP | URL Vercel |
|----|------------|
| Preta | https://aposentadoria-rural.vercel.app/pensaopormorte1.1/ |
| Azul | https://aposentadoria-rural.vercel.app/pensaopormorte2/ |
| INSS | https://aposentadoria-rural.vercel.app/pensaopormorte4/ |

Quiz direto:
```
https://aposentadoria-rural.vercel.app/pensaopormorte4/analise-de-beneficio/?iniciar=1
```

## Domínio oficial (opcional)

Para usar `mpassessoriaprevidenciaria.com.br/pensaopormorte*` apontando para o Vercel:

1. Vercel → projeto `aposentadoria-rural` → **Settings → Domains**
2. Adicionar `mpassessoriaprevidenciaria.com.br`
3. No DNS do domínio, configurar conforme instruções do Vercel (A/CNAME)
4. Ou usar subdomínio: `lp.mpassessoriaprevidenciaria.com.br` → mais simples

## Deploy

```bash
cd /Users/luigiturco/Downloads/aposentadoria-rural
npx vercel deploy --prod
```

O Vercel publica as pastas da **raiz** (`pensaopormorte1.1/`, `pensaopormorte2/`, `pensaopormorte4/`). A pasta `deploy/` é só para upload manual no WordPress.

## Checklist

- [ ] Filho 22+ → `LeadDesqualificado`
- [ ] Cônjuge → `Lead` (mesmo `event_id` browser + servidor)
- [ ] Planilha: coluna **Evento Meta** preenchendo

