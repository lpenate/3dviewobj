<template>
  <Card size="sm">
    <CardHeader>
      <CardTitle>Cargar glTF</CardTitle>
      <CardDescription>
        .glb autocontenido, o .gltf con su .bin e imágenes
      </CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <div
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center transition-colors"
        :class="
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-input bg-muted/40 hover:border-primary/60'
        "
        role="button"
        tabindex="0"
        aria-label="Soltar ficheros glTF aquí o pulsar para seleccionarlos"
        @click="openPicker"
        @keydown.enter.space.prevent="openPicker"
        @dragenter.prevent="isDragging = true"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <span
          class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <UploadIcon class="size-5" />
        </span>
        <p class="text-sm font-medium">Arrastra aquí el modelo</p>
        <p class="text-xs text-muted-foreground">
          Los recursos externos de un .gltf se pueden soltar a la vez o después
        </p>
        <Button size="sm" variant="outline" @click.stop="openPicker">
          Seleccionar ficheros
        </Button>
        <input
          ref="input"
          class="hidden"
          type="file"
          multiple
          :accept="accept"
          @change="onPick"
        />
      </div>

      <p class="font-mono text-[11px] text-muted-foreground">
        {{ ACCEPTED_EXTENSIONS.join(' ') }}
      </p>

      <Separator />

      <div class="flex flex-col gap-1.5">
        <Button size="sm" @click="emit('sample')">
          <WatchIcon />
          Cargar reloj de muestra
        </Button>
        <a
          class="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
          :href="SAMPLE_SOURCE.credit?.url"
          target="_blank"
          rel="noopener"
        >
          {{ SAMPLE_SOURCE.credit?.text }}
        </a>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UploadIcon, WatchIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { filesFromDrop } from '@/loaders/localFiles'
import { ACCEPTED_EXTENSIONS, SAMPLE_SOURCE } from '@/types/model-source'

const emit = defineEmits<{ files: [files: File[]]; sample: [] }>()

const input = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const accept = ACCEPTED_EXTENSIONS.join(',')

const openPicker = (): void => input.value?.click()

const onPick = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  target.value = ''
  if (files.length) emit('files', files)
}

const onDrop = (event: DragEvent): void => {
  isDragging.value = false
  const files = filesFromDrop(event)
  if (files.length) emit('files', files)
}
</script>
