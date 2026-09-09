<template>
  <section
    class="relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-shadow"
    :class="{ 'ring-2 ring-primary': isDragging }"
    aria-label="Visor 3D"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <div
      ref="canvasHost"
      class="viewer-stage min-h-0 flex-1 touch-none"
      :aria-busy="loading"
    />

    <div
      v-if="isDragging"
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/5"
    >
      <p
        class="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-lg"
      >
        Suelta para cargar el modelo
      </p>
    </div>

    <div
      v-else-if="loading"
      class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-sm"
    >
      <Loader2Icon class="size-8 animate-spin text-primary" />
      <div class="flex w-56 flex-col items-center gap-2">
        <Progress :model-value="progress?.percent ?? undefined" />
        <p class="text-sm text-muted-foreground tabular-nums">
          <template v-if="progress?.percent !== null && progress">
            Leyendo… {{ progress.percent }} %
          </template>
          <template v-else-if="progress">
            Leyendo… {{ formatMb(progress.loadedBytes) }} MB
          </template>
          <template v-else>Procesando geometría…</template>
        </p>
      </div>
    </div>

    <div
      v-else-if="error"
      class="absolute inset-0 flex items-center justify-center p-8"
    >
      <Alert variant="destructive" class="max-w-lg shadow-lg">
        <CircleAlertIcon />
        <AlertTitle>No se pudo cargar el modelo</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
    </div>

    <div
      v-else-if="empty"
      class="absolute inset-0 flex items-center justify-center p-8"
    >
      <Alert class="max-w-lg shadow-lg">
        <BoxIcon />
        <AlertTitle>Ningún modelo cargado</AlertTitle>
        <AlertDescription>
          Arrastra aquí un fichero .glb o .gltf, o usa «Seleccionar ficheros» en
          el panel de la izquierda.
        </AlertDescription>
      </Alert>
    </div>

    <p
      v-else
      class="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-muted-foreground"
    >
      Arrastra para orbitar · rueda para acercar · botón derecho para desplazar
      · doble clic sobre una pieza para centrarla
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BoxIcon, CircleAlertIcon, Loader2Icon } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { filesFromDrop } from '@/loaders/localFiles'
import type { LoadProgress } from '@/types/viewer'

defineProps<{
  loading: boolean
  progress: LoadProgress | null
  error: string | null
  /** No hay ningún modelo seleccionado. */
  empty: boolean
}>()

const emit = defineEmits<{ files: [files: File[]] }>()

const canvasHost = ref<HTMLElement | null>(null)
const isDragging = ref(false)

const onDrop = (event: DragEvent): void => {
  isDragging.value = false
  const files = filesFromDrop(event)
  if (files.length) emit('files', files)
}

const formatMb = (bytes: number): string => (bytes / 1_048_576).toFixed(1)

defineExpose({ canvasHost })
</script>

<style scoped>
/* Fondo de estudio: degradado radial suave que sigue al tema. */
.viewer-stage {
  background: radial-gradient(
    ellipse at 50% 30%,
    color-mix(in oklch, var(--card) 100%, transparent) 0%,
    color-mix(in oklch, var(--muted) 70%, var(--card)) 60%,
    var(--muted) 100%
  );
}
</style>
