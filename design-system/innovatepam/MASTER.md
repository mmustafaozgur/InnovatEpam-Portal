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

---

## Auth Components (Feature 001-user-auth)

> These sections govern all UI in `001-user-auth`. They extend the rules above —
> global rules still apply unless explicitly overridden here.

---

### Auth Page Layout

Used for Login and Register pages. Full-viewport centered card on the portal background.

```
// Page shell
min-h-screen bg-background flex items-center justify-center px-4

// Card
bg-white rounded-2xl shadow-lg p-8 w-full max-w-md

// Logo / portal name (top of card)
font-heading font-semibold text-2xl text-primary text-center mb-2

// Subtitle
font-body text-sm text-slate-500 text-center mb-8
```

**TSX structure:**

```tsx
<div className="min-h-screen bg-background flex items-center justify-center px-4">
  <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
    <h1 className="font-heading font-semibold text-2xl text-primary text-center mb-2">
      InnovatEPAM
    </h1>
    <p className="font-body text-sm text-slate-500 text-center mb-8">
      Sign in to your account
    </p>
    {/* form */}
  </div>
</div>
```

**Responsive:** Card is `max-w-md` (448px) on desktop; on mobile (`<375px`) it fills
`w-full` with `px-4` gutter. No full-bleed — always preserve 16px edge padding.

---

### Field-Level Error State

Applied to any `<Input>` when shadcn `<FormMessage>` displays a validation error.
Uses shadcn `<Form>` + `react-hook-form` + `zod` per stack guidelines.

```
// Input — error state (replaces default border)
border-red-500 focus:border-red-500 focus:ring-red-500/20

// Error message text (rendered by <FormMessage>)
text-red-600 text-xs mt-1 flex items-center gap-1
```

**Accessibility:** The `<FormMessage>` element rendered by shadcn automatically carries
`aria-live="polite"` semantics through the form field's `aria-describedby` binding.
Do **not** add a separate `role="alert"` to field-level errors — use `role="alert"` only
for banner-level notifications (see Inline Notification Banner below).

**TSX pattern:**

```tsx
<FormField control={form.control} name="email" render={({ field }) => (
  <FormItem>
    <FormLabel>Email</FormLabel>
    <FormControl>
      <Input
        {...field}
        className={cn(
          "px-4 py-3 border rounded-lg text-base transition-colors duration-200",
          "focus:outline-none focus:ring-2",
          form.formState.errors.email
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
            : "border-border focus:border-primary focus:ring-primary/20"
        )}
      />
    </FormControl>
    <FormMessage className="text-red-600 text-xs mt-1" />
  </FormItem>
)} />
```

---

### Checkbox + Label (Privacy Policy)

Uses shadcn `<Checkbox>`. Three visual states required.

| State | Checkbox classes | Label classes |
|-------|-----------------|---------------|
| Unchecked (default) | `border-border` | `text-slate-600 text-sm` |
| Checked | `bg-primary border-primary text-white` | `text-slate-600 text-sm` |
| Error (unchecked on submit) | `border-red-500` | `text-red-600 text-sm` |

**TSX pattern:**

```tsx
<FormField control={form.control} name="privacy_policy_accepted" render={({ field }) => (
  <FormItem className="flex flex-row items-start gap-3 mt-2">
    <FormControl>
      <Checkbox
        checked={field.value}
        onCheckedChange={field.onChange}
        className={cn(
          "mt-0.5",
          form.formState.errors.privacy_policy_accepted && "border-red-500"
        )}
      />
    </FormControl>
    <div className="space-y-1">
      <FormLabel className={cn(
        "text-sm font-normal cursor-pointer",
        form.formState.errors.privacy_policy_accepted ? "text-red-600" : "text-slate-600"
      )}>
        I agree to the{" "}
        <a href="/privacy" className="text-primary underline hover:opacity-80 transition-opacity duration-200">
          Privacy Policy
        </a>
      </FormLabel>
      <FormMessage className="text-red-600 text-xs" />
    </div>
  </FormItem>
)} />
```

**Touch target:** The `<Checkbox>` renders at 16×16px visually; the wrapping `<FormLabel>`
extends the tap area — the combined row meets the 44×44px minimum touch target requirement.

---

### Password Input (with Show/Hide Toggle)

Inherits the standard input spec. Adds an icon-button overlay on the right edge.

```
// Wrapper
relative

// Input — same as standard input spec, plus right padding for icon
pr-10

// Toggle button
absolute right-3 top-1/2 -translate-y-1/2
text-slate-400 hover:text-slate-600 transition-colors duration-200 cursor-pointer
p-0 bg-transparent border-none outline-none
focus-visible:ring-2 focus-visible:ring-primary/40 rounded
```

**TSX pattern:**

```tsx
const [showPassword, setShowPassword] = useState(false);

<div className="relative">
  <Input
    type={showPassword ? "text" : "password"}
    className="pr-10 px-4 py-3 border border-border rounded-lg text-base
               focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
               transition-colors duration-200"
    {...field}
  />
  <button
    type="button"
    onClick={() => setShowPassword(v => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
               hover:text-slate-600 transition-colors duration-200 cursor-pointer
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
               rounded"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword
      ? <EyeOff className="w-4 h-4" />
      : <Eye className="w-4 h-4" />}
  </button>
</div>
```

**Icons:** Use `Eye` and `EyeOff` from `lucide-react`. Do **not** use emojis or custom SVGs.

---

### UserTable (Admin-only)

Uses shadcn `<Table>`. Wrapped in `overflow-x-auto` for mobile (UX table guideline).

```
// Page heading
font-heading font-semibold text-xl text-primary mb-6

// Table wrapper
overflow-x-auto rounded-xl border border-border shadow-sm

// Table header row
bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide

// Table body row — default
bg-white border-b border-border last:border-0

// Table body row — hover
hover:bg-slate-50 transition-colors duration-150

// Table cell
px-4 py-3 text-sm text-slate-700
```

**Role badges:**

| Role | Classes |
|------|---------|
| Admin | `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary` |
| Submitter | `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600` |

**Promote button states:**

| State | Classes | Condition |
|-------|---------|-----------|
| Active | `text-sm font-medium text-primary hover:text-secondary underline-offset-2 hover:underline cursor-pointer transition-colors duration-200` | Row is a Submitter and not the current user |
| Disabled (self) | `text-sm font-medium text-slate-300 cursor-not-allowed` | Row is the current user (ADR-006 D3 self-promotion guard) |
| Disabled (already Admin) | — | Not shown; Promote column is empty for Admin rows |

**TSX skeleton:**

```tsx
<div className="overflow-x-auto rounded-xl border border-border shadow-sm">
  <Table>
    <TableHeader>
      <TableRow className="bg-slate-50">
        <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</TableHead>
        <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</TableHead>
        <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</TableHead>
        <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.map(user => (
        <TableRow key={user.id} className="hover:bg-slate-50 transition-colors duration-150">
          <TableCell className="px-4 py-3 text-sm text-slate-700">{user.full_name}</TableCell>
          <TableCell className="px-4 py-3 text-sm text-slate-700">{user.email}</TableCell>
          <TableCell className="px-4 py-3">
            <span className={user.role === 'admin'
              ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
              : "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
            }>
              {user.role === 'admin' ? 'Admin' : 'Submitter'}
            </span>
          </TableCell>
          <TableCell className="px-4 py-3">
            {user.role === 'submitter' && (
              user.id === currentUser.id
                ? <span className="text-sm font-medium text-slate-300 cursor-not-allowed">Promote</span>
                : <button onClick={() => onPromote(user.id)}
                    className="text-sm font-medium text-primary hover:text-secondary
                               underline-offset-2 hover:underline cursor-pointer
                               transition-colors duration-200">
                    Promote
                  </button>
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

---

### Loading / Skeleton State (Auth Hydration)

Shown full-page while `AuthProvider` awaits `GET /auth/me` on mount (`isLoading === true`).
Keep it minimal — one centered spinner, no skeleton rows.

```
// Full-page overlay
min-h-screen bg-background flex items-center justify-center

// Spinner icon (Lucide Loader2 with spin animation)
text-primary w-8 h-8 animate-spin
```

**TSX:**

```tsx
// In AuthProvider / App.tsx, before routing resolves:
if (isLoading) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="text-primary w-8 h-8 animate-spin" />
    </div>
  );
}
```

**`prefers-reduced-motion`:** Tailwind's `animate-spin` does not respect
`prefers-reduced-motion` by default. Add this to `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-spin { animation: none; }
}
```

**Icon:** `Loader2` from `lucide-react`. No text, no skeleton, no logo during this state —
the spinner alone signals "loading" without distracting content.

---

### Inline Notification Banner

Displayed above the login form when the user's session has expired and they were redirected
from a protected route (User Story 3 AC3). Also used for general auth error banners.

```
// Banner wrapper
w-full rounded-lg px-4 py-3 mb-6 flex items-start gap-3
text-sm font-medium

// Warning variant (session expired)
bg-amber-50 border border-amber-200 text-amber-800

// Error variant (e.g., account issue)
bg-red-50 border border-red-200 text-red-800
```

**Accessibility:** Banner uses `role="alert"` so screen readers announce it immediately.
Do **not** use `role="alert"` on field-level `<FormMessage>` — reserve it for this banner.

**TSX:**

```tsx
{sessionExpired && (
  <div
    role="alert"
    className="w-full rounded-lg px-4 py-3 mb-6 flex items-start gap-3
               bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium"
  >
    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
    <span>Your session has expired. Please sign in again.</span>
  </div>
)}
```

**Icon:** `AlertCircle` from `lucide-react`.

**Placement:** Renders inside the auth card, directly above the `<form>` element.
Dismissed automatically when the user starts typing or navigates away — no manual close button
needed for MVP.
