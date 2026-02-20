import { defineStore } from 'pinia';
// src/stores/counter.ts
import { computed, ref } from 'vue';

export const useCounterStore = defineStore('counter', () => {
  const count = ref<number>(0);
  const doubleCount = computed<number>(() => count.value * 2);

  function increment(): void {
    count.value++;
  }

  function decrement(): void {
    count.value--;
  }

  function reset(): void {
    count.value = 0;
  }

  return { count, doubleCount, increment, decrement, reset };
});
