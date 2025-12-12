<template>
  <div class="model-selector" ref="selectorRef">
    <button
      class="selector-trigger"
      :class="{ open: isOpen }"
      @click="toggleOpen"
    >
      <span class="selected-model">
        {{ selectedModel?.name || 'Select Model' }}
      </span>
      <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="selector-dropdown"
        :style="dropdownStyle"
      >
        <div class="dropdown-header">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search models..."
            class="dropdown-search"
            ref="searchInputRef"
          />
        </div>

        <div class="dropdown-filters">
          <button
            class="filter-chip"
            :class="{ active: filterTools }"
            @click="filterTools = !filterTools"
          >
            Tools
          </button>
          <button
            class="filter-chip"
            :class="{ active: filterFree }"
            @click="filterFree = !filterFree"
          >
            Free
          </button>
        </div>

        <div class="dropdown-list">
          <div
            v-for="model in filteredModels"
            :key="model.id"
            class="dropdown-item"
            :class="{ selected: model.id === modelValue }"
            @click="selectModel(model.id)"
          >
            <div class="item-main">
              <span class="item-name">{{ model.name }}</span>
              <span class="item-id">{{ model.id }}</span>
            </div>
            <div class="item-badges">
              <span v-if="model.capabilities.supportsTools" class="mini-badge tools">T</span>
              <span v-if="model.capabilities.supportsVision" class="mini-badge vision">V</span>
              <span v-if="model.pricing.isFree" class="mini-badge free">F</span>
            </div>
          </div>

          <div v-if="filteredModels.length === 0" class="no-results">
            No models found
          </div>
        </div>

        <div class="dropdown-footer">
          <NuxtLink to="/models" class="browse-link" @click="isOpen = false">
            Browse all models
          </NuxtLink>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';

const props = defineProps<{
  modelValue: string;
  models: Model[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'modelSelected': [modelId: string, modelName: string];
}>();

const selectorRef = ref<HTMLElement>();
const searchInputRef = ref<HTMLInputElement>();
const isOpen = ref(false);
const searchQuery = ref('');
const filterTools = ref(false);
const filterFree = ref(false);

const dropdownStyle = ref<Record<string, string>>({});

const selectedModel = computed(() =>
  props.models.find(m => m.id === props.modelValue)
);

const filteredModels = computed(() => {
  let result = props.models;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query)
    );
  }

  if (filterTools.value) {
    result = result.filter(m => m.capabilities.supportsTools);
  }

  if (filterFree.value) {
    result = result.filter(m => m.pricing.isFree);
  }

  // Limit to 50 for performance
  return result.slice(0, 50);
});

function toggleOpen() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    updateDropdownPosition();
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
}

function updateDropdownPosition() {
  if (!selectorRef.value) return;
  const rect = selectorRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    position: 'fixed',
    top: (rect.bottom + 4) + 'px',
    left: rect.left + 'px',
    width: '320px',
    zIndex: '9999',
  };
}

function selectModel(modelId: string) {
  const model = props.models.find(m => m.id === modelId);
  emit('update:modelValue', modelId);
  emit('modelSelected', modelId, model?.name || modelId);
  isOpen.value = false;
  searchQuery.value = '';
}

// Close on click outside
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (!selectorRef.value?.contains(e.target as Node)) {
      isOpen.value = false;
    }
  };
  document.addEventListener('click', handleClickOutside);
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
  });
});

// Close on escape
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') isOpen.value = false;
  };
  document.addEventListener('keydown', handleEscape);
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape);
  });
});
</script>

<style scoped>
.model-selector {
  position: relative;
}

.selector-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.1s;
}

.selector-trigger:hover {
  background: #eee;
}

.selector-trigger.open {
  border-color: #171717;
}

.selected-model {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  transition: transform 0.2s;
}

.selector-trigger.open .chevron {
  transform: rotate(180deg);
}

/* Dropdown styles (in Teleport) */
.selector-dropdown {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  max-height: 400px;
}

.dropdown-header {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.dropdown-search {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
}

.dropdown-search:focus {
  outline: none;
  border-color: #171717;
}

.dropdown-filters {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
}

.filter-chip {
  padding: 4px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}

.filter-chip.active {
  background: #171717;
  color: #fff;
  border-color: #171717;
}

.dropdown-list {
  flex: 1;
  overflow-y: auto;
  max-height: 250px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.selected {
  background: #f0f0f0;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
}

.item-id {
  font-size: 11px;
  color: #666;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-badges {
  display: flex;
  gap: 4px;
}

.mini-badge {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.mini-badge.tools {
  background: #e3f2fd;
  color: #1565c0;
}

.mini-badge.vision {
  background: #f3e5f5;
  color: #7b1fa2;
}

.mini-badge.free {
  background: #e8f5e9;
  color: #2e7d32;
}

.no-results {
  padding: 24px;
  text-align: center;
  color: #666;
  font-size: 13px;
}

.dropdown-footer {
  padding: 10px 12px;
  border-top: 1px solid #e0e0e0;
}

.browse-link {
  font-size: 13px;
  color: #1565c0;
}

.browse-link:hover {
  text-decoration: underline;
}
</style>
