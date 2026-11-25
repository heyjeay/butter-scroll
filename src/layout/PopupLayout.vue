<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const transition = ref('push');
router.beforeEach((to, from) => {
  transition.value = (to.meta.depth ?? 0) >= (from.meta.depth ?? 0) ? 'push' : 'pop';
});
</script>

<template>
  <!-- both pages share one grid cell while they slide past each other -->
  <main class="grid overflow-hidden">
    <RouterView v-slot="{ Component }">
      <Transition :name="transition">
        <component :is="Component" class="col-start-1 row-start-1 bg-bg" />
      </Transition>
    </RouterView>
  </main>
</template>
