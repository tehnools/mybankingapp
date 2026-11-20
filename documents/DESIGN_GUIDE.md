# NZ Money Manager — UI & Design System Guide

This design guide defines the visual language, color palette, typography, spacing, and component rules for **NZ Money Manager**. All screens and components should consume colors through `useAppTheme()` ([lib/theme.ts](../lib/theme.ts)).

---

## 1. Brand & Color Palette

The color system is anchored by **`#E06D53` (Terracotta Coral)** as the primary accent, paired with warm stone neutrals and deep obsidian/charcoal headers for high financial contrast.

### Primary & Brand Accents
| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `primary` | `TERRACOTTA_CORAL` (`#E06D53`) | `TERRACOTTA_CORAL` (`#E06D53`) | Primary CTA buttons, active tab icon/label, focus rings, filled PIN dots, interactive links |
| `primarySoft` | `#FDF0ED` | `#3D201A` | Icon container badges, secondary pill buttons (`Sync`, `Edit`, `Paste`), subtle highlight banners |

### Surfaces & Backgrounds
| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `headerBackground` | `#1C1917` | `#121117` | Top navigation header bar, App Lock screen backdrop, Net Account Balance hero cards |
| `headerText` | `#FFFFFF` | `#FAF8F6` | Text and icons rendered inside `headerBackground` or hero balance cards |
| `background` | `#FAF8F6` | `#121117` | Screen canvas / scroll view background |
| `card` | `#FFFFFF` | `#1E1C26` | Elevated cards, account list rows, modals, bottom tab bar surface |
| `border` | `#ECE6E1` | `#2E2B3B` | Card outlines, input borders, dividers, top border of the bottom tab bar |

### Typography & Icon Hierarchy
| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `text` | `#1C1917` | `#FAF8F6` | Primary headings, account titles, input values, keypad numerals |
| `subtext` | `#68615C` | `#A8A29E` | Descriptions, bank & account number metadata, secondary labels |
| `muted` | `#A09892` | `#78716C` | Inactive tab icons, input placeholders, disabled icons, trailing chevrons |

### Financial & Semantic States
| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `positive` | `#15803D` | `#34D399` | Positive account balances, income/credit amounts, "Akahu Connected" status |
| `positiveSoft` | `#ECFDF5` | `#064E3B` | Connected status card fill, success banners |
| `negative` | `#DC2626` | `#F87171` | Overdrawn/negative balances, debit amounts, destructive actions (`Wipe`), error text |
| `negativeSoft` | `#FEF2F2` | `#7F1D1D` | Error banners, warning modal icon badge |
| `notification` | `TERRACOTTA_CORAL` (`#E06D53`) | `TERRACOTTA_CORAL` (`#E06D53`) | Badge counters and system alerts |

---

## 2. Typography Rules

All text must be rendered using the unified **`<Text>`** component from [`components/app-text.tsx`](../components/app-text.tsx), which automatically prevents single-word orphans (`\u00A0` on the final word pair) and applies balanced line breaking (`textBreakStrategy="balanced"`).

| Role | Size | Weight | Line Height | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Balance Amount** | `34px` | `800` (ExtraBold) | `40px` | Used on Net Account Balance cards (`preventOrphans={false}`) |
| **Screen Title** | `22px` | `700` (Bold) | `28px` | Top section headers (`Your Bank Accounts`, `Unlock NZ Money Manager`) |
| **Card / Modal Title** | `18px–19px` | `700` (Bold) | `24px` | Settings card headers, modal headers |
| **Account Row Title / CTA** | `16px` | `600` (SemiBold) | `22px` | Account name in list rows, primary button text |
| **Body / Subtitle** | `14px` | `400` (Regular) | `20px` | Helper copy, modal descriptions, empty-state explanations |
| **Caption / Metadata** | `12px–13px` | `600` (SemiBold) | `18px` | Input labels, badges, `Bank • Account Number` metadata |

---

## 3. Layout, Spacing & Elevation

- **Screen Padding:** `20px` horizontal padding (`paddingHorizontal: 20`), `40px` bottom scroll padding.
- **Border Radius Scale:**
  - **Inputs & Pill Buttons:** `10px–12px`
  - **Standard Cards & Account Rows:** `16px`
  - **Hero Balance Cards & Modals:** `18px–22px`
  - **Icon Badges:** `12px` rounded square (`44x44` or `46x46`) or circular (`borderRadius: 9999`) for empty/modal hero icons.
- **Elevation / Shadows:**
  - Cards use soft elevation (`shadowOpacity: 0.05`, `shadowRadius: 4`, `shadowOffset: { width: 0, height: 1 }`, `elevation: 2`) paired with warm surface contrast (`#FFFFFF` card on `#FAF8F6` background).

---

## 4. Component Guidelines

1. **Primary Buttons:**
   - Background: `colors.primary` (`#E06D53`), Text/Icon: `#FFFFFF`, `borderRadius: 12`, `paddingVertical: 14`.
2. **Secondary / Action Pills (`Sync`, `Edit`, `Link Banks`, `Paste`):**
   - Background: `colors.primarySoft` (`#FDF0ED`), Text/Icon: `colors.primary` (`#E06D53`), `borderRadius: 10`.
3. **Account List Cards:**
   - Left: `46x46` icon badge (`backgroundColor: colors.primarySoft`, icon `colors.primary`).
   - Center: Account Name (`colors.text`) + Bank & Account Number (`colors.subtext`).
   - Right: Formatted NZD Balance (`colors.positive` or `colors.negative` if `< 0`) + Right Chevron (`>` in `colors.primary`).
4. **Hero Net Balance Card:**
   - Background: `colors.headerBackground` (`#1C1917`), Bank badge in translucent white (`rgba(255,255,255,0.12)`), Account Type badge tinted with `rgba(224, 109, 83, 0.28)` and `#F7B2A1` text.
