<template>
  <div v-if="source" class="flex flex-col gap-4">
    <dl class="info-grid">
      <template v-if="Object.keys(source.companions).length">
        <dt>Auxiliares</dt>
        <dd>{{ Object.keys(source.companions).join(', ') }}</dd>
      </template>
      <dt>Tamaño</dt>
      <dd>{{ source.sizeMb }} MB</dd>
      <template v-if="source.credit">
        <dt>Autoría</dt>
        <dd>
          <a
            class="text-primary hover:underline"
            :href="source.credit.url"
            target="_blank"
            rel="noopener"
          >
            {{ source.credit.text }}
          </a>
        </dd>
      </template>
      <template v-if="info">
        <dt>glTF</dt>
        <dd>{{ info.version }}</dd>
        <dt>Generador</dt>
        <dd>{{ info.generator ?? 'no indicado' }}</dd>
        <template v-if="info.copyright">
          <dt>Copyright</dt>
          <dd>{{ info.copyright }}</dd>
        </template>
        <dt>Escenas / nodos</dt>
        <dd>{{ info.scenes }} / {{ formatNumber(info.nodes) }}</dd>
        <dt>Animaciones</dt>
        <dd>
          {{ info.animations.length ? info.animations.join(', ') : 'ninguna' }}
        </dd>
        <dt>Extensiones</dt>
        <dd class="flex flex-wrap gap-1">
          <template v-if="info.extensionsUsed.length">
            <Badge
              v-for="extension in info.extensionsUsed"
              :key="extension"
              :variant="
                info.extensionsRequired.includes(extension)
                  ? 'default'
                  : 'secondary'
              "
              class="font-mono text-[10px]"
              :title="
                info.extensionsRequired.includes(extension)
                  ? 'Requerida'
                  : 'Opcional'
              "
            >
              {{ extension }}
            </Badge>
          </template>
          <template v-else>ninguna</template>
        </dd>
        <template v-if="info.externalResources.length">
          <dt>Recursos externos</dt>
          <dd>{{ info.externalResources.join(', ') }}</dd>
        </template>
      </template>
    </dl>

    <template v-if="stats">
      <Separator />
      <div>
        <h3
          class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Geometría cargada
        </h3>
        <dl class="stats-grid">
          <div>
            <dt>Mallas</dt>
            <dd>{{ formatNumber(stats.meshes) }}</dd>
          </div>
          <div>
            <dt>Vértices</dt>
            <dd>{{ formatNumber(stats.vertices) }}</dd>
          </div>
          <div>
            <dt>Triángulos</dt>
            <dd>{{ formatNumber(stats.triangles) }}</dd>
          </div>
          <div>
            <dt>Materiales</dt>
            <dd>{{ formatNumber(stats.materials) }}</dd>
          </div>
          <div>
            <dt>Texturas</dt>
            <dd>{{ formatNumber(stats.textures) }}</dd>
          </div>
          <div v-if="loadTimeMs !== null">
            <dt>Carga</dt>
            <dd>{{ formatNumber(loadTimeMs) }} ms</dd>
          </div>
        </dl>
      </div>
    </template>
    <template v-else-if="loading">
      <Separator />
      <div class="flex flex-col gap-2">
        <Skeleton class="h-3 w-1/3" />
        <Skeleton class="h-3 w-2/3" />
        <Skeleton class="h-3 w-1/2" />
        <Skeleton class="h-3 w-3/5" />
      </div>
    </template>
  </div>

  <p v-else class="text-sm text-muted-foreground">
    Sin modelo. Carga un .glb o .gltf para ver aquí sus metadatos: versión,
    generador, extensiones, animaciones y estadísticas de geometría.
  </p>
</template>

<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { ModelSource } from '@/types/model-source'
import type { GltfInfo, ModelStats } from '@/types/viewer'

/** Contenido de la ficha del modelo, sin contenedor: lo envuelve una Card
 *  en escritorio y un Sheet en móvil. */
defineProps<{
  source: ModelSource | null
  info: GltfInfo | null
  stats: ModelStats | null
  loadTimeMs: number | null
  loading: boolean
}>()

const numberFormatter = new Intl.NumberFormat('es-ES')
const formatNumber = (value: number): string => numberFormatter.format(value)
</script>

<style scoped>
@reference '@/styles/index.css';

.info-grid {
  @apply grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm;
}

.info-grid dt {
  @apply text-muted-foreground;
}

.info-grid dd {
  @apply font-medium break-words;
}

.stats-grid {
  @apply grid grid-cols-3 gap-2;
}

.stats-grid > div {
  @apply rounded-lg bg-muted px-2.5 py-2;
}

.stats-grid dt {
  @apply text-[11px] text-muted-foreground;
}

.stats-grid dd {
  @apply text-sm font-semibold tabular-nums;
}
</style>
