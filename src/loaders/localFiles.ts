import {
  COMPANION_EXTENSIONS,
  SourceOrigin,
  extensionOf,
  isCompanionFile,
  isGltfFile,
  type ModelSource,
} from '@/types/model-source'

export interface LocalSourceResult {
  source: ModelSource
  /** Avisos no bloqueantes. */
  warnings: string[]
}

const toMb = (bytes: number): number =>
  Math.round((bytes / 1_048_576) * 10) / 10

const totalSize = (files: File[]): number =>
  files.reduce((total, file) => total + file.size, 0)

/**
 * Construye una fuente glTF a partir de ficheros locales. El primer `.glb` o
 * `.gltf` es el principal; el resto (`.bin`, imágenes) se resuelve por nombre
 * mediante el LoadingManager. Si solo llegan auxiliares y hay una fuente
 * actual, se añaden a ella (así se puede soltar el `.bin` después).
 */
export const createLocalSource = (
  files: File[],
  current?: ModelSource | null,
): LocalSourceResult => {
  if (files.length === 0)
    throw new Error('No se ha seleccionado ningún fichero')

  const models = files.filter((file) => isGltfFile(file.name))
  if (models.length === 0) return attachCompanions(files, current)

  const warnings: string[] = []
  const primary = models[0]
  if (models.length > 1) {
    warnings.push(
      `Varios modelos glTF: se carga ${primary.name}; el resto se ignora.`,
    )
  }

  const unknown = files.filter(
    (file) => file !== primary && !isCompanionFile(file.name),
  )
  if (unknown.length > 0) {
    warnings.push(
      `Ficheros ignorados (no son auxiliares glTF): ${unknown.map((file) => file.name).join(', ')}`,
    )
  }

  const included = files.filter((file) => !unknown.includes(file))
  const urls = new Map(
    included.map((file) => [file, URL.createObjectURL(file)] as const),
  )

  const source: ModelSource = {
    id: `local:${Date.now()}:${primary.name}`,
    origin: SourceOrigin.LOCAL,
    fileName: primary.name,
    url: urls.get(primary)!,
    companions: Object.fromEntries(
      included
        .filter((file) => file !== primary)
        .map((file) => [file.name, urls.get(file)!]),
    ),
    sizeMb: toMb(totalSize(included)),
    release: () => urls.forEach((url) => URL.revokeObjectURL(url)),
  }

  return { source, warnings }
}

/** Añade auxiliares a la fuente actual y devuelve una fuente nueva que hereda sus recursos. */
const attachCompanions = (
  files: File[],
  current?: ModelSource | null,
): LocalSourceResult => {
  const names = files.map((file) => file.name).join(', ')

  const rejected = files.filter((file) => !isCompanionFile(file.name))
  if (rejected.length > 0) {
    throw new Error(
      `${rejected.map((file) => file.name).join(', ')}: no es un fichero glTF (.glb, .gltf) ni un auxiliar (${COMPANION_EXTENSIONS.join(' ')})`,
    )
  }

  if (!current || current.origin !== SourceOrigin.LOCAL) {
    throw new Error(
      `${names}: solo son auxiliares. Suéltalos junto con el .gltf al que pertenecen.`,
    )
  }

  if (extensionOf(current.fileName) === '.glb') {
    throw new Error(
      `${current.fileName} es un .glb autocontenido: no admite auxiliares externos.`,
    )
  }

  const urls = new Map(
    files.map((file) => [file, URL.createObjectURL(file)] as const),
  )
  const source: ModelSource = {
    ...current,
    id: `${current.id}+${Date.now()}`,
    inheritsFrom: current.id,
    companions: {
      ...current.companions,
      ...Object.fromEntries(files.map((file) => [file.name, urls.get(file)!])),
    },
    sizeMb: toMb(current.sizeMb * 1_048_576 + totalSize(files)),
    release: () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      current.release()
    },
  }

  return {
    source,
    warnings: [`${names} añadido a ${current.fileName}; se recarga el modelo.`],
  }
}

/** Extrae los ficheros de un evento de drop. */
export const filesFromDrop = (event: DragEvent): File[] =>
  Array.from(event.dataTransfer?.files ?? [])
