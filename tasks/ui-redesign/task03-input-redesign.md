# Task 03: Input Field Redesign

## Objective
Redesign the input field to:
1. Have a "frame layer" - a slightly larger card behind the main input (creates depth)
2. Only top 2 corners rounded (bottom is flat)
3. Flush with bottom of screen (no gap)

## Files to Modify
1. `app/components/chat/Container.vue`
2. `app/pages/index.vue`

## Current vs Target

**Current:**
```
        ╭───────────────────╮
        │      Input        │   ← All 4 corners rounded, floating with gap
        ╰───────────────────╯

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← Gap between input and screen edge
```

**Target:**
```
        ╭───────────────────────╮   ← Frame layer (darker, bigger)
        │ ╭───────────────────╮ │
        │ │      Input        │ │   ← Main container (white)
        │ ╰───────────────────╯ │
━━━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━┷━━━  ← Flush with bottom, no gap
```

## Implementation

### Step 1: Update Container.vue Template

Change the input section structure:

**Before:**
```vue
<div class="unified-input-section">
  <form class="unified-input-container" @submit.prevent="handleSubmit">
    ...
  </form>
</div>
```

**After:**
```vue
<div class="unified-input-section">
  <div class="input-frame">
    <form class="unified-input-container" @submit.prevent="handleSubmit">
      ...
    </form>
  </div>
</div>
```

### Step 2: Update Container.vue CSS

**Replace `.unified-input-section`:**
```css
.unified-input-section {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  background: transparent;
}
```

**Add `.input-frame`:**
```css
.input-frame {
  background: var(--input-frame-bg, #e0e0e0);
  border-radius: var(--radius-2xl, 24px) var(--radius-2xl, 24px) 0 0;
  padding: 8px;
  padding-bottom: 16px;
  width: calc(100% - 48px);
  max-width: 848px;
}
```

**Update `.unified-input-container`:**
```css
.unified-input-container {
  display: flex;
  flex-direction: column;
  background: var(--input-container-bg, #fff);
  border: none;
  border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  width: 100%;
}

.unified-input-container:focus-within {
  box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.1);
}
```

### Step 3: Apply Same Changes to index.vue

Duplicate the structure and CSS changes in `index.vue` for the home page input.

**Template change:** Add `.input-frame` wrapper around `.unified-input-container`

**CSS changes:** Same as Container.vue

## Expected Outcome
- Input has visible "frame" behind it (darker card layer)
- Only top corners are rounded
- Bottom edge is flush with screen (no gap)
- Both home page and chat page have same input styling
