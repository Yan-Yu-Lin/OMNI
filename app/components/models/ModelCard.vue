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
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';

defineProps<{
  model: Model;
  isSelected?: boolean;
  compact?: boolean;
}>();

defineEmits<{
  select: [];
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
</style>
