import type { AnimationClip, Object3D } from 'three'

export interface ModelStats {
  meshes: number
  vertices: number
  triangles: number
  materials: number
  textures: number
}

export enum GltfVariant {
  /** Binario autocontenido. */
  GLB = 'glb',
  /** JSON con recursos embebidos en data: URIs. */
  GLTF_EMBEDDED = 'gltf-embedded',
  /** JSON con .bin e imágenes externos. */
  GLTF_EXTERNAL = 'gltf-external',
}

/** Metadatos leídos de la cabecera glTF (asset, extensiones, animaciones). */
export interface GltfInfo {
  variant: GltfVariant
  version: string
  generator?: string
  copyright?: string
  extensionsUsed: string[]
  extensionsRequired: string[]
  scenes: number
  nodes: number
  animations: string[]
  /** Recursos externos que el fichero referencia (uri de buffers e imágenes). */
  externalResources: string[]
}

export interface LoadedModel {
  object: Object3D
  animations: AnimationClip[]
  stats: ModelStats
  info: GltfInfo
  /** Recursos que no se pudieron cargar (texturas ausentes, etc.). */
  warnings: string[]
}

export interface LoadProgress {
  /** 0–100, o null si el navegador no informa del tamaño total. */
  percent: number | null
  loadedBytes: number
}

export type ProgressCallback = (progress: LoadProgress) => void
