<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Set background color via useHead to prevent black flash during page transitions
useHead({
  htmlAttrs: {
    style: 'background-color: #fff;',
  },
  bodyAttrs: {
    style: 'background-color: #fff;',
  },
});
</script>
