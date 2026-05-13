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

---

## Sidebar Shell (Feature 003-ui-layout-overhaul)

> These sections govern the universal layout shell used by all authenticated pages.
> They extend the rules above — global rules still apply unless explicitly overridden here.

---

### Layout Contract

All protected pages render inside the sidebar shell. The following conventions are
**mandatory** for every page — do not override per-page.

| Convention | Tailwind Classes | Notes |
|------------|-----------------|-------|
| Sidebar width | `w-[220px]` | Fixed, not fluid |
| Content area offset (desktop) | `md:ml-[220px]` | Applied by `AppLayout.tsx`, not per-page |
| Standard page wrapper | `px-6 py-8` | Every page's outermost `<div>` |
| Form content column | `w-full max-w-2xl mx-auto` | SubmitIdea, any single-column form |
| Detail content column | `w-full max-w-3xl` | IdeaDetail, any long-form content page |
| Table/list pages | Full-width (no column) | Ideas list, Users list |
| Page heading | `font-heading font-semibold text-xl text-primary mb-6` | Every page's `<h1>` |

**Z-index layers** (must not be violated by page-level components):

| Layer | z-index | Element |
|-------|---------|---------|
| Page content | default | Normal page content |
| Mobile backdrop | `z-30` | Semi-transparent overlay behind sidebar |
| Sidebar panel | `z-40` | Sidebar panel (desktop always-on + mobile overlay) |
| Hamburger button | `z-50` | Mobile-only toggle button |

---

### Sidebar Shell Component

Fixed left panel. Full viewport height, always visible on desktop, slides in as overlay on
mobile.

```
// Sidebar panel
fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-border
flex flex-col z-40 shadow-sm
transition-transform duration-300
md:translate-x-0
```

```tsx
// AppLayout.tsx — content area wrapper
<div className="md:ml-[220px] min-h-screen bg-background">
  <Outlet />
</div>
```

**TSX structure:**

```tsx
export default function Sidebar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-white rounded-lg p-2 shadow-md
                   border border-border cursor-pointer"
        onClick={() => setMobileOpen(v => !v)}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-border',
          'flex flex-col z-40 shadow-sm transition-transform duration-300',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="px-6 py-5 border-b border-border">
          <Link to="/" onClick={() => setMobileOpen(false)}
            className="font-heading font-bold text-lg text-primary leading-none">
            InnovatEpam
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1" aria-label="Main navigation">
          {NAV_ITEMS.filter(item => item.roles.includes(user?.role ?? '')).map(item => {
            const active = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to))
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-all duration-200 cursor-pointer',
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-slate-500 hover:text-primary hover:bg-primary/5'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-slate-700 truncate flex-1">
              {user?.full_name}
            </span>
            <Badge variant={user?.role === 'admin' ? 'admin' : 'submitter'}>
              {user?.role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-500 hover:text-primary"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
```

**Icons used**: `Menu`, `X`, `LogOut` from `lucide-react` (all already installed).

---

### Nav Item Active Pill

```
// Default (inactive)
flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
text-slate-500 hover:text-primary hover:bg-primary/5 transition-all duration-200

// Active (filled pill)
bg-primary/10 text-primary font-semibold
```

**Active detection rule**: `pathname === to || (to !== '/' && pathname.startsWith(to))`

This means visiting `/ideas/42` highlights the "Ideas" nav item, and visiting `/` (exactly)
highlights "Home" without incorrectly matching sub-routes.

---

### Nav Item Configuration

```ts
const NAV_ITEMS = [
  { to: '/',       label: 'Home',           icon: Home,        roles: ['submitter', 'admin'] },
  { to: '/ideas',  label: 'Ideas',          icon: Lightbulb,   roles: ['submitter', 'admin'] },
  { to: '/submit', label: 'Submit an Idea', icon: PlusCircle,  roles: ['submitter'] },
  { to: '/users',  label: 'Manage Users',   icon: Users,       roles: ['admin'] },
]
```

**Icons**: `Home`, `Lightbulb`, `PlusCircle`, `Users` from `lucide-react`.

---

### Mobile Sidebar Overlay

```
// Hamburger button (visible only on mobile: md:hidden)
fixed top-4 left-4 z-50 md:hidden
bg-white rounded-lg p-2 shadow-md border border-border cursor-pointer

// Backdrop
fixed inset-0 bg-black/30 z-30 md:hidden

// Panel transition
transition-transform duration-300
md:translate-x-0
// Open:   translate-x-0
// Closed: -translate-x-full
```

**Accessibility**: hamburger button has `aria-label` describing current state. The sidebar
`<aside>` uses `aria-label="Main navigation"`. Active nav items have `aria-current="page"`.

---

### "My Ideas" Filter Toggle (Ideas Page)

Shown **only to users with the `submitter` role**. Placed above the ideas table, right-aligned.

```
// Toggle wrapper (above table)
flex items-center justify-end gap-2 mb-4

// Label
text-sm font-medium text-slate-600 cursor-pointer select-none

// Checkbox — uses existing shadcn/ui <Checkbox> component
// Checked state: bg-primary border-primary
```

**TSX pattern:**

```tsx
{user?.role === 'submitter' && (
  <div className="flex items-center justify-end gap-2 mb-4">
    <label
      htmlFor="mine-filter"
      className="text-sm font-medium text-slate-600 cursor-pointer select-none"
    >
      My Ideas
    </label>
    <Checkbox
      id="mine-filter"
      checked={mine}
      onCheckedChange={(checked) => {
        const next = new URLSearchParams(searchParams)
        if (checked) { next.set('mine', '1'); next.set('page', '1') }
        else { next.delete('mine'); next.set('page', '1') }
        setSearchParams(next)
      }}
    />
  </div>
)}
```

---

## Idea Submission Components (Feature 002-idea-submission)

> These sections govern all UI in `002-idea-submission`. They extend the rules above —
> global rules still apply unless explicitly overridden here.

**New CSS addition — add once to `globals.css`** (shimmer animation for skeleton states):

```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.animate-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-shimmer { animation: none; background: #f1f5f9; }
}
```

---

### Idea Submission Form Layout

Full-page centred content column rendered inside the authenticated sidebar layout.
Wider than the auth card — no card shadow, no floating panel.
Evaluator users see the Role-Restriction Notice (see below) in place of the form.

```
// Page wrapper (inside authenticated layout content area)
px-6 py-12

// Content column
w-full max-w-2xl mx-auto

// Page heading
font-heading font-semibold text-2xl text-primary mb-8

// Form fields stack
flex flex-col gap-6

// Submit button — full-width, follows last field
mt-2 w-full
```

**TSX structure:**

```tsx
<div className="px-6 py-12">
  <div className="w-full max-w-2xl mx-auto">
    <h1 className="font-heading font-semibold text-2xl text-primary mb-8">
      Submit an Idea
    </h1>
    {user.role === 'evaluator' ? (
      <RoleRestrictionNotice />
    ) : (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Title field + CharacterCounter */}
          {/* Description textarea + CharacterCounter */}
          {/* Category Select */}
          {/* FileUploadControl */}
          <Button type="submit" variant="default" className="w-full mt-2">
            Submit
          </Button>
        </form>
      </Form>
    )}
  </div>
</div>
```

**Responsive:** Column is `max-w-2xl` (672 px) on desktop; on mobile (`<375 px`) it fills
`w-full` with the `px-6` gutter. Always preserve at least 16 px edge padding.

**Width comparison:** Auth card is `max-w-md` (448 px). This form column is `max-w-2xl`
(672 px) — intentionally wider to give long descriptions and file controls breathing room.

---

### Category Select

shadcn/ui `<Select>` with four fixed options. Required field — no blank default.

**Options:** Process Improvement · Technology · Cost Saving · Other

**Visual states:**

| State | Trigger appearance |
|-------|--------------------|
| Default / unfocused | `border-border text-slate-500` (placeholder text) |
| Focused / open | `border-primary ring-2 ring-primary/20`; dropdown `shadow-lg rounded-lg` |
| Value selected | `border-border text-slate-900` |
| Error (no selection on submit) | `border-red-500 ring-2 ring-red-500/20` |

```
// SelectTrigger — base
w-full px-4 py-3 border rounded-lg text-base transition-colors duration-200 cursor-pointer

// SelectItem — each option row
px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer
```

**TSX pattern:**

```tsx
<FormField control={form.control} name="category" render={({ field }) => (
  <FormItem>
    <FormLabel>Category</FormLabel>
    <Select onValueChange={field.onChange} defaultValue={field.value}>
      <FormControl>
        <SelectTrigger
          className={cn(
            "w-full px-4 py-3 border rounded-lg text-base transition-colors duration-200",
            form.formState.errors.category
              ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
          )}
        >
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
      </FormControl>
      <SelectContent className="bg-white border border-border shadow-lg rounded-lg">
        <SelectItem value="process_improvement">Process Improvement</SelectItem>
        <SelectItem value="technology">Technology</SelectItem>
        <SelectItem value="cost_saving">Cost Saving</SelectItem>
        <SelectItem value="other">Other</SelectItem>
      </SelectContent>
    </Select>
    <FormMessage className="text-red-600 text-xs mt-1" />
  </FormItem>
)} />
```

---

### Character Counter

Rendered directly below the `<Input>` (title, max 150 chars) and `<Textarea>`
(description, max 3 000 chars). Right-aligned muted text; turns red when the remaining
character count is ≤ 10 % of the field limit.

**Thresholds:**

| Field | Max | Red at remaining ≤ |
|-------|-----|---------------------|
| Title | 150 | 15 |
| Description | 3 000 | 300 |

**Classes — normal:** `text-xs text-slate-400 text-right mt-1 select-none`

**Classes — warning (≤ 10 % remaining):** `text-xs text-red-500 text-right mt-1 select-none`

**Reusable component:**

```tsx
interface CharacterCounterProps {
  current: number;
  max: number;
}

export function CharacterCounter({ current, max }: CharacterCounterProps) {
  const remaining = max - current;
  const isWarning = remaining <= Math.floor(max * 0.1);
  return (
    <p className={cn(
      "text-xs text-right mt-1 select-none",
      isWarning ? "text-red-500" : "text-slate-400"
    )}>
      {current} / {max}
    </p>
  );
}
```

**Placement within a FormField:**

```tsx
<FormField control={form.control} name="title" render={({ field }) => (
  <FormItem>
    <FormLabel>Title</FormLabel>
    <FormControl>
      <Input maxLength={150} {...field} />
    </FormControl>
    <CharacterCounter current={field.value?.length ?? 0} max={150} />
    <FormMessage className="text-red-600 text-xs mt-1" />
  </FormItem>
)} />
```

Render `<CharacterCounter>` between `<FormControl>` and `<FormMessage>` so the counter
sits flush below the input and any error message appears last.

---

### File Upload Control

Single-file picker, button-triggered. No drag-and-drop in v1.
Accepted types: PDF, DOCX, PNG, JPG. Max size: 10 MB.
Primary icon: `Paperclip` from `lucide-react`.

**States:**

| State | Visual |
|-------|--------|
| Idle | Secondary-style button: Paperclip icon + "Attach a file" label |
| File selected | Row: icon + filename + size label + × clear button |
| Error — wrong type | Red text below: "Only PDF, DOCX, PNG, and JPG files are accepted." |
| Error — oversized | Red text below: "File must be 10 MB or smaller." |

```
// Idle button
inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg
text-sm font-medium hover:bg-primary/5 transition-colors duration-200 cursor-pointer
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40

// Selected row wrapper
flex items-center gap-3 px-4 py-3 border border-border rounded-lg bg-white

// Filename + size
flex-1 text-sm text-slate-700 truncate   (size suffix: text-slate-400)

// Clear (×) button
text-slate-400 hover:text-slate-600 transition-colors duration-200 cursor-pointer
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded

// Error text (both variants)
text-red-500 text-xs mt-1
```

**TSX pattern:**

```tsx
import { Paperclip, X } from 'lucide-react';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function FileUploadControl({ onChange }: { onChange: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<'type' | 'size' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) { setError('type'); setFile(null); return; }
    if (selected.size > MAX_SIZE_BYTES)          { setError('size'); setFile(null); return; }
    setError(null); setFile(selected); onChange(selected);
  };

  const handleClear = () => {
    setFile(null); setError(null); onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const formatSize = (b: number) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div>
      <input ref={inputRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg"
             className="sr-only" onChange={handleSelect} aria-label="Attach a file" />

      {!file ? (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary
                     text-primary rounded-lg text-sm font-medium
                     hover:bg-primary/5 transition-colors duration-200 cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <Paperclip className="w-4 h-4" />
          Attach a file
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg bg-white">
          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="flex-1 text-sm text-slate-700 truncate">
            {file.name} <span className="text-slate-400">({formatSize(file.size)})</span>
          </span>
          <button type="button" onClick={handleClear} aria-label="Remove file"
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200
                       cursor-pointer focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error === 'type' && (
        <p className="text-red-500 text-xs mt-1">Only PDF, DOCX, PNG, and JPG files are accepted.</p>
      )}
      {error === 'size' && (
        <p className="text-red-500 text-xs mt-1">File must be 10 MB or smaller.</p>
      )}
    </div>
  );
}
```

**Icons:** `Paperclip`, `X` from `lucide-react`. Do **not** use emojis or custom SVGs.

---

### Ideas List Page Layout

Full-width authenticated page rendered inside the sidebar layout. Lists all submitted ideas
ordered newest-first.

```
// Page wrapper
px-6 py-8

// Page heading
font-heading font-semibold text-xl text-primary mb-6

// Table wrapper — same as UserTable
overflow-x-auto rounded-xl border border-border shadow-sm

// Table header row
bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide

// Table body row — default
bg-white border-b border-border last:border-0

// Table body row — hover
hover:bg-slate-50 transition-colors duration-150

// Table cell
px-4 py-3 text-sm text-slate-700

// Title link
text-primary font-medium hover:underline underline-offset-2 cursor-pointer
transition-colors duration-200
```

**Columns:**

| Column | Content | Width hint |
|--------|---------|------------|
| Title | `<Link>` to `/ideas/:id` | `w-2/5` |
| Category | `<CategoryBadge>` | `w-1/5` |
| Submitter | Full name string | `w-1/5` |
| Date | `idea.submitted_at.slice(0, 10)` | `w-1/5` |

**Empty state (when `ideas.length === 0`):**

```
// Wrapper
flex flex-col items-center justify-center py-20 text-center gap-4

// Icon — Lightbulb from lucide-react
w-12 h-12 text-slate-300

// Heading
text-base font-semibold text-slate-500

// Sub-text
text-sm text-slate-400

// CTA — visible to Submitters only, hidden for Evaluators
<Button variant="default"> Submit an Idea </Button>
```

**TSX skeleton:**

```tsx
<div className="px-6 py-8">
  <h1 className="font-heading font-semibold text-xl text-primary mb-6">Ideas</h1>

  {isLoading ? (
    <IdeasTableSkeleton />
  ) : ideas.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <Lightbulb className="w-12 h-12 text-slate-300" />
      <p className="text-base font-semibold text-slate-500">No ideas yet</p>
      <p className="text-sm text-slate-400">Be the first to submit an idea.</p>
      {user.role === 'submitter' && (
        <Button variant="default" asChild>
          <Link to="/submit">Submit an Idea</Link>
        </Button>
      )}
    </div>
  ) : (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-2/5">Title</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/5">Category</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/5">Submitter</TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/5">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map(idea => (
            <TableRow key={idea.id} className="hover:bg-slate-50 transition-colors duration-150">
              <TableCell className="px-4 py-3">
                <Link to={`/ideas/${idea.id}`}
                  className="text-primary font-medium hover:underline underline-offset-2
                             cursor-pointer transition-colors duration-200">
                  {idea.title}
                </Link>
              </TableCell>
              <TableCell className="px-4 py-3"><CategoryBadge category={idea.category} /></TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-700">{idea.submitter_name}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-700">{idea.submitted_at.slice(0, 10)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )}
</div>
```

---

### Idea Detail Page Layout

Single-column authenticated page. No edit or delete controls in v1.

```
// Page wrapper
px-6 py-8

// Content column
w-full max-w-3xl

// Header block
mb-8

// Idea title (h1)
font-heading font-semibold text-2xl text-primary mb-3

// Meta row (submitter · date)
flex items-center gap-2 text-sm text-slate-400 mt-2

// Body (description)
font-body text-base text-slate-700 leading-relaxed max-w-prose mt-6

// Footer separator
mt-10 pt-6 border-t border-border
```

**TSX structure:**

```tsx
<div className="px-6 py-8">
  <div className="w-full max-w-3xl">

    {/* Header */}
    <div className="mb-8">
      <h1 className="font-heading font-semibold text-2xl text-primary mb-3">
        {idea.title}
      </h1>
      <CategoryBadge category={idea.category} />
      <p className="flex items-center gap-2 text-sm text-slate-400 mt-2">
        <span>{idea.submitter_name}</span>
        <span>·</span>
        <span>{idea.submitted_at.slice(0, 10)}</span>
      </p>
    </div>

    {/* Body */}
    <p className="font-body text-base text-slate-700 leading-relaxed max-w-prose mt-6">
      {idea.description}
    </p>

    {/* Footer — omitted entirely for non-authorised viewers */}
    {canDownload && idea.file && (
      <div className="mt-10 pt-6 border-t border-border">
        <FileDownloadBlock file={idea.file} />
      </div>
    )}
  </div>
</div>
```

**`canDownload` rule:** `user.id === idea.submitter_id || user.role === 'evaluator'`.
For all other Submitters the footer `<div>` is not rendered — not disabled, not hidden with CSS.

---

### Category Badge

Neutral pill for displaying an idea's category label. Light grey background, dark text.
Intentionally distinct from the role badges in UserTable (which use blue/slate tones).

```
inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
bg-slate-100 text-slate-700
```

**Reusable component:**

```tsx
const CATEGORY_LABELS: Record<string, string> = {
  process_improvement: 'Process Improvement',
  technology:          'Technology',
  cost_saving:         'Cost Saving',
  other:               'Other',
};

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full
                     text-xs font-medium bg-slate-100 text-slate-700">
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}
```

**Do NOT** use `bg-primary/10 text-primary` (reserved for the Admin role badge).
Category badges are always grey regardless of value.

---

### File Download Block

Shown on the Idea Detail page when a file attachment exists AND the viewer is either the
idea's original submitter or an Evaluator. Hidden entirely (not rendered, not greyed out)
for all other Submitters.

**File type icon mapping:**

| Extension | Icon (lucide-react) |
|-----------|---------------------|
| `.pdf`, `.docx` | `FileText` |
| `.png`, `.jpg`, `.jpeg` | `Image` |

```
// Block wrapper
flex items-center gap-4

// Icon
w-5 h-5 text-slate-500

// Filename
text-sm font-medium text-slate-700 truncate max-w-xs

// Download button
Secondary / outline variant — border-primary text-primary hover:bg-primary/5
```

**TSX pattern:**

```tsx
import { FileText, Image as ImageIcon } from 'lucide-react';

function fileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return (ext === 'png' || ext === 'jpg' || ext === 'jpeg')
    ? <ImageIcon className="w-5 h-5 text-slate-500" />
    : <FileText className="w-5 h-5 text-slate-500" />;
}

export function FileDownloadBlock({ file }: { file: { name: string; url: string } }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        {fileIcon(file.name)}
        <span className="text-sm font-medium text-slate-700 truncate max-w-xs">
          {file.name}
        </span>
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href={file.url} download={file.name}>Download</a>
      </Button>
    </div>
  );
}
```

---

### Ideas List Skeleton / Loading State

Shimmer-effect placeholder rows shown while `GET /ideas` is in flight. Each skeleton row
mirrors the four column widths of the Ideas List table. Uses the `.animate-shimmer` class
defined in the CSS addition at the top of this feature section.

```
// Row wrapper — matches real data row height
flex items-center gap-4 px-4 py-3 border-b border-border last:border-0

// Title placeholder (wide)
h-4 rounded animate-shimmer w-2/5

// Category placeholder (pill shape)
h-5 rounded-full animate-shimmer w-20

// Submitter placeholder
h-4 rounded animate-shimmer flex-1

// Date placeholder (short)
h-4 rounded animate-shimmer w-24
```

**TSX pattern:**

```tsx
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
      <div className="h-4 rounded animate-shimmer w-2/5" />
      <div className="h-5 rounded-full animate-shimmer w-20" />
      <div className="h-4 rounded animate-shimmer flex-1" />
      <div className="h-4 rounded animate-shimmer w-24" />
    </div>
  );
}

export function IdeasTableSkeleton() {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-border shadow-sm"
      aria-label="Loading ideas"
    >
      <div className="bg-slate-50 px-4 py-3 border-b border-border" aria-hidden="true">
        <div className="flex gap-4">
          <div className="h-3 rounded animate-shimmer w-2/5" />
          <div className="h-3 rounded animate-shimmer w-1/5" />
          <div className="h-3 rounded animate-shimmer w-1/5" />
          <div className="h-3 rounded animate-shimmer w-1/5" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
```

**Accessibility:** The `aria-label="Loading ideas"` on the wrapper lets screen readers
announce the loading state without reading out placeholder widths.

---

### Role-Restriction Notice

Calm informational banner displayed to Evaluators on the Submit Idea page in place of the
form. Uses a blue-tinted background — **not amber** (amber is committed to session-expiry
warnings; see Inline Notification Banner above).

```
// Banner wrapper
w-full rounded-lg px-4 py-4 flex items-start gap-3
bg-blue-50 border border-blue-200 text-blue-800 text-sm

// Icon — Info from lucide-react
w-5 h-5 shrink-0 mt-0.5
```

**Text:** "Your role is **Evaluator**. You can browse and evaluate ideas, but idea submission
is reserved for Submitters."

**Accessibility:** Uses `role="status"` (not `role="alert"`) — this is expected, non-urgent
information. Screen readers may announce it at a natural pause rather than interrupting.

**TSX:**

```tsx
import { Info } from 'lucide-react';

export function RoleRestrictionNotice() {
  return (
    <div
      role="status"
      className="w-full rounded-lg px-4 py-4 flex items-start gap-3
                 bg-blue-50 border border-blue-200 text-blue-800 text-sm"
    >
      <Info className="w-5 h-5 shrink-0 mt-0.5" />
      <span>
        Your role is <strong>Evaluator</strong>. You can browse and evaluate ideas,
        but idea submission is reserved for Submitters.
      </span>
    </div>
  );
}
```

**Do NOT** use `bg-amber-50 / border-amber-200` here — that palette is committed to
session-expiry warnings. Blue is strictly for informational role/permission notices.
