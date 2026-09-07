/**
 * Fuentes de modelo glTF 2.0 que el visor puede cargar. El fichero principal
 * es un `.glb` (binario, autocontenido) o un `.gltf` (JSON), que a su vez
 * puede embeber sus recursos en `data:` URIs o referenciar ficheros externos
 * (`.bin`, imágenes) que deben acompañarlo.
 */
export const GLTF_EXTENSIONS = ['.glb', '.gltf']

export const COMPANION_EXTENSIONS = [
  '.bin',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ktx2',
  '.bmp',
]

export const ACCEPTED_EXTENSIONS = [...GLTF_EXTENSIONS, ...COMPANION_EXTENSIONS]

export enum SourceOrigin {
  SAMPLE = 'sample',
  LOCAL = 'local',
}

export interface ModelSource {
  id: string
  origin: SourceOrigin
  /** Nombre del fichero principal (.glb / .gltf). */
  fileName: string
  /** Object URL del fichero principal. */
  url: string
  /** Ficheros auxiliares (nombre → object URL): .bin, texturas… */
  companions: Record<string, string>
  /** Tamaño en MB del conjunto, solo informativo. */
  sizeMb: number
  /** Libera los object URLs cuando la fuente deja de usarse. */
  release: () => void
  /** Autoría y licencia, para las muestras. */
  credit?: { text: string; url: string }
  /**
   * Id de la fuente cuyos recursos ha heredado (al añadir auxiliares). El
   * consumidor no debe liberar esa fuente: lo hará `release` de esta.
   */
  inheritsFrom?: string
}

export const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase()
}

export const isGltfFile = (fileName: string): boolean =>
  GLTF_EXTENSIONS.includes(extensionOf(fileName))

export const isCompanionFile = (fileName: string): boolean =>
  COMPANION_EXTENSIONS.includes(extensionOf(fileName))

/** Muestra incluida en el repo (ver public/models/README.md). */
export const SAMPLE_SOURCE: ModelSource = {
  id: 'sample:vintage_pocket_watch_2k',
  origin: SourceOrigin.SAMPLE,
  fileName: 'vintage_pocket_watch_2k.glb',
  url: '/models/vintage_pocket_watch_2k.glb',
  companions: {},
  sizeMb: 6.2,
  release: () => {},
  credit: {
    text: 'Vintage Pocket Watch · Tal Swicegood · Poly Haven · CC0',
    url: 'https://polyhaven.com/a/vintage_pocket_watch',
  },
}
