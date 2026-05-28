---
name: ElectroTrack
colors:
  surface: '#0e1322'
  surface-dim: '#0e1322'
  surface-bright: '#343949'
  surface-container-lowest: '#090e1c'
  surface-container-low: '#161b2b'
  surface-container: '#1a1f2f'
  surface-container-high: '#25293a'
  surface-container-highest: '#2f3445'
  on-surface: '#dee1f7'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dee1f7'
  inverse-on-surface: '#2b3040'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#2fd9f4'
  on-tertiary: '#00363e'
  tertiary-container: '#008395'
  on-tertiary-container: '#000608'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#a2eeff'
  tertiary-fixed-dim: '#2fd9f4'
  on-tertiary-fixed: '#001f25'
  on-tertiary-fixed-variant: '#004e5a'
  background: '#0e1322'
  on-background: '#dee1f7'
  surface-variant: '#2f3445'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin: 32px
  container-max: 1440px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for a high-performance, futuristic Point of Sale experience. It targets a tech-forward demographic that values precision, speed, and data transparency. The aesthetic is rooted in **Glassmorphism**, blending the sleekness of high-end hardware with the fluid nature of modern software.

The UI should evoke a sense of "digital craftsmanship"—ultra-sharp, responsive, and deeply layered. Visual hierarchy is maintained through translucent surfaces and vibrant accent glows that guide the eye toward critical transaction data and system statuses. Motion is not an afterthought but a functional layer, utilizing staggered entries and micro-interactions to provide immediate feedback in high-pressure retail environments.

## Colors

The color palette is built on a "Deep Space" foundation to minimize eye strain during long shifts while making data-rich interfaces legible. 

- **Primary & Secondary:** A gradient-ready pairing of Indigo and Violet, used for high-importance actions and brand-heavy elements.
- **Accent:** A vibrant Cyan used sparingly for data highlights, progress bars, and "Active" states to provide a high-tech "neon" contrast against dark surfaces.
- **Surface Strategy:** In dark mode, surfaces utilize a deep Navy-Slate to prevent pure-black "crushing" of details. In light mode, the system shifts to a crisp, airy Slate-Gray that maintains professional neutrality.

## Typography

This design system employs a three-tier typographic hierarchy to balance technical utility with stylistic character.

1.  **Space Grotesk (Headings):** A geometric sans-serif with idiosyncratic terminals that feels technical and innovative. Use for all primary interface headers and large numeric displays.
2.  **DM Sans (Body):** A low-contrast, highly legible typeface optimized for long-form content, item descriptions, and settings menus.
3.  **JetBrains Mono (Codes/Labels):** Used specifically for SKU numbers, transaction IDs, monetary values, and technical metadata to reinforce the system's precision.

**Scalability:** Headings should utilize tighter line heights to maintain a "compact" feel on dashboard cards, while body text requires generous leading to ensure clarity in fast-paced environments.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model with a hard 4px baseline. 

- **Desktop:** A 12-column grid system is used for dashboards. Most glass cards should span a minimum of 3 columns to prevent visual clutter.
- **Tablet (POS Focus):** The layout shifts to a simplified 8-column grid. Touch targets must be a minimum of 44x44px, regardless of the visual button size.
- **Mobile:** A single-column vertical stack with 16px side margins.

**Rhythm:** Use "Stack" variables for vertical spacing within components. `stack-md` (16px) is the default distance between form fields and card elements.

## Elevation & Depth

Depth is established through transparency and blur rather than traditional drop shadows.

- **Layer 0 (Background):** Solid `#0A0F1E`.
- **Layer 1 (Standard Surface):** `#111827` at 100% opacity for sidebar and navigation containers.
- **Layer 2 (Glass Cards):** `rgba(255, 255, 255, 0.05)` with a `16px` backdrop-blur. These must feature a 1px border of `rgba(255, 255, 255, 0.08)` to define edges against the dark background.
- **Layer 3 (Modals/Popovers):** Higher transparency `rgba(255, 255, 255, 0.1)` with `32px` blur and a subtle outer glow using the Primary color at 10% opacity.

**Interaction:** Hovering over a Glass Card should increase the backdrop-blur to 24px and increase the border opacity to 15%, creating a "lift" effect.

## Shapes

The shape language is "Modern Rounded." 

- **Standard Elements:** Use `0.5rem` (8px) for buttons, input fields, and small tags.
- **Containers:** Large glass cards and modal windows use `1rem` (16px) to soften the technical nature of the UI.
- **Interactive States:** Active selection indicators (like sidebar highlights) should use a fully rounded "pill" shape on one side to indicate directionality.

Avoid sharp 0px corners entirely, as they conflict with the fluid, "organic-tech" nature of the glassmorphic style.

## Components

### Buttons
Primary buttons use a subtle linear gradient (Primary to Secondary) with white text. Ghost buttons use a 1px border and a blur-effect background. Scale buttons by `0.98` on click to simulate physical resistance.

### Inputs
Fields are dark-translucent with a bottom-only 2px accent border that glows when focused. Use JetBrains Mono for the input text to ensure character distinction (e.g., 0 vs O).

### Data Cards
Cards must include a "Glass" header. Titles use Space Grotesk Bold. Use GSAP for "count-up" animations on all currency and percentage values when the card enters the viewport.

### Chips & Status
Status indicators (Success/Warning/Error) should use a "glow" style: a low-opacity background color with a high-saturation text and a 2px left-side indicator stripe.

### Inventory Lists
Rows should alternate between transparent and `rgba(255,255,255,0.02)` backgrounds. On hover, the entire row should scale slightly and increase in brightness.

### Motion Details
- **Stagger:** All list items and card grids must use a 0.05s stagger delay on entry.
- **Hover Scale:** Interactive cards should scale to `1.02` on hover with a `power2.out` ease.