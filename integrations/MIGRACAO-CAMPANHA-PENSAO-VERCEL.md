# Migração campanha Pensão por Morte · WordPress → Vercel

## URLs de destino (atualizar nos anúncios Meta)

| LP | WordPress (antigo) | Vercel (novo — usar nos anúncios) |
|----|-------------------|-----------------------------------|
| Preta / principal | `https://mpassessoriaprevidenciaria.com.br/pensaopormorte/` | `https://aposentadoria-rural.vercel.app/pensaopormorte1.1/` |
| Preta v1.1 | `https://mpassessoriaprevidenciaria.com.br/pensaopormorte1.1/` | `https://aposentadoria-rural.vercel.app/pensaopormorte1.1/` |
| Azul v2 | `https://mpassessoriaprevidenciaria.com.br/pensaopormorte2/` | `https://aposentadoria-rural.vercel.app/pensaopormorte2/` |
| INSS v4 | `https://mpassessoriaprevidenciaria.com.br/pensaopormorte4/` | `https://aposentadoria-rural.vercel.app/pensaopormorte4/` |

**Quiz (com UTMs preservados):** acrescente `analise-de-beneficio/?iniciar=1` após a URL da LP.

Exemplo anúncio:
```
https://aposentadoria-rural.vercel.app/pensaopormorte4/analise-de-beneficio/?iniciar=1&utm_source=facebook&utm_campaign={{campaign.name}}
```

## No Gerenciador de Anúncios Meta

1. Abra cada conjunto de anúncios ativo de Pensão por Morte
2. Edite o **URL do site** (destino) para a coluna Vercel acima
3. Mantenha os mesmos UTMs (`utm_source`, `utm_campaign`, `utm_content`, etc.)
4. **Não altere** pixel (`1229096362421532`) nem evento de otimização (`Lead`)
5. Publique as alterações

## Redirecionar tráfego orgânico / links antigos (WordPress)

Opção A — **Plugin Redirection** no WordPress: crie 301 de cada URL antiga para a URL Vercel correspondente.

Opção B — **.htaccess**: use o arquivo `integrations/wordpress-pensaopormorte-redirects.htaccess` na raiz do site.

## Checklist pós-migração

- [ ] Filho 22+ → `LeadDesqualificado` (testar no Events Manager)
- [ ] Cônjuge → `Lead` (browser + servidor, mesmo `event_id`)
- [ ] Planilha: coluna **Evento Meta** preenchendo
- [ ] 3 LPs abrindo com layout correto (Cmd+Shift+R)

## Rollback

Se precisar voltar: reverter URLs dos anúncios para `mpassessoriaprevidenciaria.com.br/pensaopormorte*`.
