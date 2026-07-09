# Pensão por Morte · Produção em lp.mpassessoriaprevidenciaria.com.br

## URLs oficiais (usar nos anúncios Meta)

| LP | URL |
|----|-----|
| Preta | https://lp.mpassessoriaprevidenciaria.com.br/pensaopormorte1.1/ |
| Azul | https://lp.mpassessoriaprevidenciaria.com.br/pensaopormorte2/ |
| INSS | https://lp.mpassessoriaprevidenciaria.com.br/pensaopormorte4/ |

Quiz direto:
```
https://lp.mpassessoriaprevidenciaria.com.br/pensaopormorte4/analise-de-beneficio/?iniciar=1
```

Raiz do subdomínio `lp.` redireciona para a LP preta (`pensaopormorte1.1`).

---

## WordPress → redirecionar tráfego antigo

Quem acessar as URLs antigas no domínio principal deve ir para o `lp.`:

Arquivo: `integrations/wordpress-pensaopormorte-redirects-to-lp.htaccess`

Cole no `.htaccess` da raiz do WordPress **ou** crie redirects 301 no plugin **Redirection**:

| De | Para |
|----|------|
| `mpassessoriaprevidenciaria.com.br/pensaopormorte1.1/*` | `lp.mpassessoriaprevidenciaria.com.br/pensaopormorte1.1/*` |
| `mpassessoriaprevidenciaria.com.br/pensaopormorte2/*` | `lp.mpassessoriaprevidenciaria.com.br/pensaopormorte2/*` |
| `mpassessoriaprevidenciaria.com.br/pensaopormorte4/*` | `lp.mpassessoriaprevidenciaria.com.br/pensaopormorte4/*` |
| `mpassessoriaprevidenciaria.com.br/pensaopormorte/*` | `lp.mpassessoriaprevidenciaria.com.br/pensaopormorte1.1/*` |

---

## Deploy Vercel

```bash
cd /Users/luigiturco/Downloads/aposentadoria-rural
npx vercel deploy --prod
```

Publica as pastas da raiz: `pensaopormorte1.1/`, `pensaopormorte2/`, `pensaopormorte4/`.

---

## Checklist

- [x] DNS `lp` → Vercel
- [x] 3 LPs no ar com quiz v2
- [ ] Redirects WordPress configurados
- [ ] URLs dos anúncios atualizadas para `lp.mpassessoriaprevidenciaria.com.br`
- [ ] Filho 22+ → `LeadDesqualificado`
- [ ] Cônjuge → `Lead`
