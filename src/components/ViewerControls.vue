<template>
  <Card size="sm">
    <CardHeader>
      <CardTitle>Visualización</CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <label class="flex items-center justify-between gap-3 text-sm">
        <span class="flex items-center gap-2">
          <GridIcon class="size-4 text-muted-foreground" />
          Malla (wireframe)
        </span>
        <Switch
          :model-value="wireframe"
          :disabled="disabled"
          @update:model-value="emit('update:wireframe', $event)"
        />
      </label>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <label class="flex items-center justify-between gap-3 text-sm">
              <span class="flex items-center gap-2">
                <PlayIcon class="size-4 text-muted-foreground" />
                {{ animationsLabel }}
              </span>
              <Switch
                :model-value="animationsEnabled"
                :disabled="disabled || animationNames.length === 0"
                @update:model-value="emit('update:animationsEnabled', $event)"
              />
            </label>
          </TooltipTrigger>
          <TooltipContent>
            {{
              animationNames.length
                ? `Clips: ${animationNames.join(', ')}`
                : 'El modelo no incluye animaciones'
            }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator />

      <div class="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          class="flex-1"
          :disabled="disabled"
          @click="emit('reset-view')"
        >
          <ScanIcon />
          Reencuadrar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :disabled="disabled"
          @click="emit('reload')"
        >
          <RotateCwIcon />
          Recargar
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GridIcon, PlayIcon, RotateCwIcon, ScanIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const props = defineProps<{
  wireframe: boolean
  animationsEnabled: boolean
  animationNames: string[]
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:wireframe': [value: boolean]
  'update:animationsEnabled': [value: boolean]
  'reset-view': []
  reload: []
}>()

const animationsLabel = computed(() =>
  props.animationNames.length > 0
    ? `Animaciones (${props.animationNames.length})`
    : 'Animaciones',
)
</script>
