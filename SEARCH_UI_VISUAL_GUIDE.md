# Visual UI Guide - Perplexity-Style Search

## Complete UI Breakdown (Based on Your Screenshots)

### Screenshot 1: Initial Search State
```
┌─────────────────────────────────────────────────────┐
│ what is the latest news in AI?                     │ ← SearchHeader
├─────────────────────────────────────────────────────┤
│ ━━━━━━━━━━━                                         │
│ Answer | Images                                     │ ← SearchTabs
├─────────────────────────────────────────────────────┤
│ 🔵 Working...                                       │ ← SearchThinking
│ 🟢 Surveying recent AI developments to summarize... │   (Stage 1)
│                                                     │
│ 🔍 artificial intelligence latest news 2025  +2... │ ← Search Queries
└─────────────────────────────────────────────────────┘
```

### Screenshot 2: Sources Review State
```
┌─────────────────────────────────────────────────────┐
│ what is the latest news in AI?                     │
├─────────────────────────────────────────────────────┤
│ ━━━━━━━━━━━                                         │
│ Answer | Images                                     │
├─────────────────────────────────────────────────────┤
│ Reviewed 13 sources ∨                               │ ← SourcesDropdown
│                                                     │   (Collapsed)
│ ┌─ Searching ───────────────────────────────────┐  │
│ │ 🔍 artificial intelligence latest news 2025   │  │ ← Thinking Details
│ │ 🔍 AI developments November 2025              │  │
│ │ 🔍 AI breakthroughs November 2025             │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌─ Reviewing sources · 13 ──────────────────────┐  │
│ │                                                │  │
│ │ 🌐 AI puts the squeeze on new grads...   cnbc │  │ ← Source Preview
│ │ 🌐 The question everyone in AI...        cnbc │  │   (During Review)
│ │ 🌐 Anthropic CEO warns that...         cbsnews│  │
│ │ 🌐 The Latest AI News and AI...      crescendo│  │
│ │ ...                                            │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ✅ Finished                                         │
└─────────────────────────────────────────────────────┘
```

### Screenshot 3: Complete Response
```
┌─────────────────────────────────────────────────────┐
│ what is the latest news in AI?                     │
├─────────────────────────────────────────────────────┤
│ ━━━━━━━━━━━                                         │
│ Answer | Images                                     │
├─────────────────────────────────────────────────────┤
│ Reviewed 13 sources ∨                               │
│                                                     │
│ The latest news in artificial intelligence         │ ← AI Response
│ includes major updates in AI model releases,       │   (with citations)
│ breakthroughs in robotics, corporate and          │
│ scientific partnerships, and innovations in AI     │
│ hardware and safety. There have also been         │
│ significant research findings and increased        │
│ regulatory focus on AI safety and ethics.          │
│ binaryverseai +2                                   │
│                                                     │
│ Major AI Model Launches and Upgrades               │ ← Sections
│                                                     │
│ • OpenAI launched GPT-5.1, boasting faster        │
│   response times, improved reasoning abilities,    │
│   and customizable conversation styles, making     │
│   interactions more agentic and personal.          │
│   champagnemagazine +1                             │
│                                                     │
│ • Google released updates to its Gemini agents    │
│   and consolidated enterprise tools under          │
│   "Gemini Enterprise," targeting scientific        │
│   acceleration and workplace productivity.         │
│   etcjournal                                       │
│                                                     │
│ Robotics and Embodied AI                           │
│                                                     │
│ • Galbot unveiled two foundational models for     │
│   robotics: DexNDM for fine dexterous hand        │
│   control, and NavFoM, described as a general     │
│   navigation model for varied robot types and      │
│   environments. champagnemagazine                  │
│                                                     │
│ • Tesla updated its Optimus robot, with          │
│   advances in dexterity and perception, aiming    │
│   for broader deployment in factories and         │
│   logistics. crescendo                             │
└─────────────────────────────────────────────────────┘
```

### Screenshot 4: Source Cards Section
```
┌─────────────────────────────────────────────────────┐
│ ...continued AI response...                         │
│                                                     │
│ • There's growing AI impact in drug discovery,    │
│   semiconductor chip inspection, and finance,      │
│   including FICO's new patents for more           │
│   transparent and inclusive credit scoring         │
│   using AI. crescendo 📺 youtube                   │
│                                                     │
│ Investment and Startups                             │
│                                                     │
│ • Over $3.5 billion was invested in AI startups   │
│   this November alone, with highlights including   │
│   Synchron's $200 million Series D for brain-     │
│   computer interfaces for paralyzed patients.      │
│   secondtalent                                     │
│                                                     │
│ Other Trends                                        │
│                                                     │
│ • AI research is shifting toward explainability,  │
│   efficiency, and practical safety, with notable   │
│   efficiency leaps and broader industry           │
│   participation in AI development.                 │
│   hai.stanford 📺 youtube                          │
│                                                     │
│ These developments illustrate a rapidly evolving   │
│ landscape, marked by increased integration of AI   │
│ into everyday devices, industry investment, and    │
│ ongoing debates about the safety and governance    │
│ of advanced systems. cbsnews +5 📺 youtube         │
│                                                     │
│ ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯│
│                                                     │
│ 👍 👎 📋 ⋯                                          │ ← Action Buttons
│                                                     │
│ Related                                             │ ← RelatedQuestions
│                                                     │
│ ⤷ Key AI safety developments this week             │
│ ⤷ Major product launches and company moves in AI   │
│ ⤷ Regulatory or government actions on AI...        │
│ ⤷ Breakthrough research papers or benchmarks...    │
│ ⤷ How AI is affecting jobs and hiring...           │
└─────────────────────────────────────────────────────┘
```

## Component Mapping

### Our Implementation → Perplexity UI

| **Perplexity Element** | **Our Component** | **Props** |
|------------------------|-------------------|-----------|
| Query title | `SearchHeader` | `query`, `condensedQuery` |
| Answer/Images tabs | `SearchTabs` | `activeTab`, `onTabChange` |
| "Working..." status | `SearchThinking` | `stage='searching'` |
| "Reviewing sources · 13" | `SearchThinking` | `stage='reviewing'`, `sourceCount` |
| Search queries list | `SearchThinking` | `queries=[...]` |
| Sources dropdown | `SourcesDropdown` | `sources`, `onSourceClick` |
| Inline citations [1] | `MessageRenderer` | `onCitationClick` |
| Source badges | `SourceCard` | `source.type` |
| Domain labels | `SourceCard` | `source.domain` |
| Related questions | `RelatedQuestions` | `questions`, `onClick` |

## Exact Layout Measurements

### From Perplexity Screenshots:

**Header**:
```
Font: 30px (1.875rem)
Weight: 400 (normal)
Spacing: 0px letter-spacing
Margin-bottom: 24px
```

**Tabs**:
```
Height: 48px
Font: 14px
Padding: 12px 16px
Border-bottom: 2px (active)
Gap between tabs: 4px
```

**Thinking UI**:
```
Icon size: 16px
Font: 14px
Line height: 20px
Indent: 24px (for queries)
Gap: 12px (between stages)
```

**Sources Dropdown**:
```
Font: 14px
Icon: 16px chevron
Hover: bg-white/5
Padding: 8px 12px
```

**Source Cards** (During Review):
```
Favicon: 16x16px
Title: 14px, 1 line
Domain: 12px, gray-600
Gap: 12px between items
Padding: 8px 12px
```

**Source Cards** (Final):
```
Thumbnail: 64x64px (desktop), 48x48px (mobile)
Title: 14px, 2 lines max
Description: 12px, 2 lines max
Badge: 12px
Citation #: 24px circle, top-right
Padding: 16px
Gap: 12px between cards
Border-radius: 8px
```

**Related Questions**:
```
Arrow icon: 16px
Font: 14px
Padding: 12px 16px
Gap: 8px between questions
Hover: bg-white/5
Border-top: 1px solid gray-800
Margin-top: 32px
```

## Color Palette (Exact)

### From Perplexity Dark Theme:

```css
/* Backgrounds */
--bg-primary: #0a0a0a;        /* Main background */
--bg-surface: #1a1a1a;        /* Cards, elevated surfaces */
--bg-hover: rgba(255,255,255,0.05);  /* Hover state */
--bg-active: rgba(255,255,255,0.1);  /* Active/selected */

/* Borders */
--border-subtle: #1f1f1f;     /* Very subtle dividers */
--border-default: #2e2e2e;    /* Default borders */
--border-hover: #404040;      /* Hover state borders */
--border-accent: #3b82f6;     /* Active tab, highlights */

/* Text */
--text-primary: #ffffff;      /* Main content */
--text-secondary: #b3b3b3;    /* Labels, metadata */
--text-tertiary: #808080;     /* De-emphasized text */
--text-disabled: #4d4d4d;     /* Disabled state */

/* Accents */
--accent-blue: #3b82f6;       /* Links, citations */
--accent-blue-dim: rgba(59,130,246,0.1);  /* Blue backgrounds */
--accent-green: #10b981;      /* Success states */
--accent-red: #ef4444;        /* Video badges */
--accent-purple: #a855f7;     /* Podcast badges */

/* Semantic */
--icon-default: #808080;      /* Default icon color */
--icon-hover: #b3b3b3;        /* Icon hover */
--icon-active: #ffffff;       /* Active icon */
```

## Animation Timings

```css
/* Perplexity uses these exact timings */
--transition-fast: 150ms;     /* Hover effects */
--transition-normal: 200ms;   /* Tabs, dropdowns */
--transition-slow: 300ms;     /* Page transitions */

/* Easing functions */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

## Responsive Breakpoints

```css
/* Perplexity breakpoints */
--mobile: 640px;      /* Phone */
--tablet: 768px;      /* Tablet */
--desktop: 1024px;    /* Desktop */
--wide: 1280px;       /* Wide screen */

/* Content max-width */
--content-max: 720px; /* Answer column */
--full-max: 1200px;   /* Full layout */
```

## Z-Index Stack

```css
/* Layer ordering */
--z-base: 0;          /* Normal content */
--z-dropdown: 10;     /* Sources dropdown */
--z-sticky: 20;       /* Sticky headers */
--z-modal: 30;        /* Modals, overlays */
--z-tooltip: 40;      /* Tooltips */
--z-toast: 50;        /* Notifications */
```

---

This visual guide shows the exact 1:1 mapping between Perplexity's UI (from your screenshots) and our implementation! 🎨
