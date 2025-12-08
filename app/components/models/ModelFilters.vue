<template>
  <div class="model-filters">
    <!-- Search -->
    <div class="filter-row">
      <div class="search-wrapper">
        <input
          type="text"
          :value="modelFilters.search"
          placeholder="Search models..."
          class="search-input"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="modelFilters.search"
          class="clear-btn"
          @click="$emit('update:search', '')"
        >
          Clear
        </button>
      </div>

      <select
        :value="modelFilters.sortBy"
        class="sort-select"
        @change="$emit('update:sortBy', ($event.target as HTMLSelectElement).value as ModelSortOption)"
      >
        <option value="provider">Sort by Provider</option>
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="context-desc">Context: Largest</option>
        <option value="newest">Newest First</option>
      </select>
    </div>

    <!-- Capability toggles -->
    <div class="filter-row">
      <div class="capability-filters">
        <button
          class="cap-btn"
          :class="{ active: modelFilters.capabilities.tools === true }"
          @click="toggleCapability('tools')"
        >
          Tools
        </button>
        <button
          class="cap-btn"
          :class="{ active: modelFilters.capabilities.vision === true }"
          @click="toggleCapability('vision')"
        >
          Vision
        </button>
        <button
          class="cap-btn"
          :class="{ active: modelFilters.capabilities.reasoning === true }"
          @click="toggleCapability('reasoning')"
        >
          Reasoning
        </button>
        <button
          class="cap-btn"
          :class="{ active: modelFilters.capabilities.free === true }"
          @click="toggleCapability('free')"
        >
          Free
        </button>
      </div>

      <div class="filter-info">
        <span class="result-count">{{ stats.filtered }} of {{ stats.total }} models</span>
        <button
          v-if="hasActiveFilters"
          class="reset-btn"
          @click="$emit('reset')"
        >
          Reset filters
        </button>
      </div>
    </div>

    <!-- Provider chips (if many providers selected) -->
    <div v-if="modelFilters.providers.length > 0" class="filter-row">
      <div class="active-providers">
        <span class="active-label">Providers:</span>
        <span
          v-for="providerId in modelFilters.providers"
          :key="providerId"
          class="provider-chip"
          @click="$emit('toggle-provider', providerId)"
        >
          {{ getProviderName(providerId) }}
          <span class="chip-remove">x</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelFilters, ModelSortOption, ProviderInfo } from '~/types';

const props = defineProps<{
  modelFilters: ModelFilters;
  providers: ProviderInfo[];
  stats: { total: number; filtered: number };
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:sortBy': [value: ModelSortOption];
  'toggle-provider': [providerId: string];
  'set-capability': [capability: keyof ModelFilters['capabilities'], value: boolean | null];
  'reset': [];
}>();

const hasActiveFilters = computed(() => {
  return props.modelFilters.search !== '' ||
    props.modelFilters.providers.length > 0 ||
    props.modelFilters.capabilities.tools !== null ||
    props.modelFilters.capabilities.vision !== null ||
    props.modelFilters.capabilities.reasoning !== null ||
    props.modelFilters.capabilities.free !== null;
});

function toggleCapability(cap: keyof ModelFilters['capabilities']) {
  const current = props.modelFilters.capabilities[cap];
  // Cycle: null -> true -> null
  const next = current === null ? true : null;
  emit('set-capability', cap, next);
}

function getProviderName(id: string): string {
  const provider = props.providers.find(p => p.id === id);
  return provider?.displayName || id;
}
</script>

<style scoped>
.model-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #e0e0e0;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #171717;
}

.clear-btn {
  padding: 4px 8px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 12px;
}

.clear-btn:hover {
  color: #171717;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: #171717;
}

.capability-filters {
  display: flex;
  gap: 8px;
}

.cap-btn {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.1s;
}

.cap-btn:hover {
  border-color: #999;
}

.cap-btn.active {
  background: #171717;
  color: #fff;
  border-color: #171717;
}

.filter-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-count {
  font-size: 13px;
  color: #666;
}

.reset-btn {
  padding: 4px 8px;
  background: none;
  border: none;
  color: #1565c0;
  cursor: pointer;
  font-size: 13px;
}

.reset-btn:hover {
  text-decoration: underline;
}

.active-providers {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.active-label {
  font-size: 13px;
  color: #666;
}

.provider-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}

.provider-chip:hover {
  background: #e0e0e0;
}

.chip-remove {
  font-size: 10px;
  color: #666;
}
</style>
