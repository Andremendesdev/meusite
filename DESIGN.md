---
name: meusite
description: Portfólio criativo — craft Dogstudio, dark canvas, sem clichê SaaS
colors:
  void: "oklch(0.08 0 0)"
  surface: "oklch(0.12 0 0)"
  surface-hover: "oklch(0.15 0.005 160)"
  ink: "oklch(0.93 0 0)"
  muted: "oklch(0.72 0.02 160)"
  moss: "oklch(0.4 0.087 160)"
  moss-bright: "oklch(0.52 0.11 160)"
  border: "oklch(0.22 0.01 160)"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 11vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "clamp(2rem, 6vw, 4rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.12em"
rounded:
  none: "0"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  2xl: "clamp(3rem, 8vw, 6rem)"
  3xl: "clamp(5rem, 12vw, 10rem)"
components:
  button-primary:
    backgroundColor: "{colors.moss}"
    textColor: "{colors.void}"
    rounded: "{rounded.none}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.moss-bright}"
    textColor: "{colors.void}"
    rounded: "{rounded.none}"
    padding: "14px 24px"
  button-primary-large:
    backgroundColor: "{colors.moss}"
    textColor: "{colors.void}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
---

# Design System: meusite

## Overview

**Creative North Star: "The Crafted Stage"**

Portfólio de André Mendes onde superfície escura é palco e o craft é o espetáculo. Inspirado em [Dogstudio](https://dogstudio.co/): tipografia display como statement (letras espaçadas, stagger no load), trabalhos como lista imersiva (não card grid), voz confiante e direta. Acento verde-musgo pontual; personalidade na tipografia e no motion.

Filosofia **Restrained** na cor: void canvas near-black puro, moss signal em CTAs e detalhes (≤10% da superfície). Motion **Choreographed**: hero-rise por letra, scroll reveal em seções — conteúdo sempre visível por default.

Rejeita: SaaS clichê, visual "feito por IA" (cream/sand, glassmorphism, eyebrows numeradas), landing startup 2023, ghost-cards (border + shadow largo).

**Key Characteristics:**
- Void canvas `oklch(0.08 0 0)` — palco escuro sem tint quente
- Moss signal raro — único acento saturado em botões, índices, labels, setas
- Bricolage Grotesque única — hierarquia por peso e escala
- Display hero com letras separadas e animação stagger
- Lista de projetos full-width com hover tonal, zero card grid
- Flat surfaces; profundidade só por tonal layering e hover

## Colors

Paleta escura com acento botânico pontual. Todos os valores canônicos em OKLCH (`src/styles/global.css`).

### Primary
- **Moss Signal** (oklch(0.4 0.087 160)): CTAs primários, índices de projeto (01/02), labels de seção, setas de link externo, focus ring base.
- **Moss Bright** (oklch(0.52 0.11 160)): hover em CTAs, hover em nav links, `:focus-visible` outline.

### Neutral
- **Void Canvas** (oklch(0.08 0 0)): `body` background. Near-black puro, chroma 0.
- **Surface Lift** (oklch(0.12 0 0)): painel de contato (`contact__inner`).
- **Surface Hover** (oklch(0.15 0.005 160)): hover em linhas de projeto.
- **Ink** (oklch(0.93 0 0)): texto principal, headings, nav em blend mode.
- **Muted** (oklch(0.72 0.02 160)): copy secundária, tags, descrições, footer, scroll hint.
- **Border Hairline** (oklch(0.22 0.01 160)): divisores entre projetos, about, footer.

### Named Rules
**The ≤10% Rule.** Moss saturado nunca domina a viewport. Um CTA por zona, acento em detalhes — raridade é o ponto.

**The Pure Void Rule.** Fundo chroma 0. Personalidade vem do acento e da tipografia, não de cream no body.

## Typography

**Display Font:** Bricolage Grotesque (Google Fonts, opsz 12–96)
**Body Font:** mesma família

**Character:** Sans geométrica com personalidade — técnica mas calorosa. Uma família, contraste por peso (400–800). Display com letter-spacing negativo moderado (-0.03em floor); hero com gap entre letras para efeito Dogstudio.

### Hierarchy
- **Display** (800, clamp(2.75rem, 11vw, 5.5rem), line-height 0.95): hero "Eu faço coisa boa" — palavras em bloco, letras com gap 0.08em/0.22em.
- **Headline** (700, clamp(1.5rem, 4vw, 2.25rem)): títulos de seção ("Trabalhos selecionados").
- **Title** (800, clamp(2rem, 6vw, 4rem)): nomes de projeto; about name clamp(2.5rem, 7vw, 4.5rem).
- **Body** (400, 1.0625rem, line-height 1.6, max ~48–55ch em descritivos): parágrafos, bios.
- **Label** (600, 0.75rem, letter-spacing 0.12em, uppercase): "Sobre", tags de categoria, scroll hint.

### Named Rules
**The One Family Rule.** Bricolage Grotesque carrega tudo. Sem pairing serif+sans.

**The Dogstudio Display Rule.** Hero é tipografia coreografada — letras separadas, `hero-rise` stagger 35ms/letra. Nunca headline SaaS centralizado com subtext cinza.

## Elevation

Sistema **flat por default**. Sem box-shadow em cards ou botões. Profundidade via:
- Tonal layering: `surface` sobre `void`, `surface-hover` em interação
- `mix-blend-mode: difference` na nav fixa
- Hover `translateY(-2px)` em CTAs (feedback, não sombra)

### Named Rules
**The Flat-Until-Interaction Rule.** Superfícies planas em repouso. Hover muda tom de fundo ou posição — nunca ghost-card (1px border + shadow blur ≥16px).

## Components

### Buttons
- **Shape:** cantos retos (border-radius 0)
- **Primary:** moss bg, void text, padding 14px 24px (hero) ou 16px 32px (contact), weight 600–700
- **Hover / Focus:** moss-bright bg, translateY(-2px); focus-visible outline 2px moss-bright offset 3px
- **Ghost:** não usado — nav links são texto puro

### Navigation
- **Style:** fixed top, blend-mode difference, brand 700 + links lowercase tracked
- **Hover:** cor moss-bright
- **Mobile:** mesma estrutura, gap fluido clamp(1.25rem, 4vw, 2.5rem)

### Project Row
- **Structure:** grid 6rem | 1fr | auto em ≥48rem; border-top hairline
- **Hover:** background surface-hover, padding-inline expande, seta ↗ desloca (4px, -4px)
- **Index:** moss, 0.8125rem, tracking 0.08em
- **Tag:** muted, uppercase 0.75rem

### Contact Panel
- **Background:** surface lift
- **Padding:** clamp(2rem, 6vw, 4rem)
- **Layout:** grid 1fr + CTA em ≥48rem

### Hero Display
- **Signature:** `.hero__char` com `--char-index`, animação `hero-rise` 800ms ease-out-expo
- **Reduced motion:** animação desligada; reveals instantâneos via JS fallback

## Do's and Don'ts

### Do:
- **Do** usar void canvas com moss em ≤10% da superfície
- **Do** coreografar hero por letra e reveals no scroll — conteúdo visível sem JS
- **Do** lista imersiva de projetos — full-width rows, não card grid idêntico
- **Do** respeitar `prefers-reduced-motion` (sem hero-rise, reveals imediatos)
- **Do** manter contraste ink/void ≥7:1 e muted legível ≥3.5:1

### Don't:
- **Don't** usar SaaS clichê: grids de cards idênticos, hero-metric, gradientes decorativos
- **Don't** cair no visual "feito por IA": fundo cream/sand, glassmorphism, eyebrows em todas as seções, numbered markers 01/02/03 como scaffolding
- **Don't** parecer landing startup 2023: gradientes + glass + métricas fake
- **Don't** parecer clone Linear/Vercel dark sem alma
- **Don't** usar `border: 1px solid` + `box-shadow` blur ≥16px no mesmo elemento
- **Don't** gate conteúdo em animação — seção nunca blank por reveal que não disparou
