# Task 01: CSS Variables Foundation

## Objective
Set up CSS custom properties (variables) in `main.css` to enable easy theming across all components.

## File to Modify
- `app/assets/css/main.css`

## Implementation

Add the following CSS variables to `:root`:

```css
:root {
  /* Background colors */
  --color-bg-primary: #fff;
  --color-bg-secondary: #f5f5f5;
  --color-bg-tertiary: #fafafa;

  /* Text colors */
  --color-text-primary: #171717;
  --color-text-secondary: #666;
  --color-text-muted: #a0a0a0;

  /* Border colors */
  --color-border: #e0e0e0;
  --color-border-focus: #171717;

  /* Accent colors */
  --color-accent-blue: #1a0dab;
  --color-accent-green: #006621;

  /* Status colors */
  --color-success: #22c55e;
  --color-success-bg: #f0fdf4;
  --color-error: #ef4444;
  --color-error-bg: #fef2f2;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;

  /* Input specific */
  --input-frame-bg: #e0e0e0;
  --input-container-bg: #fff;
}
```

## Expected Outcome
- CSS variables defined in `:root`
- No visual changes yet (variables just defined, not applied)
- Foundation ready for other tasks to use
