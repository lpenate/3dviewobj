import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import {
  ACESFilmicToneMapping,
  AnimationMixer,
  Box3,
  Clock,
  DirectionalLight,
  Material,
  Mesh,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { loadGltf, disposeModel } from '@/loaders/loadGltf'
import type { ModelSource } from '@/types/model-source'
import type { GltfInfo, LoadProgress, ModelStats } from '@/types/viewer'

export interface ViewerOptions {
  wireframe: Ref<boolean>
  /** Reproducir las animaciones del glTF (si las tiene). */
  animationsEnabled: Ref<boolean>
}

/** Dirección de la vista inicial en tres cuartos. */
const INITIAL_VIEW_DIRECTION = new Vector3(0.6, 0.35, 1).normalize()

/**
 * Encapsula la escena three.js: renderer, cámara, controles, iluminación de
 * entorno, animaciones y ciclo de vida del modelo cargado. Expone estado
 * reactivo para la UI y acciones (cargar, reencuadrar).
 */
export const useThreeViewer = (
  container: Ref<HTMLElement | null>,
  options: ViewerOptions,
) => {
  const isLoading = ref(false)
  const progress = ref<LoadProgress | null>(null)
  const error = ref<string | null>(null)
  const stats = shallowRef<ModelStats | null>(null)
  const info = shallowRef<GltfInfo | null>(null)
  const loadTimeMs = ref<number | null>(null)
  const animationNames = ref<string[]>([])

  const scene = new Scene()
  const camera = new PerspectiveCamera(40, 1, 0.01, 1000)
  const raycaster = new Raycaster()
  const clock = new Clock()
  let renderer: WebGLRenderer | null = null
  let controls: OrbitControls | null = null
  let currentModel: Object3D | null = null
  let mixer: AnimationMixer | null = null
  let animationFrame = 0
  let resizeObserver: ResizeObserver | null = null
  /** Evita aplicar un modelo cuya carga quedó obsoleta por otra posterior. */
  let loadSequence = 0
  /** Carga pedida antes de que exista el renderer (montaje del canvas). */
  let pendingSource: ModelSource | null = null

  const setupLighting = (target: WebGLRenderer): void => {
    // Entorno de estudio: ilumina los materiales PBR del glTF y da reflejos.
    const pmrem = new PMREMGenerator(target)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()

    const key = new DirectionalLight(0xffffff, 1.2)
    key.position.set(5, 8, 6)
    scene.add(key)
  }

  const resize = (): void => {
    const element = container.value
    if (!element || !renderer) return
    const { clientWidth, clientHeight } = element
    if (clientWidth === 0 || clientHeight === 0) return
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(clientWidth, clientHeight, false)
  }

  const renderLoop = (): void => {
    animationFrame = requestAnimationFrame(renderLoop)
    const delta = clock.getDelta()
    if (options.animationsEnabled.value) mixer?.update(delta)
    controls?.update()
    renderer?.render(scene, camera)
  }

  const init = (): void => {
    const element = container.value
    if (!element || renderer) return

    renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    renderer.domElement.classList.add('viewer-canvas')
    renderer.domElement.addEventListener('dblclick', focusAt)
    element.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    setupLighting(renderer)
    resize()
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(element)
    renderLoop()

    if (pendingSource) {
      const source = pendingSource
      pendingSource = null
      void load(source)
    }
  }

  const forEachMaterial = (callback: (material: Material) => void): void => {
    currentModel?.traverse((node) => {
      if (!(node instanceof Mesh)) return
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material]
      materials.forEach(callback)
    })
  }

  const applyWireframe = (enabled: boolean): void => {
    forEachMaterial((material) => {
      if ('wireframe' in material) material.wireframe = enabled
    })
  }

  /** Encuadra la cámara sobre una caja envolvente, manteniendo la dirección de vista. */
  const fitCameraToBox = (box: Box3, direction?: Vector3): void => {
    if (!controls || box.isEmpty()) return

    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1
    const fovRadians = (camera.fov * Math.PI) / 180
    const distance = (maxDimension / (2 * Math.tan(fovRadians / 2))) * 1.25

    const viewDirection =
      direction?.clone() ??
      camera.position.clone().sub(controls.target).normalize()
    if (viewDirection.lengthSq() === 0)
      viewDirection.copy(INITIAL_VIEW_DIRECTION)

    camera.near = Math.max(distance / 1000, 0.001)
    camera.far = distance * 200
    camera.updateProjectionMatrix()
    camera.position.copy(center).add(viewDirection.multiplyScalar(distance))

    controls.target.copy(center)
    controls.minDistance = maxDimension * 0.05
    controls.maxDistance = distance * 20
    controls.update()
  }

  /** Encuadra el modelo completo desde la vista inicial. */
  const resetView = (): void => {
    if (!currentModel) return
    currentModel.updateMatrixWorld(true)
    fitCameraToBox(
      new Box3().setFromObject(currentModel),
      INITIAL_VIEW_DIRECTION,
    )
  }

  /** Doble clic sobre una pieza: centra la cámara en esa malla. */
  const focusAt = (event: MouseEvent): void => {
    if (!currentModel || !renderer) return

    const bounds = renderer.domElement.getBoundingClientRect()
    const pointer = new Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const [hit] = raycaster.intersectObject(currentModel, true)
    if (!hit) return

    fitCameraToBox(new Box3().setFromObject(hit.object))
  }

  const clearModel = (): void => {
    mixer?.stopAllAction()
    mixer = null
    animationNames.value = []
    if (!currentModel) return
    scene.remove(currentModel)
    disposeModel(currentModel)
    currentModel = null
    stats.value = null
    info.value = null
  }

  /** Carga la fuente; devuelve los avisos del loader (recursos ausentes). */
  const load = async (source: ModelSource): Promise<string[]> => {
    if (!renderer) {
      pendingSource = source
      return []
    }

    const sequence = ++loadSequence
    isLoading.value = true
    progress.value = { percent: 0, loadedBytes: 0 }
    error.value = null
    loadTimeMs.value = null
    clearModel()

    const started = performance.now()
    try {
      const loaded = await loadGltf(source, renderer, (update) => {
        if (sequence === loadSequence) progress.value = update
      })
      if (sequence !== loadSequence) {
        disposeModel(loaded.object)
        return []
      }

      currentModel = loaded.object
      scene.add(currentModel)
      stats.value = loaded.stats
      info.value = loaded.info
      loadTimeMs.value = Math.round(performance.now() - started)

      if (loaded.animations.length > 0) {
        mixer = new AnimationMixer(currentModel)
        loaded.animations.forEach((clip) => mixer!.clipAction(clip).play())
        animationNames.value = loaded.animations.map((clip) => clip.name)
      }

      applyWireframe(options.wireframe.value)
      resetView()
      return loaded.warnings
    } catch (cause) {
      if (sequence !== loadSequence) return []
      error.value =
        cause instanceof Error ? cause.message : 'Error desconocido al cargar'
      return []
    } finally {
      if (sequence === loadSequence) {
        isLoading.value = false
        progress.value = null
      }
    }
  }

  const dispose = (): void => {
    cancelAnimationFrame(animationFrame)
    resizeObserver?.disconnect()
    clearModel()
    scene.environment?.dispose()
    controls?.dispose()
    renderer?.domElement.removeEventListener('dblclick', focusAt)
    renderer?.dispose()
    renderer?.domElement.remove()
    renderer = null
    controls = null
  }

  watch(container, (element) => {
    if (element) init()
  })
  watch(options.wireframe, applyWireframe)
  onBeforeUnmount(dispose)

  return {
    isLoading,
    progress,
    error,
    stats,
    info,
    loadTimeMs,
    animationNames,
    load,
    clearModel,
    resetView,
  }
}
