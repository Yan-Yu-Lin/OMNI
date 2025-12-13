# Task 04: Tool Card Compact Redesign

## Objective
Make search results compact - one line per result instead of fat cards.

## Files to Modify
1. `app/components/tools/SearchResults.vue`
2. `app/components/tools/CrawlResults.vue` (similar changes)

## Current vs Target

**Current (fat):**
```
┌─────────────────────────────────────────┐
│ Title (blue link)                       │
│ www.example.com/full/path/to/page       │
│                                         │
│ Description paragraph that takes        │
│ multiple lines and lots of space...     │
│                                         │
│ ▽ View page content                     │
└─────────────────────────────────────────┘
```

**Target (compact):**
```
SD  Scientists discover 14 strange new species...   sciencedaily.com
SCIAM Pastel Pink Lobsters and Goofy-Looking...     scientificamerican.com
PP  YouTuber Drops Camera in Ocean and Films...     petapixel.com
```

Each result = single line: `[domain indicator] [title] [domain]`

## Implementation

### Step 1: Update SearchResults.vue Template

**Replace the results list with compact layout:**

```vue
<div class="results-header">
  <span class="results-count">Found {{ results.length }} result(s)</span>
</div>

<div class="results-list">
  <a
    v-for="result in results"
    :key="result.url"
    :href="result.url"
    target="_blank"
    rel="noopener noreferrer"
    class="result-item"
  >
    <span class="result-favicon">{{ getDomainInitials(result.url) }}</span>
    <span class="result-title">{{ result.title || 'Untitled' }}</span>
    <span class="result-domain">{{ getDomain(result.url) }}</span>
  </a>
</div>
```

### Step 2: Add Helper Functions

```ts
const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

const getDomainInitials = (url: string): string => {
  const domain = getDomain(url);
  // Get first 2 characters or first letter of each word
  const parts = domain.split('.');
  if (parts[0].length <= 3) {
    return parts[0].toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};
```

### Step 3: Update SearchResults.vue CSS

**Remove fat card styles, add compact styles:**

```css
.results-header {
  padding: 8px 0;
  font-size: 13px;
  color: var(--color-text-secondary, #666);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 0 -10px;
  border-radius: var(--radius-sm, 4px);
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.result-item:hover {
  background: var(--color-bg-secondary, #f5f5f5);
}

.result-favicon {
  flex-shrink: 0;
  width: 24px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary, #666);
  text-align: center;
}

.result-title {
  flex: 1;
  font-size: 14px;
  color: var(--color-accent-blue, #1a0dab);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-domain {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-text-muted, #a0a0a0);
}
```

### Step 4: Apply Similar Changes to CrawlResults.vue

Same pattern:
- Remove per-page card styling
- Convert to single-line items
- Show: page indicator + title + domain

## Remove These Elements
- Description paragraphs
- Full URLs (only show domain)
- "View page content" collapsibles per result
- Per-result card borders and backgrounds

## Expected Outcome
- Search results take ~30px per result instead of ~150px
- Clean, scannable list
- Hover highlights entire row
- Clicking opens link in new tab
