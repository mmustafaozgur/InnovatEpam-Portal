# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** InnovatEPAM
**Generated:** 2026-05-12 19:46:56
**Category:** Innovation Portal

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#1E40AF` | `--color-primary` |
| Secondary | `#3B82F6` | `--color-secondary` |
| CTA/Accent | `#F59E0B` | `--color-cta` |
| Background | `#F8FAFC` | `--color-background` |
| Text | `#1E3A8A` | `--color-text` |

**Color Notes:** Blue data + amber highlights

### Typography

- **Heading Font:** Poppins
- **Body Font:** Open Sans
- **Mood:** modern, professional, clean, corporate, friendly, approachable
- **Google Fonts:** [Poppins + Open Sans](https://fonts.google.com/share?selection.family=Open+Sans:wght@300;400;500;600;700|Poppins:wght@400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Tailwind & shadcn/ui Integration

### tailwind.config.js

Extend the Tailwind theme with these tokens so palette values are available as utility
classes (e.g. `bg-primary`, `text-cta`, `border-secondary`):

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:    '#1E40AF',
        secondary:  '#3B82F6',
        cta:        '#F59E0B',
        background: '#F8FAFC',
        'text-base':'#1E3A8A',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body:    ['Open Sans', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
```

### globals.css (shadcn/ui CSS variables)

shadcn/ui reads these CSS variables from `:root`. Map the palette here so shadcn
components pick up InnovatEPAM colors automatically:

```css
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background:         248 250 252;  /* #F8FAFC */
    --foreground:         30 58 138;    /* #1E3A8A */

    --primary:            30 64 175;    /* #1E40AF */
    --primary-foreground: 255 255 255;

    --secondary:          59 130 246;   /* #3B82F6 */
    --secondary-foreground: 255 255 255;

    --accent:             245 158 11;   /* #F59E0B — CTA */
    --accent-foreground:  255 255 255;

    --card:               255 255 255;
    --card-foreground:    30 58 138;

    --border:             226 232 240;  /* #E2E8F0 */
    --input:              226 232 240;
    --ring:               30 64 175;    /* focus ring = primary */

    --radius: 0.5rem;
  }
}
```

### Usage Examples

```tsx
// Tailwind utility classes — use these, never raw CSS
<button className="bg-cta text-white px-6 py-3 rounded-lg font-semibold
                   hover:opacity-90 hover:-translate-y-px transition-all duration-200
                   cursor-pointer">
  Submit Idea
</button>

// shadcn/ui Button — variant maps to CSS variables above
<Button variant="default">Submit Idea</Button>   // uses --primary
<Button variant="outline">Save Draft</Button>    // uses --border + --primary text
```

---

## Component Specs

### Buttons

| Variant | Background | Text | Border | Use For |
|---------|-----------|------|--------|---------|
| Primary (CTA) | `bg-cta` `#F59E0B` | white | — | Submit idea, Approve, Allocate budget |
| Secondary | transparent | `text-primary` | `border-primary` | Save draft, Cancel, Back |
| Destructive | `bg-red-600` | white | — | Reject, Delete |
| Ghost | transparent | `text-primary` | — | Tertiary actions, icon-only |

All buttons: `rounded-lg font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-px`

### Cards

Cards display ideas, evaluation results, or budget summaries.

```
bg-white rounded-xl p-6 shadow-md
hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer
```

### Inputs & Forms

```
px-4 py-3 border border-border rounded-lg text-base
focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
transition-colors duration-200
```

### Modals

```
// Overlay
bg-black/50 backdrop-blur-sm

// Panel
bg-white rounded-2xl p-8 shadow-xl max-w-lg w-[90%]
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style

**Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential

**Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools

**Key Effects:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading

### Page Pattern

**Pattern Name:** Innovation Portal Dashboard

- **Layout:** Sidebar navigation (collapsible) + main content area + optional right panel
- **Navigation:** Persistent sidebar with sections: Dashboard, Submit Idea, My Ideas, Evaluations, Budget Tracker, Admin
- **CTA Placement:** Primary action (Submit Idea) in sidebar header + floating action on list views
- **Section Order (Dashboard):** 1. KPI summary row, 2. Active ideas feed, 3. Pending evaluations, 4. Recent budget allocations
- **Auth Flow:** Login → Dashboard; role-based views (Employee / Expert / Admin)

---

## Anti-Patterns (Do NOT Use)

- ❌ AI purple/pink gradients — off-brand, signals generic AI aesthetic
- ❌ Emojis as icons — use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ Missing `cursor-pointer` — all clickable elements must have it
- ❌ Layout-shifting hovers — avoid scale transforms that shift surrounding content
- ❌ Low contrast text — maintain 4.5:1 minimum contrast ratio
- ❌ Instant state changes — always use transitions (150-300ms)
- ❌ Invisible focus states — focus states must be visible for keyboard navigation
- ❌ Raw CSS classes — use Tailwind utilities or shadcn/ui components only; no `.btn-primary` etc.
- ❌ Hardcoded hex values in JSX — use Tailwind tokens (`bg-primary`) or CSS variables

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] No raw CSS or hardcoded hex values — Tailwind tokens only
- [ ] shadcn/ui components used where available before writing custom components
