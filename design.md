# Meerub Salon Software — Design System & UI Specification

This document serves as the single source of truth for all UI/UX components, design tokens, color codes, typography, button sizes, icons, and layout rules across Meerub Salon Software.

---

## 1. Color Palette & Design Tokens

The software uses a **Luxury Velvet Berry & Soft Blush Rose** theme designed specifically for high-end beauty salons and aesthetics studios.

### 1.1 Brand & Accent Colors

| Token Name | HEX Code | Tailwind Utility / CSS Var | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **Primary Brand (Berry)** | `#9D2558` | `bg-[#9D2558]`, `text-[#9D2558]` | Main brand color, primary buttons, active links, peak indicators, selection highlight |
| **Primary Hover (Wine)** | `#851C47` | `hover:bg-[#851C47]` | Hover state for primary buttons and interactive elements |
| **Primary Active / Dark** | `#6A1237` | `active:bg-[#6A1237]` | Pressed / active state for primary buttons |
| **Deep Plum Gradient End** | `#550C2C` | `to-[#550C2C]` | Deep gradient shade used on hero metric cards |
| **Secondary Accent (Rose)** | `#B3396D` | `bg-[#B3396D]` | Secondary metric cards, highlights |

### 1.2 Neutral & Surface Colors

| Token Name | HEX Code | Tailwind Utility | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **Page Canvas Background** | `#FBF5F7` | `bg-[#FBF5F7]` | Global body background; soft warm blush off-white |
| **Card / Surface Background**| `#FFFFFF` | `bg-white` | Surfaces for cards, modals, tables, dropdowns |
| **Subtle Tint / Section BG**| `#FDF2F5` | `bg-[#FDF2F5]` | Table headers, secondary pills, date strips, chart card backgrounds |
| **Soft Rose Highlight** | `#FCE8EC` | `bg-[#FCE8EC]` | Active navigation background, badge background, avatar background |
| **Border Primary** | `#F1DEE3` | `border-[#F1DEE3]` | Default border for all cards, tables, inputs, separators |
| **Border Accent / Active** | `#F8D2DC` | `border-[#F8D2DC]` | Border for active pills, focused tags, or highlighted containers |

### 1.3 Text & Typography Colors

| Token Name | HEX Code | Tailwind Utility | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **Primary Heading / Text** | `#23151D` | `text-[#23151D]` | Main headers (h1, h2, h3), card values, high-contrast text |
| **Body Secondary Text** | `#4A3E45` | `text-slate-700` / `text-[#4A3E45]` | Standard body copy, labels, table cell content |
| **Muted / Subtitle Text** | `#78616C` | `text-slate-500` / `text-[#78616C]` | Timestamps, helper text, subtitles, table headers |
| **Placeholder / Disabled** | `#A898A1` | `text-slate-400` / `placeholder:text-slate-400` | Input placeholder text, disabled icons |

### 1.4 Status & Semantic Colors

| Status | Text Color | Background Color | Border Color | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | `text-emerald-700` (`#047857`) | `bg-emerald-50` (`#ECFDF5`) | `border-emerald-200` | Completed appointments, active drawers, received payments |
| **Warning** | `text-amber-700` (`#B45309`) | `bg-amber-50` (`#FFFBEB`) | `border-amber-200` | Pending balances, due invoices, in-progress items |
| **Danger / Error** | `text-rose-700` (`#BE123C`) | `bg-rose-50` (`#FFF1F2`) | `border-rose-200` | Cancelled bookings, voided bills, validation errors |
| **Info / Primary** | `text-[#9D2558]` | `bg-[#FCE8EC]` | `border-[#F8D2DC]` | Notice banners, active filters, selected items |

---

## 2. Typography

* **Font Family:** `Inter`, system-ui, sans-serif
* **Monospace Font (Currency / Numbers / Codes):** `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`

### 2.1 Hierarchy & Scale

| Level | Size | Weight | Line Height | Tracking | Class Combination |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title (H1)** | `24px` (`text-2xl`) | Bold (`font-bold`) | `1.25` | `tracking-tight` | `text-xl sm:text-2xl font-bold tracking-tight text-[#23151D]` |
| **Section Title (H2)**| `18px` (`text-lg`) | Bold (`font-bold`) | `1.3` | `tracking-tight` | `text-lg font-bold tracking-tight text-[#23151D]` |
| **Card Title (H3)** | `14px` (`text-sm`) | Bold / Semibold | `1.4` | `tracking-tight` | `text-sm font-bold text-[#23151D]` |
| **Body (Default)** | `14px` (`text-sm`) | Normal (`font-normal`)| `1.5` | Normal | `text-sm text-[#23151D]` |
| **Small / Helper** | `12px` (`text-xs`) | Medium (`font-medium`)| `1.4` | Normal | `text-xs text-slate-500` |
| **Micro / Badges** | `10px`–`11px` | Semibold (`font-semibold`) | `1.3` | `tracking-wider` | `text-[10px] font-semibold uppercase tracking-wider` |
| **Financial Figures** | `20px`–`24px` | Extrabold (`font-extrabold`)| `1.2` | `tabular-nums` | `text-2xl font-mono font-extrabold text-[#23151D] tabular-nums` |

---

## 3. Icons (Always from Libraries)

> [!IMPORTANT]
> **RULE:** Never use inline raw SVG strings or custom image icons for UI actions. **ALWAYS** import icons from `lucide-react`.

### 3.1 Standard Icon Sizing

| Sizing Token | Dimensions | Tailwind Class | Recommended Context |
| :--- | :--- | :--- | :--- |
| **Micro** | `12px x 12px` | `w-3 h-3` | Inside badges, table action buttons, inline arrows |
| **Small (Default for Buttons)** | `14px x 14px` | `w-3.5 h-3.5` | Standard buttons (`sm`), inputs prefix/suffix, dropdown carets |
| **Medium (Nav / Headers)** | `16px x 16px` | `w-4 h-4` | Navigation items, header icons, card title icons |
| **Large (Hero / Stat Cards)**| `20px x 20px` | `w-5 h-5` | Stat card icon badges, modal titles, page banners |
| **Empty State / Illustrative**| `32px x 32px` | `w-8 h-8` | Empty list placeholders, modal illustrations |

### 3.2 Icon Styling Examples

```tsx
// Inside primary button:
<Button leftIcon={<Plus className="w-3.5 h-3.5" />}>
  New Booking
</Button>

// In an icon container badge:
<div className="w-8 h-8 rounded-full bg-[#FCE8EC] text-[#9D2558] flex items-center justify-center font-bold text-xs border border-[#F8D2DC]">
  <Calendar className="w-4 h-4" />
</div>
```

---

## 4. Buttons (`Button` Component)

Always use `@/components/ui/button`. Do not write raw unstyled `<button>` tags.

### 4.1 Button Sizes

| Size | Height | Padding | Text Size | Icon Size | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `xs` | `h-7` (28px) | `px-2.5 py-1` | `text-xs` | `w-3 h-3` | Table inline actions, micro filters |
| `sm` | `h-8` (32px) | `px-3 py-1.5` | `text-xs` | `w-3.5 h-3.5` | Secondary actions, modals, toolbar filters |
| `md` (Default) | `h-9` (36px) | `px-4 py-2` | `text-sm` | `w-4 h-4` | Forms, modal submits, standard CTAs |
| `lg` | `h-11` (44px) | `px-6 py-2.5` | `text-base` | `w-5 h-5` | Checkout finalize, POS keypad actions |

### 4.2 Button Variants

| Variant | Appearance | Tailwind Classes |
| :--- | :--- | :--- |
| **`primary` / `default`** | Solid berry background with white text | `bg-[#9D2558] text-white hover:bg-[#851C47] shadow-xs` |
| **`outline`** | White surface with rose border | `border border-[#F1DEE3] bg-white text-[#23151D] hover:bg-[#FDF2F5] hover:text-[#9D2558]` |
| **`secondary`** | Soft blush background with dark berry text | `bg-[#FDF2F5] text-[#9D2558] hover:bg-[#FCE8EC]` |
| **`ghost`** | Transparent background, subtle hover | `hover:bg-[#FDF2F5] hover:text-[#9D2558] text-slate-600` |
| **`danger` / `destructive`** | Rose red background with white text | `bg-rose-600 text-white hover:bg-rose-700` |

### 4.3 Border Radius
* All buttons must use `rounded-xl` (or `rounded-full` for icon-only action pills).

---

## 5. Cards & Containers

Always use `@/components/ui/card` or consistent card classes.

* **Corner Radius:** `rounded-2xl` (16px) for cards; `rounded-xl` (12px) for sub-cards or inner rows.
* **Border:** `border border-[#F1DEE3]`
* **Background:** `bg-white` (or `bg-gradient-to-br from-[#9D2558] via-[#851C47] to-[#6A1237]` for hero cards)
* **Shadow:** `shadow-xs` or `shadow-2xs` (avoid heavy dark drop-shadows; keep soft and light)

### 5.1 Card Structure
```tsx
<Card className="bg-white border-[#F1DEE3] shadow-xs rounded-2xl p-4 sm:p-5 space-y-4">
  <div className="flex items-center justify-between border-b border-[#F1DEE3] pb-3">
    <h3 className="text-sm font-bold text-[#23151D]">Card Header</h3>
    <Badge variant="primary">Active</Badge>
  </div>
  <div>
    {/* Content */}
  </div>
</Card>
```

---

## 6. Form Inputs & Selects

Always use `@/components/ui/input` or the standardized select class:

```ts
export const selectClass = 
  'w-full rounded-xl border border-[#F1DEE3] bg-white px-3 py-2 text-sm text-[#23151D] ' +
  'focus:outline-none focus:ring-2 focus:ring-[#9D2558]/20 focus:border-[#9D2558] transition-colors';
```

* **Height:** `h-10` (40px)
* **Corner Radius:** `rounded-xl` (12px)
* **Border:** `border border-[#F1DEE3]`
* **Focus State:** `focus:border-[#9D2558] focus:ring-2 focus:ring-[#9D2558]/20`
* **Placeholder:** `placeholder:text-slate-400`

---

## 7. Tables (`Table` Component)

Always use `@/components/ui/table` or standard reporting classes:

* **Header (`thead`):** `bg-[#FDF2F5] text-[#23151D] font-semibold text-xs border-b border-[#F1DEE3]`
* **Rows (`tr`):** `border-b border-[#F1DEE3] hover:bg-[#FDF2F5]/60 transition-colors`
* **Cells (`td`):** `py-3 px-4 text-xs sm:text-sm text-[#23151D]`
* **Currency Columns:** Right-aligned, `font-mono tabular-nums font-semibold`
* **Container:** `overflow-x-auto rounded-2xl border border-[#F1DEE3] bg-white shadow-xs`

---

## 8. Status Badges (`Badge` Component)

Always use `@/components/ui/badge`.

| Variant | Classes | Example Use |
| :--- | :--- | :--- |
| `primary` / `default` | `border border-[#F8D2DC] bg-[#FCE8EC] text-[#9D2558]` | Active status, Bridal/Groom type |
| `success` | `border border-emerald-200 bg-emerald-50 text-emerald-700` | Completed, Paid in full |
| `warning` | `border border-amber-200 bg-amber-50 text-amber-700` | Partial payment, In progress |
| `destructive` | `border border-rose-200 bg-rose-50 text-rose-700` | Cancelled, No-show |
| `neutral` | `border border-[#F1DEE3] bg-white text-slate-700` | Count labels, timestamps |

* **Shape:** `rounded-full px-2.5 py-0.5 text-xs font-semibold`

---

## 9. Golden Rules for Developers & AI Agents

1. **Never introduce raw blues (`#2254E1`, `bg-blue-600`, etc.)**: All active accents must use Berry (`#9D2558`) or Blush (`#FCE8EC`).
2. **Never hardcode inline SVGs**: Always import from `lucide-react`.
3. **Keep Typography Uniform**: Always keep `Inter` as the primary font family. Do not swap fonts.
4. **Always use rounded-xl / rounded-2xl**: High-end luxury feel requires soft, rounded corners rather than sharp square edges (`rounded-md` or `rounded-sm`).
5. **Border consistency**: Default card and divider borders should always be `#F1DEE3`.
