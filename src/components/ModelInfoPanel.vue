<template>
  <Card size="sm">
    <CardHeader>
      <CardTitle>Ficha del modelo</CardTitle>
      <CardDescription v-if="source" class="truncate">
        {{ source.fileName }}
      </CardDescription>
      <CardAction>
        <ModelInfoBadges :source="source" :info="info" />
      </CardAction>
    </CardHeader>
    <CardContent>
      <ModelInfoContent
        :source="source"
        :info="info"
        :stats="stats"
        :load-time-ms="loadTimeMs"
        :loading="loading"
      />
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import ModelInfoBadges from '@/components/ModelInfoBadges.vue'
import ModelInfoContent from '@/components/ModelInfoContent.vue'
import type { ModelSource } from '@/types/model-source'
import type { GltfInfo, ModelStats } from '@/types/viewer'

defineProps<{
  source: ModelSource | null
  info: GltfInfo | null
  stats: ModelStats | null
  loadTimeMs: number | null
  loading: boolean
}>()
</script>
