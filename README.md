# Visor glTF · POC

Prueba de concepto de un visor web de modelos **glTF 2.0** (`.glb` / `.gltf`)
con **Vue 3 + TypeScript + Vite**, componentes **shadcn-vue** (Tailwind CSS v4
+ reka-ui) con una estética tipo Apple, y render 3D sobre **three.js**.

glTF es el estándar de Khronos para 3D en web: un solo formato con geometría,
jerarquía, materiales PBR, texturas y animaciones. Una iteración anterior de
este POC evaluó OBJ/MTL, STL, FBX, COLLADA, X3D, Alembic y `.blend`; se
descartaron por repartir la información en varios ficheros, perder materiales
al exportar o no tener loader viable en navegador.

## Puesta en marcha

Requiere Node 22. Todas las dependencias son del registro público de npm.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # vue-tsc + vite build → dist/
npm run type-check   # solo tipos
npm run lint         # eslint --fix
npm run format       # prettier sobre src/
```

## Uso

Al arrancar se carga la muestra `public/models/vintage_pocket_watch_2k.glb`:
el [Vintage Pocket Watch](https://polyhaven.com/a/vintage_pocket_watch) de
Tal Swicegood (Poly Haven, CC0), un reloj de bolsillo con texturas PBR 2K de
color, normales y ARM, y barniz `KHR_materials_clearcoat` en el cristal. Se
empaquetó del glTF original con `npx @gltf-transform/cli copy` (ver
`public/models/README.md`). El botón «Cargar reloj de muestra» vuelve a él.

Para probar otros modelos, arrastra un `.glb` o `.gltf` al panel «Cargar
glTF» o al propio visor, o usa «Seleccionar ficheros».

- **`.glb`**: binario autocontenido, un único fichero.
- **`.gltf` autocontenido**: JSON con buffers e imágenes embebidos en `data:`.
- **`.gltf` con externos**: JSON que referencia un `.bin` e imágenes. Hay que
  soltarlos junto al `.gltf`, a la vez o después: si solo llegan auxiliares
  sobre un `.gltf` ya cargado, se añaden y se recarga. Si falta alguno, el
  error indica cuál.

Los recursos auxiliares se resuelven por **nombre de fichero** con un
`LoadingManager.setURLModifier`, porque el `.gltf` pide rutas relativas y de
ficheros locales solo tenemos object URLs (que se liberan al cambiar de
modelo). Se soportan geometría comprimida con **Draco** y **Meshopt** y
texturas **KTX2/Basis**; los decodificadores se sirven desde
`public/decoders/` (copiados de `three/examples/jsm/libs`).

Controles: orbitar, acercar, desplazar; **doble clic** sobre una pieza para
centrarla; «Reencuadrar» vuelve a la vista de tres cuartos; wireframe; y
reproducción de las **animaciones** del fichero si las tiene.

La ficha muestra los metadatos glTF (versión, generador, extensiones usadas y
requeridas, escenas, nodos, animaciones, recursos externos) y las
estadísticas de la geometría cargada (mallas, vértices, triángulos,
materiales, texturas, tiempo de carga).

## Interfaz y estilo

Los componentes de interfaz vienen de **shadcn-vue** (`npx shadcn-vue add`),
copiados al repo en `src/components/ui/` (Button, Card, Badge, Switch,
Tooltip, Alert, Skeleton, Progress, Separator y Sonner para los toasts), y se
componen con utilidades de Tailwind. El tema vive en `src/styles/index.css`
sobre los tokens de shadcn, ajustado a una estética tipo Apple:

- Tipografía del sistema (`-apple-system`, SF Pro en macOS/iOS) con Inter de
  reserva.
- Neutros fríos muy claros (`#f5f5f7`), texto casi negro (`#1d1d1f`) y
  acento azul (`#0071e3`); modo oscuro con negros puros y grises cálidos.
- Radios generosos (14 px base), bordes sutiles, tarjetas blancas con anillo
  suave y cabecera translúcida con desenfoque.
- Conmutador claro/oscuro en la cabecera (clase `.dark` en `<html>`,
  persistido en `localStorage`, con la preferencia del sistema por defecto).

## Estructura

```
components.json           Configuración de shadcn-vue (estilo, alias, CSS)
public/decoders/          Draco y Basis (wasm) para glTF comprimido
public/models/            Muestra (.glb) y su README con autoría y licencia
src/
  App.vue                 Layout: cabecera, cargador, visor, ficha
  main.ts                 Monta la app e importa los estilos
  lib/utils.ts            `cn()` de shadcn (clsx + tailwind-merge)
  components/
    ui/                   Componentes shadcn-vue generados
    GltfLoader.vue        Zona de arrastre + selector de ficheros + muestra
    ViewerControls.vue    Wireframe, animaciones, reencuadre
    ModelViewer.vue       Canvas + estados vacío/carga/error + drop
    ModelInfoPanel.vue    Ficha en tarjeta lateral (escritorio)
    ModelInfoSheet.vue    Ficha en panel inferior (móvil)
    ModelInfoContent.vue  Contenido de la ficha compartido por ambas
    ModelInfoBadges.vue   Badges de origen y variante glTF
  composables/
    useTheme.ts           Tema claro/oscuro
    useThreeViewer.ts     Escena three.js: renderer, cámara, OrbitControls, entorno, AnimationMixer
  loaders/
    loadGltf.ts           GLTFLoader + Draco/KTX2/Meshopt + LoadingManager + metadatos + stats
    localFiles.ts         Ficheros locales → ModelSource (object URLs, auxiliares)
  types/
    model-source.ts       Extensiones aceptadas y tipo ModelSource
    viewer.ts             GltfInfo, ModelStats, progreso
  styles/index.css        Tailwind + tokens del tema
```

## Decisiones y convenciones

- `<script setup>`, Prettier sin punto y coma y comillas simples, ESLint flat
  config, alias `@/` (declarado también en `tsconfig.json` raíz, que es donde
  lo busca la CLI de shadcn-vue).
- La regla `vue/multi-word-component-names` se desactiva solo en
  `src/components/ui/**`, donde shadcn usa nombres de una palabra.
- Al añadir componentes con `npx shadcn-vue add`, la CLI vuelve a insertar en
  `src/styles/index.css` el `@import` de la fuente Geist y un `@layer base`
  duplicado. Hay que quitarlos: el tema usa la tipografía del sistema.
- Responsive: por debajo del punto de corte `lg` (1024 px) el visor va primero
  y la página se desplaza, la carga de ficheros locales se deshabilita con un
  aviso (solo escritorio) y la ficha del modelo pasa de la tarjeta lateral a
  un panel deslizante inferior (`Sheet`) que se abre desde un botón sobre el
  visor.
- Los materiales del glTF se respetan tal cual (PBR) y se iluminan con un
  entorno de estudio (`RoomEnvironment`) y tone mapping ACES.
- three.js se separa en su propio chunk (`manualChunks`).

## Siguientes pasos posibles

- Carga por URL remota y selector de escena/cámara del fichero.
- Selector de clip de animación y control de tiempo.
- Extraer `ModelViewer` + `useThreeViewer` como componente reutilizable si el
  caso de uso se confirma.
