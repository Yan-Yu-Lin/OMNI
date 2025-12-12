<template>
  <div class="model-selector" ref="selectorRef">
    <button
      class="selector-trigger"
      :class="{ open: isOpen, compact: compact }"
      @click="toggleOpen"
    >
      <span class="selected-model">
        {{ selectedModel?.name || 'Select Model' }}
      </span>
      <span v-if="providerPreferences && !compact" class="provider-badge">
        {{ providerLabel }}
      </span>
      <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="selector-dropdown"
        :style="dropdownStyle"
        ref="dropdownRef"
      >
        <!-- Model selection view -->
        <template v-if="currentView === 'models'">
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
            <!-- Pinned section -->
            <template v-if="pinnedModelsList.length > 0">
              <div class="section-header">Pinned</div>
              <div
                v-for="model in pinnedModelsList"
                :key="model.id"
                class="dropdown-item"
                :class="{ selected: model.id === modelValue }"
                @click="selectModel(model.id)"
              >
                <div class="item-main">
                  <span class="item-name">{{ model.name }}</span>
                  <span class="item-id">{{ model.id }}</span>
                </div>
                <div class="item-actions">
                  <button
                    class="pin-btn pinned"
                    @click="handlePinToggle($event, model.id)"
                    title="Unpin model"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                    </svg>
                  </button>
                  <div class="item-badges">
                    <span v-if="model.capabilities.supportsTools" class="mini-badge tools">T</span>
                    <span v-if="model.capabilities.supportsVision" class="mini-badge vision">V</span>
                    <span v-if="model.pricing.isFree" class="mini-badge free">F</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- All models section -->
            <div v-if="pinnedModelsList.length > 0 && unpinnedModelsList.length > 0" class="section-header">
              All Models
            </div>
            <div
              v-for="model in unpinnedModelsList"
              :key="model.id"
              class="dropdown-item"
              :class="{ selected: model.id === modelValue }"
              @click="selectModel(model.id)"
            >
              <div class="item-main">
                <span class="item-name">{{ model.name }}</span>
                <span class="item-id">{{ model.id }}</span>
              </div>
              <div class="item-actions">
                <button
                  class="pin-btn"
                  @click="handlePinToggle($event, model.id)"
                  title="Pin model"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                  </svg>
                </button>
                <div class="item-badges">
                  <span v-if="model.capabilities.supportsTools" class="mini-badge tools">T</span>
                  <span v-if="model.capabilities.supportsVision" class="mini-badge vision">V</span>
                  <span v-if="model.pricing.isFree" class="mini-badge free">F</span>
                </div>
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
            <button
              v-if="modelValue && providerPreferences"
              class="provider-config-btn"
              @click.stop="switchToProvidersView"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Provider: {{ providerLabel }}
            </button>
          </div>
        </template>

        <!-- Provider selection view -->
        <template v-else-if="currentView === 'providers'">
          <div class="dropdown-header provider-header">
            <button class="back-btn" @click.stop="currentView = 'models'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div class="header-info">
              <span class="header-title">Provider Routing</span>
              <span class="header-subtitle">{{ selectedModel?.name }}</span>
            </div>
          </div>

          <div class="dropdown-list provider-list">
            <div v-if="providersLoading" class="provider-loading">
              Loading providers...
            </div>

            <template v-else>
              <!-- Auto mode option -->
              <div
                class="provider-option"
                :class="{ selected: localProviderMode === 'auto' }"
                @click.stop="selectAutoMode"
              >
                <div class="option-radio">
                  <div class="radio-outer">
                    <div v-if="localProviderMode === 'auto'" class="radio-inner"></div>
                  </div>
                </div>
                <div class="option-content">
                  <div class="option-header">
                    <span class="option-name">Auto</span>
                    <select
                      v-if="localProviderMode === 'auto'"
                      v-model="localProviderSort"
                      class="sort-select"
                      @click.stop
                      @change="applyProviderChange"
                    >
                      <option value="throughput">Balanced</option>
                      <option value="latency">Fastest</option>
                      <option value="price">Cheapest</option>
                    </select>
                  </div>
                  <span class="option-description">Automatic routing with fallback</span>
                </div>
              </div>

              <!-- Specific provider options -->
              <div
                v-for="provider in providers"
                :key="provider.slug"
                class="provider-option"
                :class="{ selected: localProviderMode === 'specific' && localProviderSlug === provider.slug }"
                @click.stop="selectSpecificProvider(provider.slug)"
              >
                <div class="option-radio">
                  <div class="radio-outer">
                    <div v-if="localProviderMode === 'specific' && localProviderSlug === provider.slug" class="radio-inner"></div>
                  </div>
                </div>
                <div class="option-content">
                  <div class="option-header">
                    <span class="option-name">{{ provider.name }}</span>
                    <div class="option-badges">
                      <span v-if="provider.supportsCaching" class="badge caching">CACHE</span>
                      <span class="badge uptime" :class="getUptimeClass(provider.uptime)">
                        {{ Math.round(provider.uptime) }}%
                      </span>
                    </div>
                  </div>
                  <div class="option-pricing">
                    <span class="price">${{ formatPrice(provider.pricing.prompt) }}/M in</span>
                    <span class="price-sep">|</span>
                    <span class="price">${{ formatPrice(provider.pricing.completion) }}/M out</span>
                  </div>
                </div>
              </div>

              <div v-if="providers.length === 0 && !providersLoading" class="no-results">
                No providers found
              </div>
            </template>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Model, ProviderPreferences, ModelProvider } from '~/types';

const props = withDefaults(defineProps<{
  modelValue: string;
  models: Model[];
  providerPreferences?: ProviderPreferences;
  compact?: boolean;
}>(), {
  compact: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:providerPreferences': [value: ProviderPreferences];
  'modelSelected': [modelId: string, modelName: string];
}>();

const { pinnedModels, isPinned, togglePin } = usePinnedModels();
const { fetchProviders } = useProviders();

const selectorRef = ref<HTMLElement>();
const dropdownRef = ref<HTMLElement>();
const searchInputRef = ref<HTMLInputElement>();
const isOpen = ref(false);
const searchQuery = ref('');
const filterTools = ref(false);
const filterFree = ref(false);

// View state: 'models' or 'providers'
const currentView = ref<'models' | 'providers'>('models');

// Provider state
const providers = ref<ModelProvider[]>([]);
const providersLoading = ref(false);

// Local provider preferences (to avoid modifying props directly)
const localProviderMode = ref<'auto' | 'specific'>(props.providerPreferences?.mode || 'auto');
const localProviderSlug = ref<string | undefined>(props.providerPreferences?.provider);
const localProviderSort = ref<'price' | 'latency' | 'throughput'>(props.providerPreferences?.sort || 'throughput');

// Sync local state when props change
watch(() => props.providerPreferences, (newPrefs) => {
  if (newPrefs) {
    localProviderMode.value = newPrefs.mode || 'auto';
    localProviderSlug.value = newPrefs.provider;
    localProviderSort.value = newPrefs.sort || 'throughput';
  }
}, { immediate: true, deep: true });

const dropdownStyle = ref<Record<string, string>>({});

const selectedModel = computed(() =>
  props.models.find(m => m.id === props.modelValue)
);

const providerLabel = computed(() => {
  if (!props.providerPreferences) return 'Auto';
  if (props.providerPreferences.mode === 'auto') {
    const sortLabels: Record<string, string> = {
      throughput: 'Auto',
      latency: 'Fastest',
      price: 'Cheapest',
    };
    return sortLabels[props.providerPreferences.sort || 'throughput'] || 'Auto';
  }
  // Find provider name from slug
  const provider = providers.value.find(p => p.slug === props.providerPreferences?.provider);
  return provider?.name || props.providerPreferences.provider || 'Custom';
});

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

// Split filtered models into pinned and unpinned
const pinnedModelsList = computed(() =>
  filteredModels.value.filter(m => isPinned(m.id))
);

const unpinnedModelsList = computed(() =>
  filteredModels.value.filter(m => !isPinned(m.id))
);

// Handle pin toggle without closing dropdown
function handlePinToggle(event: Event, modelId: string) {
  event.stopPropagation();
  togglePin(modelId);
}

function toggleOpen() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    currentView.value = 'models';
    updateDropdownPosition();
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
}

function updateDropdownPosition() {
  if (!selectorRef.value) return;
  const rect = selectorRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const dropdownHeight = 400; // Approximate max height

  // Check if dropdown would go below viewport
  const spaceBelow = viewportHeight - rect.bottom - 8;
  const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;

  dropdownStyle.value = {
    position: 'fixed',
    left: rect.left + 'px',
    width: '320px',
    zIndex: '9999',
    ...(showAbove
      ? { bottom: (viewportHeight - rect.top + 4) + 'px' }
      : { top: (rect.bottom + 4) + 'px' }
    ),
  };
}

function selectModel(modelId: string) {
  const model = props.models.find(m => m.id === modelId);
  emit('update:modelValue', modelId);
  emit('modelSelected', modelId, model?.name || modelId);
  isOpen.value = false;
  searchQuery.value = '';
}

// Provider selection functions
async function loadProviders() {
  if (!props.modelValue) return;
  providersLoading.value = true;
  try {
    providers.value = await fetchProviders(props.modelValue);
  } catch (e) {
    console.error('Failed to load providers:', e);
  } finally {
    providersLoading.value = false;
  }
}

// Load providers when switching to providers view
watch(currentView, async (view) => {
  if (view === 'providers' && props.modelValue) {
    await loadProviders();
  }
});

// Switch to providers view
function switchToProvidersView() {
  currentView.value = 'providers';
}

function selectAutoMode() {
  localProviderMode.value = 'auto';
  localProviderSlug.value = undefined;
  applyProviderChange();
}

function selectSpecificProvider(slug: string) {
  localProviderMode.value = 'specific';
  localProviderSlug.value = slug;
  applyProviderChange();
}

function applyProviderChange() {
  const newPrefs: ProviderPreferences = {
    mode: localProviderMode.value,
    provider: localProviderMode.value === 'specific' ? localProviderSlug.value : undefined,
    sort: localProviderMode.value === 'auto' ? localProviderSort.value : undefined,
  };
  emit('update:providerPreferences', newPrefs);
}

function formatPrice(price: number): string {
  if (price === 0) return '0';
  if (price < 0.01) return price.toFixed(4);
  if (price < 1) return price.toFixed(3);
  return price.toFixed(2);
}

function getUptimeClass(uptime: number): string {
  if (uptime >= 99) return 'excellent';
  if (uptime >= 95) return 'good';
  if (uptime >= 90) return 'fair';
  return 'poor';
}

// Close on click outside
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    if (!selectorRef.value?.contains(target) && !dropdownRef.value?.contains(target)) {
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
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.1s;
}

.selector-trigger:hover {
  background: #f5f5f5;
  color: #333;
}

.selector-trigger.open {
  background: #f0f0f0;
  color: #171717;
}

.selector-trigger.compact {
  padding: 2px 6px;
  font-size: 12px;
}

.selected-model {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-badge {
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 3px;
  font-size: 11px;
  color: #666;
}

.selector-trigger:hover .provider-badge,
.selector-trigger.open .provider-badge {
  background: #e5e5e5;
}

.chevron {
  transition: transform 0.2s;
  flex-shrink: 0;
  color: #999;
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

.dropdown-header.provider-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
}

.back-btn:hover {
  background: #e5e5e5;
  color: #333;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 14px;
  font-weight: 500;
}

.header-subtitle {
  font-size: 12px;
  color: #666;
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

.item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-badges {
  display: flex;
  gap: 4px;
}

.section-header {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.pin-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #999;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.dropdown-item:hover .pin-btn {
  opacity: 1;
}

.pin-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.pin-btn.pinned {
  opacity: 1;
  color: #1565c0;
}

.pin-btn.pinned:hover {
  color: #c62828;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.provider-config-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #f5f5f5;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.1s;
}

.provider-config-btn:hover {
  background: #eee;
  color: #333;
}

/* Provider view styles */
.provider-list {
  max-height: 300px;
}

.provider-loading {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-size: 13px;
}

.provider-option {
  display: flex;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.1s;
}

.provider-option:hover {
  background: #f9f9f9;
}

.provider-option.selected {
  background: #f5f5f5;
}

.option-radio {
  padding-top: 2px;
}

.radio-outer {
  width: 16px;
  height: 16px;
  border: 2px solid #999;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.provider-option.selected .radio-outer {
  border-color: #171717;
}

.radio-inner {
  width: 8px;
  height: 8px;
  background: #171717;
  border-radius: 50%;
}

.option-content {
  flex: 1;
  min-width: 0;
}

.option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.option-name {
  font-size: 13px;
  font-weight: 500;
}

.option-description {
  font-size: 11px;
  color: #666;
}

.option-badges {
  display: flex;
  gap: 4px;
}

.badge {
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.caching {
  background: #e3f2fd;
  color: #1565c0;
}

.badge.uptime {
  background: #f5f5f5;
  color: #666;
}

.badge.uptime.excellent {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge.uptime.good {
  background: #e8f5e9;
  color: #388e3c;
}

.badge.uptime.fair {
  background: #fff3e0;
  color: #f57c00;
}

.badge.uptime.poor {
  background: #ffebee;
  color: #d32f2f;
}

.option-pricing {
  font-size: 11px;
  color: #666;
  display: flex;
  gap: 6px;
}

.price-sep {
  color: #ccc;
}

.sort-select {
  padding: 3px 6px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 11px;
  background: #fff;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: #171717;
}
</style>
