<template>
  <span v-if="source" class="flex gap-1">
    <Badge
      :variant="source.origin === SourceOrigin.LOCAL ? 'default' : 'secondary'"
    >
      {{ source.origin === SourceOrigin.LOCAL ? 'local' : 'muestra' }}
    </Badge>
    <Badge v-if="info" variant="outline">
      {{ variantLabel(info.variant) }}
    </Badge>
  </span>
</template>

<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { SourceOrigin, type ModelSource } from '@/types/model-source'
import { GltfVariant, type GltfInfo } from '@/types/viewer'

defineProps<{
  source: ModelSource | null
  info: GltfInfo | null
}>()

const variantLabel = (variant: GltfVariant): string => {
  switch (variant) {
    case GltfVariant.GLB:
      return 'GLB'
    case GltfVariant.GLTF_EMBEDDED:
      return 'glTF autocontenido'
    default:
      return 'glTF + externos'
  }
}
</script>
