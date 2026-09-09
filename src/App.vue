<template>
  <div class="flex h-full flex-col">
    <header
      class="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/70 px-6 py-3 backdrop-blur-xl"
    >
      <span
        class="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
      >
        <BoxIcon class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <h1 class="text-lg leading-tight font-semibold tracking-tight">
          Visor de modelos glTF
        </h1>
        <p class="text-xs text-muted-foreground">
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
      class="grid min-h-0 flex-1 gap-4 p-4 max-lg:grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px]"
    >
      <aside class="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <GltfLoader
          @files="loadLocalFiles"
          @sample="selectSource(SAMPLE_SOURCE)"
        />
        <ViewerControls
          v-model:wireframe="wireframe"
          v-model:animations-enabled="animationsEnabled"
          :animation-names="viewer.animationNames.value"
          :disabled="!hasModel"
          @reset-view="viewer.resetView"
          @reload="loadSelected"
        />
      </aside>

      <ModelViewer
        ref="modelViewer"
        class="min-h-[420px] max-lg:min-h-[60vh]"
        :loading="viewer.isLoading.value"
        :progress="viewer.progress.value"
        :error="viewer.error.value"
        :empty="selectedSource === null"
        @files="loadLocalFiles"
      />

      <aside
        class="flex min-h-0 flex-col gap-4 overflow-y-auto max-xl:lg:col-span-2"
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
import { BoxIcon, MoonIcon, SunIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import GltfLoader from '@/components/GltfLoader.vue'
import ViewerControls from '@/components/ViewerControls.vue'
import ModelViewer from '@/components/ModelViewer.vue'
import ModelInfoPanel from '@/components/ModelInfoPanel.vue'
import { useTheme } from '@/composables/useTheme'
import { useThreeViewer } from '@/composables/useThreeViewer'
import { createLocalSource } from '@/loaders/localFiles'
import { SAMPLE_SOURCE, type ModelSource } from '@/types/model-source'

const { theme, toggle: toggleTheme } = useTheme()

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
