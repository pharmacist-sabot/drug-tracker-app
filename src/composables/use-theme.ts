import type { Ref } from 'vue';

// src/composables/useTheme.ts
import { onMounted, ref, watch } from 'vue';

const THEME_STORAGE_KEY = 'theme' as const;
const DARK_CLASS = 'dark' as const;

type ThemeName = 'light' | 'dark';

type UseThemeReturn = {
  /** Reactive flag — `true` when dark mode is active. */
  isDark: Ref<boolean>;
  /** Toggle between light and dark mode. */
  toggleTheme: () => void;
};

// Shared singleton ref so every consumer sees the same state.
const isDark = ref<boolean>(false);

/**
 * Composable that manages the application's light / dark theme.
 *
 * - Persists the user's preference in `localStorage`.
 * - Falls back to the OS-level `prefers-color-scheme` media query.
 * - Adds / removes the `dark` class on `<html>` so CSS variables switch.
 */
export function useTheme(): UseThemeReturn {
  const applyTheme = (dark: boolean): void => {
    if (dark) {
      document.documentElement.classList.add(DARK_CLASS);
    }
    else {
      document.documentElement.classList.remove(DARK_CLASS);
    }
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  };

  const toggleTheme = (): void => {
    isDark.value = !isDark.value;
  };

  // Sync DOM + storage whenever the reactive value changes.
  watch(isDark, (newVal: boolean) => {
    applyTheme(newVal);
  });

  // Initialise from persisted preference or OS setting on first mount.
  onMounted(() => {
    const saved: string | null = localStorage.getItem(THEME_STORAGE_KEY);

    if (saved !== null) {
      isDark.value = (saved as ThemeName) === 'dark';
    }
    else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  });

  return {
    isDark,
    toggleTheme,
  };
}
