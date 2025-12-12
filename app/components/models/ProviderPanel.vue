<template>
  <Teleport to="body">
    <div v-if="open" class="provider-panel-overlay" @click.self="close">
      <div class="provider-panel" ref="panelRef">
        <div class="panel-header">
          <div class="header-info">
            <div class="model-name-row">
              <h3 class="model-name">{{ modelName }}</h3>
              <a
                :href="`https://openrouter.ai/${modelId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="external-link"
                title="View on OpenRouter"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span class="sr-only">View {{ modelName }} on OpenRouter (opens in new tab)</span>
              </a>
            </div>
            <span class="provider-count">{{ providers.length }} provider{{ providers.length !== 1 ? 's' : '' }} available</span>
          </div>
          <button class="close-btn" @click="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div v-if="loading" class="panel-loading">
          <span>Loading providers...</span>
        </div>

        <div v-else-if="error" class="panel-error">
          <span>{{ error }}</span>
          <button @click="retry" class="retry-btn">Retry</button>
        </div>

        <div v-else class="panel-content">
          <!-- Auto mode option -->
          <div
            class="provider-option auto-option"
            :class="{ selected: currentMode === 'auto' }"
            @click="selectAuto"
          >
            <div class="option-radio">
              <div class="radio-outer">
                <div v-if="currentMode === 'auto'" class="radio-inner"></div>
              </div>
            </div>
            <div class="option-content">
              <div class="option-header">
                <span class="option-name">Auto</span>
                <select
                  v-if="currentMode === 'auto'"
                  v-model="currentSort"
                  class="sort-select"
                  @click.stop
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
            :class="{ selected: currentMode === 'specific' && currentProvider === provider.slug }"
            @click="selectProvider(provider.slug)"
          >
            <div class="option-radio">
              <div class="radio-outer">
                <div v-if="currentMode === 'specific' && currentProvider === provider.slug" class="radio-inner"></div>
              </div>
            </div>
            <div class="option-content">
              <div class="option-header">
                <span class="option-name">{{ provider.name }}</span>
                <div class="option-badges">
                  <span v-if="provider.supportsCaching" class="badge caching">CACHING</span>
                  <span class="badge uptime" :class="getUptimeClass(provider.uptime)">
                    {{ Math.round(provider.uptime) }}% up
                  </span>
                </div>
              </div>
              <div class="option-pricing">
                <span class="price">${{ formatPrice(provider.pricing.prompt) }}/M in</span>
                <span class="price-separator">·</span>
                <span class="price">${{ formatPrice(provider.pricing.completion) }}/M out</span>
                <template v-if="provider.supportsCaching && provider.pricing.cacheRead">
                  <span class="price-separator">·</span>
                  <span class="price cache">Cache: ${{ formatPrice(provider.pricing.cacheRead) }}/M read</span>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <button class="btn-secondary" @click="close">Cancel</button>
          <button class="btn-primary" @click="confirm">Confirm</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ModelProvider, ProviderPreferences } from '~/types';

const props = defineProps<{
  open: boolean;
  modelId: string;
  modelName: string;
  modelValue?: ProviderPreferences;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ProviderPreferences];
  'close': [];
}>();

const panelRef = ref<HTMLElement>();
const { fetchProviders } = useProviders();

// Local state
const providers = ref<ModelProvider[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Current selection state
const currentMode = ref<'auto' | 'specific'>(props.modelValue?.mode || 'auto');
const currentProvider = ref<string | undefined>(props.modelValue?.provider);
const currentSort = ref<'price' | 'latency' | 'throughput'>(props.modelValue?.sort || 'throughput');

// Load providers when panel opens
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.modelId) {
    await loadProviders();
  }
}, { immediate: true });

// Reset selection when modelValue changes
watch(() => props.modelValue, (newValue) => {
  currentMode.value = newValue?.mode || 'auto';
  currentProvider.value = newValue?.provider;
  currentSort.value = newValue?.sort || 'throughput';
}, { immediate: true });

async function loadProviders() {
  loading.value = true;
  error.value = null;

  try {
    providers.value = await fetchProviders(props.modelId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load providers';
  } finally {
    loading.value = false;
  }
}

function retry() {
  loadProviders();
}

function selectAuto() {
  currentMode.value = 'auto';
  currentProvider.value = undefined;
}

function selectProvider(slug: string) {
  currentMode.value = 'specific';
  currentProvider.value = slug;
}

function confirm() {
  const preferences: ProviderPreferences = {
    mode: currentMode.value,
    provider: currentMode.value === 'specific' ? currentProvider.value : undefined,
    sort: currentMode.value === 'auto' ? currentSort.value : undefined,
  };
  emit('update:modelValue', preferences);
  emit('close');
}

function close() {
  emit('close');
}

function formatPrice(price: number): string {
  if (price === 0) return '0.00';
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

// Close on escape
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.open) {
      close();
    }
  };
  document.addEventListener('keydown', handleEscape);
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape);
  });
});
</script>

<style scoped>
.provider-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.provider-panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  margin: 16px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.external-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  color: #666;
  border-radius: 4px;
  transition: all 0.1s;
}

.external-link:hover {
  color: #333;
  background: #f0f0f0;
}

.external-link:focus {
  outline: 2px solid #171717;
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.model-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.provider-count {
  font-size: 13px;
  color: #666;
}

.close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.panel-loading,
.panel-error {
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.panel-error {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.retry-btn {
  padding: 6px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.retry-btn:hover {
  background: #f5f5f5;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.provider-option {
  display: flex;
  gap: 12px;
  padding: 14px 20px;
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

.provider-option.auto-option {
  border-bottom: 2px solid #e0e0e0;
}

.option-radio {
  padding-top: 2px;
}

.radio-outer {
  width: 18px;
  height: 18px;
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
  width: 10px;
  height: 10px;
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
  margin-bottom: 4px;
}

.option-name {
  font-size: 14px;
  font-weight: 500;
}

.option-description {
  font-size: 12px;
  color: #666;
}

.option-badges {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
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
  font-size: 12px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.price-separator {
  color: #ccc;
}

.price.cache {
  color: #1565c0;
}

.sort-select {
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 12px;
  background: #fff;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: #171717;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
}

.btn-secondary,
.btn-primary {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.1s;
}

.btn-secondary {
  background: #fff;
  border: 1px solid #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: #171717;
  border: 1px solid #171717;
  color: #fff;
}

.btn-primary:hover {
  background: #333;
}
</style>
