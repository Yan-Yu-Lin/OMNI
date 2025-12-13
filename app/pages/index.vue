<template>
  <div />
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid';

const router = useRouter();

// Redirect to a new chat immediately
onMounted(() => {
  const newId = nanoid();
  router.replace(`/chat/${newId}`);
});
</script>
