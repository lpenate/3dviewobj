import { ref, watchEffect } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'viewer-theme'

const readInitial = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Sin almacenamiento disponible: se usa la preferencia del sistema.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const theme = ref<Theme>(readInitial())

watchEffect(() => {
  document.documentElement.classList.toggle('dark', theme.value === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, theme.value)
  } catch {
    // Ignorado: la preferencia simplemente no persiste.
  }
})

/** Tema claro/oscuro con la clase `.dark` en <html>, como espera shadcn. */
export const useTheme = () => ({
  theme,
  toggle: (): void => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  },
})
