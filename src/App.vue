<template>
  <div class="flex h-full flex-col">
    <header
      class="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/70 px-4 py-3 backdrop-blur-xl sm:gap-4 sm:px-6"
    >
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
      >
        <BoxIcon class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg leading-tight font-semibold tracking-tight">
          Visor de modelos glTF
        </h1>
        <p class="truncate text-xs text-muted-foreground">
          POC · Vue 3 + three.js + shadcn-vue
        </p>
      </div>
      <Badge variant="outline" class="hidden sm:inline-flex">
        glTF 2.0 · .glb / .gltf
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        :aria-label="
          theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
        "
        @click="toggleTheme"
      >
        <SunIcon v-if="theme === 'dark'" />
        <MoonIcon v-else />
      </Button>
    </header>

    <main
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-4 lg:overflow-visible lg:p-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]"
    >
      <!-- Visor: primero en móvil, centro en escritorio. -->
      <div
        class="relative min-h-[60vh] shrink-0 lg:order-2 lg:min-h-[420px] lg:shrink"
      >
        <ModelViewer
          ref="modelViewer"
          class="h-full"
          :loading="viewer.isLoading.value"
          :progress="viewer.progress.value"
          :error="viewer.error.value"
          :empty="selectedSource === null"
          @files="loadLocalFiles"
        />
        <!-- Móvil: la ficha se abre en un panel para no ocupar espacio. -->
        <div v-if="!isDesktop" class="absolute top-3 right-3">
          <ModelInfoSheet
            :source="selectedSource"
            :info="viewer.info.value"
            :stats="viewer.stats.value"
            :load-time-ms="viewer.loadTimeMs.value"
            :loading="viewer.isLoading.value"
          />
        </div>
      </div>

      <aside
        class="flex shrink-0 flex-col gap-3 lg:order-1 lg:min-h-0 lg:shrink lg:gap-4 lg:overflow-y-auto"
      >
        <ViewerControls
          v-model:wireframe="wireframe"
          v-model:animations-enabled="animationsEnabled"
          :animation-names="viewer.animationNames.value"
          :disabled="!hasModel"
          class="lg:order-2"
          @reset-view="viewer.resetView"
          @reload="loadSelected"
        />
        <GltfLoader
          class="lg:order-1"
          :disabled="!isDesktop"
          @files="loadLocalFiles"
          @sample="selectSource(SAMPLE_SOURCE)"
        />
      </aside>

      <!-- Escritorio: ficha fija a la derecha (bajo el visor entre lg y xl). -->
      <aside
        v-if="isDesktop"
        class="flex min-h-0 flex-col gap-4 lg:order-3 lg:col-span-2 lg:overflow-y-auto xl:col-span-1"
      >
        <ModelInfoPanel
          :source="selectedSource"
          :info="viewer.info.value"
          :stats="viewer.stats.value"
          :load-time-ms="viewer.loadTimeMs.value"
          :loading="viewer.isLoading.value"
        />
      </aside>
    </main>

    <Toaster position="bottom-right" :theme="theme" rich-colors close-button />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { BoxIcon, MoonIcon, SunIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import GltfLoader from '@/components/GltfLoader.vue'
import ViewerControls from '@/components/ViewerControls.vue'
import ModelViewer from '@/components/ModelViewer.vue'
import ModelInfoPanel from '@/components/ModelInfoPanel.vue'
import ModelInfoSheet from '@/components/ModelInfoSheet.vue'
import { useTheme } from '@/composables/useTheme'
import { useThreeViewer } from '@/composables/useThreeViewer'
import { createLocalSource } from '@/loaders/localFiles'
import { SAMPLE_SOURCE, type ModelSource } from '@/types/model-source'

const { theme, toggle: toggleTheme } = useTheme()

/** Punto de corte `lg` de Tailwind: por debajo, layout móvil/tablet. */
const isDesktop = useMediaQuery('(min-width: 1024px)')

/** Fuente activa: la muestra al arrancar, o un fichero local. */
const selectedSource = shallowRef<ModelSource | null>(null)

const wireframe = ref(false)
const animationsEnabled = ref(true)

const modelViewer = ref<InstanceType<typeof ModelViewer> | null>(null)
const canvasHost = computed<HTMLElement | null>(
  () => modelViewer.value?.canvasHost ?? null,
)

const viewer = useThreeViewer(canvasHost, { wireframe, animationsEnabled })
const hasModel = computed(() => viewer.stats.value !== null)

const loadSelected = async (): Promise<void> => {
  const source = selectedSource.value
  if (!source) return

  const warnings = await viewer.load(source)
  warnings.forEach((warning) => toast.warning(warning))

  if (viewer.error.value) {
    toast.error(`Error cargando ${source.fileName}`, {
      description: viewer.error.value,
    })
  } else if (viewer.stats.value) {
    toast.success(`${source.fileName} cargado`, {
      description: `${viewer.loadTimeMs.value ?? 0} ms`,
      duration: 3000,
    })
  }
}

const selectSource = (source: ModelSource): void => {
  const previous = selectedSource.value
  if (previous?.id === source.id) return
  selectedSource.value = source
  if (previous && source.inheritsFrom !== previous.id) previous.release()
}

const loadLocalFiles = (files: File[]): void => {
  if (!isDesktop.value) {
    toast.info('La carga de modelos locales está disponible en escritorio')
    return
  }
  try {
    const { source, warnings } = createLocalSource(files, selectedSource.value)
    warnings.forEach((warning) => toast.warning(warning))
    selectSource(source)
  } catch (cause) {
    toast.error('No se puede cargar el fichero', {
      description:
        cause instanceof Error ? cause.message : 'Fichero no reconocido',
    })
  }
}

watch(selectedSource, loadSelected)
onMounted(() => selectSource(SAMPLE_SOURCE))
</script>
