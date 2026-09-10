import {
  Group,
  LoadingManager,
  Material,
  Mesh,
  Texture,
  type Object3D,
  type WebGLRenderer,
} from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { extensionOf, type ModelSource } from '@/types/model-source'
import {
  GltfVariant,
  type GltfInfo,
  type LoadedModel,
  type ModelStats,
  type ProgressCallback,
} from '@/types/viewer'

/**
 * Decodificadores servidos desde `public/decoders/` (copiados de three). Se
 * prefijan con la base de despliegue para funcionar también bajo un subpath
 * (GitHub Pages sirve el proyecto en /<repo>/).
 */
const DRACO_DECODER_PATH = `${import.meta.env.BASE_URL}decoders/draco/`
const BASIS_TRANSCODER_PATH = `${import.meta.env.BASE_URL}decoders/basis/`

const baseName = (url: string): string =>
  decodeURIComponent(url.split(/[\\/]/).pop() ?? url).split('?')[0]

/** Estructura mínima del JSON glTF que leemos para la ficha. */
interface GltfJson {
  asset?: { version?: string; generator?: string; copyright?: string }
  extensionsUsed?: string[]
  extensionsRequired?: string[]
  scenes?: unknown[]
  nodes?: unknown[]
  animations?: { name?: string }[]
  buffers?: { uri?: string }[]
  images?: { uri?: string }[]
}

/**
 * Crea un GLTFLoader con soporte para geometría comprimida (Draco, Meshopt) y
 * texturas KTX2/Basis. Los recursos auxiliares (.bin, imágenes) se resuelven
 * por nombre de fichero: imprescindible con ficheros locales, donde el .gltf
 * pide rutas relativas y solo tenemos object URLs sueltas.
 */
const createLoader = (
  source: ModelSource,
  renderer: WebGLRenderer,
  onMissing: (url: string) => void,
): GLTFLoader => {
  const manager = new LoadingManager()
  manager.setURLModifier((url) => source.companions[baseName(url)] ?? url)
  manager.onError = (url) => onMissing(baseName(url))

  const draco = new DRACOLoader(manager).setDecoderPath(DRACO_DECODER_PATH)
  const ktx2 = new KTX2Loader(manager)
    .setTranscoderPath(BASIS_TRANSCODER_PATH)
    .detectSupport(renderer)

  return new GLTFLoader(manager)
    .setDRACOLoader(draco)
    .setKTX2Loader(ktx2)
    .setMeshoptDecoder(MeshoptDecoder)
}

const toProgress =
  (onProgress: ProgressCallback) =>
  (event: ProgressEvent): void =>
    onProgress({
      percent: event.lengthComputable
        ? Math.round((event.loaded / event.total) * 100)
        : null,
      loadedBytes: event.loaded,
    })

const isExternalUri = (uri?: string): uri is string =>
  typeof uri === 'string' && !uri.startsWith('data:')

const readInfo = (source: ModelSource, json: GltfJson): GltfInfo => {
  const externalResources = [
    ...(json.buffers ?? []).map((buffer) => buffer.uri),
    ...(json.images ?? []).map((image) => image.uri),
  ].filter(isExternalUri)

  const variant =
    extensionOf(source.fileName) === '.glb'
      ? GltfVariant.GLB
      : externalResources.length > 0
        ? GltfVariant.GLTF_EXTERNAL
        : GltfVariant.GLTF_EMBEDDED

  return {
    variant,
    version: json.asset?.version ?? '?',
    generator: json.asset?.generator,
    copyright: json.asset?.copyright,
    extensionsUsed: json.extensionsUsed ?? [],
    extensionsRequired: json.extensionsRequired ?? [],
    scenes: json.scenes?.length ?? 0,
    nodes: json.nodes?.length ?? 0,
    animations: (json.animations ?? []).map(
      (animation, index) => animation.name ?? `Animación ${index + 1}`,
    ),
    externalResources,
  }
}

const materialsOf = (mesh: Mesh): Material[] =>
  Array.isArray(mesh.material) ? mesh.material : [mesh.material]

export const collectStats = (object: Object3D): ModelStats => {
  const materials = new Set<string>()
  const textures = new Set<string>()
  const stats: ModelStats = {
    meshes: 0,
    vertices: 0,
    triangles: 0,
    materials: 0,
    textures: 0,
  }

  object.traverse((node) => {
    if (!(node instanceof Mesh)) return
    stats.meshes++

    const position = node.geometry.getAttribute('position')
    const vertexCount = position?.count ?? 0
    stats.vertices += vertexCount
    stats.triangles += Math.floor(
      (node.geometry.index?.count ?? vertexCount) / 3,
    )

    materialsOf(node).forEach((material) => {
      materials.add(material.uuid)
      Object.values(material).forEach((value) => {
        if (value instanceof Texture) textures.add(value.uuid)
      })
    })
  })

  stats.materials = materials.size
  stats.textures = textures.size
  return stats
}

/** Descarga y parsea el glTF de la fuente indicada. */
export const loadGltf = async (
  source: ModelSource,
  renderer: WebGLRenderer,
  onProgress: ProgressCallback = () => {},
): Promise<LoadedModel> => {
  const missing = new Set<string>()
  const loader = createLoader(source, renderer, (url) => missing.add(url))

  let gltf: GLTF
  try {
    gltf = await loader.loadAsync(source.url, toProgress(onProgress))
  } catch (cause) {
    const detail =
      cause instanceof Error
        ? cause.message
        : cause instanceof ProgressEvent || cause instanceof ErrorEvent
          ? 'no se pudo descargar un recurso'
          : String(cause)
    const hint =
      missing.size > 0
        ? ` Faltan: ${[...missing].join(', ')}. Suéltalos junto al .gltf.`
        : ''
    throw new Error(`glTF no válido o incompleto (${detail}).${hint}`)
  } finally {
    loader.dracoLoader?.dispose()
    loader.ktx2Loader?.dispose()
  }

  const wrapper = new Group()
  wrapper.name = `model-${source.id}`
  wrapper.add(gltf.scene)

  const json = gltf.parser.json as GltfJson
  const info = readInfo(source, json)
  const warnings = [...missing].map(
    (name) => `No se pudo cargar ${name}: se muestra sin ese recurso.`,
  )

  return {
    object: wrapper,
    animations: gltf.animations,
    stats: collectStats(wrapper),
    info,
    warnings,
  }
}

/** Libera geometrías, materiales y texturas de un modelo retirado de la escena. */
export const disposeModel = (object: Object3D): void => {
  object.traverse((node) => {
    if (!(node instanceof Mesh)) return
    node.geometry.dispose()
    materialsOf(node).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof Texture) value.dispose()
      })
      material.dispose()
    })
  })
}
