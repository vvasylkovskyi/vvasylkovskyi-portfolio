# Adding Design System to your Frontend Project - The right way

If you are a software engineer and have no designer skills, you may have encountered similar problem to mine - the design of your website was always feeling a bit of. Or even worse, you have no ideia whether your design is "right" or not, since design is a question of having the "designer vein" right? Well... it is not. Of course if you are a designer, you will probably make a much prettier and with better UX web app. However, you don't have to be to meet the industry standards.

Building a visually consistent web app is a question of following design principles. In these notes I am going to describe how to not mess up your web app design and suggest step by step about how to do it right.

## Choosing your design system framework

The main rule of building web app is to keep the layout consistent. We don't want to have different pages showing different UX, or different styles, buttons with different layouts, etc. So how to ensure consistency from software point of view? Use the design system frameworks. There are many design system frameworks up to date, such as [Chakra.ui](https://chakra-ui.com/), [Mantine](https://mantine.dev/), etc. Most of them abstract the UI of the component and expose the component as an API, hiding the underlying implementation. While this is useful in some instances, we are not going to choose any for them exactly for that. Instead, we are going to focus on [ShadCN](https://www.shadcn.io/) - an open design framework.

The fundamental difference of [ShadCN](https://www.shadcn.io/) is that it doesn't keep your UI elements in `node_modules`, as [they describe](https://www.shadcn.io/ui#why-developers-are-obsessed-with-shadcnui). Instead they offer a design tokens, and components using them, that once installed will live in your project. This way you have full ownership of the UI components, while keeping the OOTB best practice of how using design tokens. But wait, what are design tokens?

## Design Tokens

Design Tokens are the variables that keep design data. For example a color, border-radius, spacing, etc. are all design tokens. The goal of using them is to keep your app UI elements consistent, which is in the end of the day, keeping your colors the same, radiuses, spacings and things like that. So it is handly that ShadCN offers us design tokens. All we need to do is to learn how to use them right. As they state on their documentation, every shadcnui/component uses the same CSS variables (`--primary`, `--background`, `--foreground`).

## Installing ShaCN

Follow the installation guide to get your design system running - https://www.shadcn.io/ui/installation-guide. Once completed, let's chat about how to actually use that design system.

### Wiring Design Tokens to Tailwind

Once all is installed, it is crucial to understand the `tailwind` and styling to get things running. ShaCN uses [tailwind](https://tailwindcss.com/) to style components. The way tailwind gives styles is by exposing the classnames e.g. `bg-primary`, `bg-destructive`. And ShaCN does a great job implementing these classnames so that we don't have to do that, we only install the components. So while the tailwind is the engine for the styles, the ShaCN is the provider of the design tokens for such styles. This means that the design tokens need to be wired to the tailwind. You may have noticed that during installation guide, we got the new `global.css` containing the root variable for white and dark mode:

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
}
```

These are the variables definitions, now we need to connect them to tailwind. This is done via `@theme inline` css attribute:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  /* Map all other variables */
}
```

### Beyond colors, adding font family, text hierarchy, spacing, and rounding

That is all good for the colors, if we manage to get them right, it is already a great improvement. But UI also needs to be consistent on other levels:

- Font Style - use same across the app
- Text Hierarchy - define consistent small, medium and large text (3 minimum),
- Consistent Spacings - at least 3-4 different size spacings to allow white space in the app
- Radius - all the shapes have to follow same radius pattern

We can also add them into tailwind `@theme` block. For example:

```css
@theme inline {
  /* Colors */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Typography */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'Fira Code', monospace;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --leading-none: 1;
  --leading-snug: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;

  /* Radii */
  --radius-sm: 0.25rem;
  --radius: 0.625rem;
  --radius-lg: 1rem;
}
```

### Adding Typography text hierarchy to text elements

We also need to make sure that our text hierarchy is consistent. ShadCN doesn't expose the text elements UI, so we need to make a rule ourselves. The most efficient way for simpler projects is to apply the text styles using `@layer`, which is what we are going to do here:

```css

@layer base {
  * {
    @apply border-border outline-ring/50;
    /* Headings */
    h1 {
      @apply text-xl leading-relaxed font-sans;
    }
    h2 {
      @apply text-lg leading-snug font-sans;
    }
    h3 {
      @apply text-lg leading-snug font-sans;
    }
    h4 {
      @apply text-lg leading-snug font-sans;
    }
    h5 {
      @apply text-sm leading-snug font-sans;
    }
    h6 {
      @apply text-sm leading-snug font-sans;
    }

    /* Paragraphs */
    p {
      @apply text-base leading-relaxed font-sans text-foreground;
    }

    /* Labels */
    label {
      @apply text-sm leading-snug font-sans text-foreground;
    }

    /* Small / Helper text */
    small {
      @apply text-sm leading-snug font-sans text-muted-foreground;
    }
  }
```

### Improving readability with higher font weight in dark mode

Note, since the spacings and sizes do not change between dark/white modes, it is fine to leave them without variable. Sometimes it is worth to do some font changes for better readability in dark mode:

- Increase `font-weight`,
- Increase `line-height` and `letter-spacing`

There is a special `@layer` css tag that we can use to apply changes:

```css
@layer base {
  body {
    @apply font-normal;
    @apply leading-normal; # means line-height
  }
  .dark body {
    @apply font-medium;
    @apply leading-relaxed;
    letter-spacing: 0.015em;
  }
}
```

These variables inside the `@theme` is what actually going to connect the design tokens to the tailwind classnames. Once this is setup correctly, your design tokens are wired right, and you can continue adding UI elements by simply installing them from ShadCN.

More details on how to wire these can be found in the [ShadCN Theme docs](https://ui.shadcn.com/docs/theming), and also in [Tailwind Theme docs](https://tailwindcss.com/docs/theme).

## ShadCN CSS variable to Tailwind Class cheat-sheet

| shadcn CSS Variable        | Tailwind Class Equivalent     | Typical Use / Notes                     |
| -------------------------- | ----------------------------- | --------------------------------------- |
| `--background`             | `bg-background`               | Page/body background                    |
| `--foreground`             | `text-foreground`             | Body text color                         |
| `--primary`                | `bg-primary`                  | Primary button background               |
| `--primary-foreground`     | `text-primary-foreground`     | Primary button text                     |
| `--secondary`              | `bg-secondary`                | Secondary button background             |
| `--secondary-foreground`   | `text-secondary-foreground`   | Secondary button text                   |
| `--destructive`            | `bg-destructive`              | Destructive button background (red)     |
| `--destructive-foreground` | `text-destructive-foreground` | Destructive button text (usually white) |
| `--accent`                 | `bg-accent`                   | Accent background (hover, highlight)    |
| `--accent-foreground`      | `text-accent-foreground`      | Accent text                             |
| `--muted`                  | `bg-muted`                    | Muted backgrounds or disabled state     |
| `--muted-foreground`       | `text-muted-foreground`       | Muted text                              |
| `--card`                   | `bg-card`                     | Card/container background               |
| `--card-foreground`        | `text-card-foreground`        | Card text color                         |
| `--popover`                | `bg-popover`                  | Popover background                      |
| `--popover-foreground`     | `text-popover-foreground`     | Popover text                            |
| `--border`                 | `border-border`               | Borders (cards, inputs, etc.)           |
| `--input`                  | `bg-input`                    | Input background                        |
| `--ring`                   | `ring-ring`                   | Focus ring color                        |

### Typography

| shadcn CSS Variable | Tailwind Class / Usage | Notes                            |
| ------------------- | ---------------------- | -------------------------------- |
| `--font-sans`       | `font-sans`            | Default sans-serif font family   |
| `--font-mono`       | `font-mono`            | Monospace font (code, terminals) |
| `--text-sm`         | `text-sm`              | Small text size                  |
| `--text-base`       | `text-base`            | Base text size                   |
| `--text-lg`         | `text-lg`              | Large text size                  |
| `--leading-none`    | `leading-none`         | Line height: 1                   |
| `--leading-snug`    | `leading-snug`         | Line height: 1.25                |
| `--leading-normal`  | `leading-normal`       | Line height: 1.5                 |
| `--leading-relaxed` | `leading-relaxed`      | Line height: 1.625               |

### Spacing

| shadcn CSS Variable | Tailwind Class / Usage | Notes                  |
| ------------------- | ---------------------- | ---------------------- |
| `--spacing-xs`      | `p-1`, `m-1`           | 0.25rem padding/margin |
| `--spacing-sm`      | `p-2`, `m-2`           | 0.5rem padding/margin  |
| `--spacing-md`      | `p-4`, `m-4`           | 1rem padding/margin    |
| `--spacing-lg`      | `p-6`, `m-6`           | 1.5rem padding/margin  |

### Border-radius

| shadcn CSS Variable | Tailwind Class / Usage | Notes                            |
| ------------------- | ---------------------- | -------------------------------- |
| `--radius-sm`       | `rounded-sm`           | Small border radius (0.25rem)    |
| `--radius`          | `rounded-md`           | Default border radius (0.625rem) |
| `--radius-lg`       | `rounded-lg`           | Large border radius (1rem)       |

## Keep things simple

When installing design framework as ShadCN you can keep things simple or go advances due to large availability of the design tokens. When starting, I recommend keep things simple, and avoid design complexity. This means:

- Keep only 2 colors (e.g. black and white, using CSS variable: `--background`, `--foreground`). Keep your primary color also black, but use right variable, aka design token: `--primary`.
