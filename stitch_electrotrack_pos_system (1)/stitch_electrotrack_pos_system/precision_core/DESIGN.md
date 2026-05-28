---
name: Precision Core
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-desktop: 40px
---

## Brand & Style

The brand personality is **technical, efficient, and authoritative**. Designed for the high-stakes environment of electronics retail in Pakistan, the UI prioritizes clarity and speed of transaction. It avoids unnecessary decoration in favor of a **Modern Corporate** aesthetic with **High-Contrast** functional elements.

The emotional response should be one of "effortless control." By combining technical typefaces with a clean, light-filled surface architecture, the design system conveys a sense of modern reliability and inventory precision. Visual flair is reserved for actionable data and AI-driven insights, ensuring that the technology feels like an assistant rather than a barrier.

## Colors

This design system utilizes a high-visibility palette optimized for indoor retail environments. 

- **Primary Indigo:** Used for main actions, navigation states, and primary branding. It provides a grounded, professional foundation.
- **Accent Cyan:** Reserved for "success" states, secondary highlights, and specialized tech-forward features like firmware updates or digital warranties.
- **Warning & Danger:** Amber and Red are used strictly for stock alerts, overdue payments, or critical system errors.
- **Neutral Surface:** A cool-toned light grey background reduces eye strain during long shifts, while pure white cards create a clear "layered" hierarchy for product lists and checkout details.

## Typography

The typographic strategy is split into three distinct functional roles:
1.  **Headings & Financials:** `Space Grotesk` is used for all headlines and large price displays. Its geometric, slightly technical character reflects the "Electro" nature of the retail space.
2.  **General Interface:** `DM Sans` provides high readability for customer names, product descriptions, and settings. 
3.  **Technical Data:** `JetBrains Mono` is used exclusively for IMEI numbers, serial codes, SKU IDs, and timestamps. Its monospaced nature ensures that alphanumeric strings are easy to compare and scan.

For mobile-specific views, `headline-lg` should scale down to 24px to maintain readability without excessive horizontal scrolling.

## Elevation & Depth

Hierarchy is established through **Low-Contrast Outlines** and specific surface tinting rather than heavy shadows.

- **Tiers:** Background surface is `#f8fafc`. Interactive cards sit at a higher level with a `#ffffff` fill and a 1px solid `#e2e8f0` border.
- **Primary Glow:** Only primary call-to-action buttons (e.g., "Complete Sale") utilize an ambient shadow. This shadow uses the primary indigo color at 25% opacity with a 12px blur, creating a "soft glow" effect that signals the most important action.
- **AI Tonal Layer:** Cards containing AI-driven stock predictions or customer insights should have a very subtle `5% indigo` background tint to differentiate them from standard data cards.

## Shapes

The shape language is consistently **Rounded**. A base radius of **12px** is applied to all standard containers, cards, and input fields to soften the technical aesthetic and make the UI feel approachable.

- **Standard Elements:** 12px (0.75rem).
- **Pills:** Used for status badges (e.g., "In Stock", "Paid"). These use a full-round radius (999px) to contrast against the more structural card shapes.
- **Small Components:** Checkboxes and small utility buttons use a reduced 6px radius to maintain visual balance at smaller scales.

## Components

### Buttons
- **Primary:** Solid indigo fill, white text, 12px radius, and a subtle indigo glow shadow.
- **Secondary:** White fill, 1px cyan border, cyan text.
- **Tertiary:** Ghost style, indigo text, no border.

### Badges & Chips
- **Status Pills:** Utilize a 15% opacity background of the semantic color (e.g., 15% indigo for "Pending," 15% cyan for "Active"). Text should be the 100% solid version of that color.

### Stat Cards
- **Structure:** White background, 12px radius, 1px border. 
- **Accent:** A 4px thick horizontal bar of the primary or secondary color is pinned to the top edge of the card to categorize the metric.

### Input Fields
- **Default:** 1px border (#e2e8f0), DM Sans 14px text, 12px radius.
- **Focus State:** 1px indigo border with a 2px indigo focus ring at 10% opacity.

### Lists & Tables
- **Zebra Striping:** Use the surface color (#f8fafc) for alternate rows in long inventory tables.
- **Technical Columns:** Always use JetBrains Mono for ID and Serial columns to ensure alignment and readability.

### AI Insight Cards
- Features a subtle indigo tint and a cyan left-accent border to signify automated intelligence.