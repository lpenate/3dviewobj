<template>
  <Sheet>
    <SheetTrigger as-child>
      <Button
        variant="secondary"
        size="sm"
        class="bg-background/80 shadow-md backdrop-blur-md"
        aria-label="Ver ficha del modelo"
      >
        <InfoIcon />
        Ficha
      </Button>
    </SheetTrigger>
    <SheetContent
      side="bottom"
      class="max-h-[85vh] overflow-y-auto rounded-t-2xl"
    >
      <SheetHeader class="pr-8">
        <SheetTitle class="truncate">
          {{ source?.fileName ?? 'Ficha del modelo' }}
        </SheetTitle>
        <SheetDescription as-child>
          <div class="flex items-center gap-2">
            <ModelInfoBadges :source="source" :info="info" />
          </div>
        </SheetDescription>
      </SheetHeader>
      <div class="px-4 pb-6">
        <ModelInfoContent
          :source="source"
          :info="info"
          :stats="stats"
          :load-time-ms="loadTimeMs"
          :loading="loading"
        />
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { InfoIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import ModelInfoBadges from '@/components/ModelInfoBadges.vue'
import ModelInfoContent from '@/components/ModelInfoContent.vue'
import type { ModelSource } from '@/types/model-source'
import type { GltfInfo, ModelStats } from '@/types/viewer'

/** Ficha del modelo en un panel deslizante desde abajo (móvil). */
defineProps<{
  source: ModelSource | null
  info: GltfInfo | null
  stats: ModelStats | null
  loadTimeMs: number | null
  loading: boolean
}>()
</script>
