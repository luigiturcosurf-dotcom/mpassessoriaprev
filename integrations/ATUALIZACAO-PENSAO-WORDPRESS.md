# Atualização Pensão por Morte · Quiz v2 no domínio oficial

**URLs oficiais (manter nos anúncios — NÃO usar vercel.app):**

| LP | URL |
|----|-----|
| Preta | https://mpassessoriaprevidenciaria.com.br/pensaopormorte1.1/ |
| Azul | https://mpassessoriaprevidenciaria.com.br/pensaopormorte2/ |
| INSS | https://mpassessoriaprevidenciaria.com.br/pensaopormorte4/ |

Quiz direto (opcional nos anúncios):
```
https://mpassessoriaprevidenciaria.com.br/pensaopormorte4/analise-de-beneficio.html?iniciar=1
```

---

## Upload no servidor (cPanel / FTP)

Pacotes prontos em `deploy/`:

```
deploy/pensaopormorte1.1.zip
deploy/pensaopormorte2.zip
deploy/pensaopormorte4.zip
```

### Passo a passo

1. Acesse o **File Manager** ou FTP do hosting
2. Vá até a pasta de cada LP (ex.: `public_html/pensaopormorte2/`)
3. Faça **backup** da pasta atual (baixar cópia)
4. Envie e extraia o ZIP correspondente **sobrescrevendo** os arquivos
5. Arquivos críticos que devem atualizar:
   - `quiz.js` (v2 — filho 22+ desqualifica)
   - `analise-de-beneficio.html`
   - `supabase-leads.js`
   - `attribution.js`

### Validar após upload

Abra no navegador (Cmd+Shift+R para limpar cache):

```
https://mpassessoriaprevidenciaria.com.br/pensaopormorte2/quiz.js
```

Deve conter `filho-idade` e `CAPI_ENDPOINT` — **não** deve ter `goToStep('q6')` no handleQ5.

---

## Campanhas Meta

- **Manter** as URLs `mpassessoriaprevidenciaria.com.br/pensaopormorte*`
- **Pausar** qualquer campanha apontando para `vercel.app`
- **Não alterar** pixel (`1229096362421532`) nem evento de otimização (`Lead`)

---

## Checklist pós-upload

- [ ] Filho 22+ → tela de desqualificação + `LeadDesqualificado`
- [ ] Cônjuge → `Lead` (browser + servidor, mesmo `event_id`)
- [ ] Planilha: coluna **Evento Meta** preenchendo
- [ ] 3 LPs com layout correto
