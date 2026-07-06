---
target: sobre
total_score: 31
p0_count: 2
p1_count: 2
timestamp: 2026-07-06T13-52-25Z
slug: src-pages-index-astro-sobre
---
# Critique: seção Sobre

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Ritual scroll + mudança de estado da água-viva comunicam progresso; a seção em si não dá feedback próprio |
| 2 | Match System / Real World | 2 | "Criamos" quebra a voz em primeira pessoa do hero e do contato |
| 3 | User Control and Freedom | 4 | Scroll livre, âncoras na nav — sólido |
| 4 | Consistency and Standards | 2 | Tokens de cor literais (hue 300°) vs `--muted`/`--moss`; eyebrow diferente do hero |
| 5 | Error Prevention | 4 | n/a — seção informativa |
| 6 | Recognition Rather Than Recall | 3 | Hierarquia legível; label "Sobre" não acrescenta informação |
| 7 | Flexibility and Efficiency | 3 | Leitura rápida; sem atalho para contato ou trabalhos |
| 8 | Aesthetic and Minimalist Design | 3 | Poucos elementos, mas copy genérica ocupa espaço sem prova |
| 9 | Error Recovery | 4 | n/a |
| 10 | Help and Documentation | 3 | n/a para portfólio |
| **Total** | | **31/40** | **Good — base sólida, copy e sistema visual precisam de intenção** |

## Anti-Patterns Verdict

**LLM assessment:** Não é slop visual óbvio (sem cream, glass, card grid, numbered markers). Os tells são mais sutis: eyebrow uppercase tracked redundante, statement de agência commoditizado ("alta performance", "do conceito ao deploy"), e repetição do nome sem nova dramaturgia tipográfica. A composição água-viva-esquerda / texto-direita é cinematográfica e foge do template SaaS — mas a copy não sustenta o nível de craft do WebGL.

**Deterministic scan:** `detect.mjs` em `index.astro` → **0 achados**. Em `global.css` (About): 3 avisos advisory `design-system-color` (linhas 944, 953, 965) — cores oklch literais em vez de tokens `--ink`/`--muted`.

**Visual overlays:** Não executado (sem injeção de browser nesta sessão). Dev server ativo em `localhost:4321` para inspeção manual.

## Overall Impression

A seção **sobre** acerta no palco: criatura à esquerda, tipografia à direita, ritmo quieto após a lista de trabalhos. O problema é que o conteúdo não joga no mesmo nível — soa a blurb de agência genérica num site que promete personalidade Dogstudio. O maior ganho não é layout; é voz, prova e um gancho para contato.

## What's Working

1. **Composição assimétrica** — `margin-inline-start: clamp(32%, 38vw, 46%)` + grid à direita cria diálogo real com a água-viva; não é hero centralizado clichê.
2. **Estado da criatura em `sobre`** — pulso lento, `gazeIntensity` alto, magenta profundo: a seção tem clima emocional distinto de hero/trabalhos.
3. **Reveal seguro** — `.reveal` default `opacity: 1`; animação só com `prefers-reduced-motion: no-preference` + fallback JS em `Layout.astro`.

## Priority Issues

### [P0] Voz errada: "Criamos"
- **Why it matters:** Visitante que leu "Eu faço coisa boa" e "Me chama no WhatsApp" encontra plural corporativo — quebra confiança e parece texto placeholder.
- **Fix:** Primeira pessoa singular com prova concreta (stack, processo, 1 frase memorável).
- **Suggested command:** `$impeccable clarify sobre`

### [P0] Layout assume WebGL que pode não existir
- **Why it matters:** Com `html.no-webgl`, a água-viva some mas o texto permanece deslocado à direita como se houvesse criatura — metade da tela vazia.
- **Fix:** `@media` ou classe `no-webgl` recentraliza/expande `.about__grid`.
- **Suggested command:** `$impeccable adapt sobre`

### [P1] Copy promete em vez de mostrar
- **Why it matters:** PRODUCT.md: "mostrar, não prometer". Statement é claim sem evidência; trabalhos já provam — sobre não conecta.
- **Fix:** 1–2 linhas com ângulo pessoal + link implícito ao craft visto em trabalhos, ou micro-detalhe de processo.
- **Suggested command:** `$impeccable clarify sobre` + `$impeccable bolder sobre`

### [P1] Hierarquia de cor invertida e drift de tokens
- **Why it matters:** `.about__label` (L 0.52) mais escuro que `.about__statement` (L 0.62); hero usa `--neon`/`--moss`, trabalhos usa `--muted` — sobre inventa hue 300° fora do sistema.
- **Fix:** Label em `--moss` ou `--neon` (como hero eyebrow); statement em `--muted`; name em `--ink`.
- **Suggested command:** `$impeccable colorize sobre`

### [P2] Seção sem gancho de conversão
- **Why it matters:** Após sobre, contato é salto emocional; visitante quente não recebe CTA ou ponte.
- **Fix:** Link ghost "Vamos conversar" ou frase que aponta para `#contato`.
- **Suggested command:** `$impeccable delight sobre`

## Persona Red Flags

**Jordan (primeira visita):** "Criamos" — quem é "nós"? Label "Sobre" não explica diferencial; precisa inferir que André = autor dos trabalhos acima.

**Casey (mobile distraído):** Bloco inteiro `text-align: right` em coluna estreita; competição visual com canvas 3D em viewports médios; statement em 22ch pode quebrar de forma estranha entre 56–64rem.

**Marina (contratante):** Statement é promessa genérica — não vê anos, stack, tipo de cliente, nem prova social; nome repetido sem novo argumento de contratação.

## Minor Observations

- `<br />` em "André / Mendes" é fixo — em telas largas poderia ser uma linha; em estreitas ok.
- Border-top igual à seção trabalhos — coerente, mas sobre poderia ter tratamento mais íntimo (sem hairline ou com moss sutil).
- `about__name` não usa Syne nem coreografia do hero — oportunidade perdida de eco tipográfico.
- Contraste no void puro parece AA+; atrás da água-viva o fundo local pode escurecer — validar visualmente.

## Questions to Consider

- E se o sobre fosse **uma frase** em display grande e o resto sumisse?
- O nome precisa aparecer de novo, ou o visitante já sabe quem é desde o hero?
- O que a água-viva "pensando" (gaze alto) deveria fazer o texto **dizer**?
