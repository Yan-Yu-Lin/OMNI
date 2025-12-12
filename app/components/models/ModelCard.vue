<template>
  <div
    class="model-card"
    :class="{
      selected: isSelected,
      compact: compact,
    }"
    @click="$emit('select')"
  >
    <div class="model-header">
      <h3 class="model-name">{{ model.name }}</h3>
      <div class="model-badges">
        <button
          class="pin-btn"
          :class="{ pinned: isPinned }"
          @click.stop="$emit('togglePin')"
          :title="isPinned ? 'Unpin model' : 'Pin model'"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" :fill="isPinned ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
            <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
          </svg>
        </button>
        <span v-if="model.capabilities.supportsTools" class="badge badge-tools" title="Supports tool calling">
          Tools
        </span>
        <span v-if="model.capabilities.supportsVision" class="badge badge-vision" title="Supports image input">
          Vision
        </span>
        <span v-if="model.capabilities.supportsReasoning" class="badge badge-reasoning" title="Extended reasoning">
          Thinking
        </span>
        <span v-if="model.pricing.isFree" class="badge badge-free" title="Free to use">
          Free
        </span>
      </div>
    </div>

    <div class="model-id">{{ model.id }}</div>

    <p v-if="model.description && !compact" class="model-description">
      {{ truncate(model.description, 120) }}
    </p>

    <div class="model-meta">
      <div class="meta-item">
        <span class="meta-label">Context</span>
        <span class="meta-value">{{ formatContext(model.contextLength) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Input</span>
        <span class="meta-value">{{ formatPrice(model.pricing.promptPerMillion) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Output</span>
        <span class="meta-value">{{ formatPrice(model.pricing.completionPerMillion) }}</span>
      </div>
    </div>

    <!-- OpenRouter link (hidden in compact mode) -->
    <div v-if="!compact" class="model-actions">
      <a
        class="openrouter-link"
        :href="`https://openrouter.ai/${model.id}`"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
        title="View on OpenRouter"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        OpenRouter
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';

defineProps<{
  model: Model;
  isSelected?: boolean;
  compact?: boolean;
  isPinned?: boolean;
}>();

defineEmits<{
  select: [];
  togglePin: [];
}>();

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) {
    return (tokens / 1_000_000).toFixed(1) + 'M';
  }
  if (tokens >= 1_000) {
    return Math.round(tokens / 1_000) + 'K';
  }
  return tokens.toString();
}

function formatPrice(pricePerMillion: number): string {
  if (pricePerMillion === 0) return 'Free';
  if (pricePerMillion < 0.01) return '$' + pricePerMillion.toFixed(4) + '/M';
  if (pricePerMillion < 1) return '$' + pricePerMillion.toFixed(2) + '/M';
  return '$' + pricePerMillion.toFixed(2) + '/M';
}
</script>

<style scoped>
.model-card {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.1s, box-shadow 0.1s, background-color 0.1s;
  background: #fff;
}

.model-card:hover {
  border-color: #999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.model-card.selected {
  border-color: #171717;
  background: #fafafa;
}

.model-card.compact {
  padding: 12px;
}

.model-card.compact .model-meta {
  gap: 12px;
}

.model-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.pin-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #ccc;
  border-radius: 4px;
  transition: all 0.15s;
  flex-shrink: 0;
  opacity: 0;
}

.model-card:hover .pin-btn {
  opacity: 1;
}

.pin-btn:hover {
  background: #f0f0f0;
  color: #666;
}

.pin-btn.pinned {
  opacity: 1;
  color: #1565c0;
}

.pin-btn.pinned:hover {
  color: #c62828;
}

.model-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}

.model-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  white-space: nowrap;
}

.badge-tools {
  background: #e3f2fd;
  color: #1565c0;
}

.badge-vision {
  background: #f3e5f5;
  color: #7b1fa2;
}

.badge-reasoning {
  background: #fff3e0;
  color: #e65100;
}

.badge-free {
  background: #e8f5e9;
  color: #2e7d32;
}

.model-id {
  font-size: 12px;
  color: #666;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  margin-bottom: 8px;
}

.model-description {
  font-size: 13px;
  color: #444;
  line-height: 1.4;
  margin: 0 0 12px;
}

.model-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.meta-value {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.model-actions {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.openrouter-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #999;
  text-decoration: none;
  transition: color 0.15s;
}

.openrouter-link:hover {
  color: #666;
}
</style>
