# Plan de desarrollo — objeto Proceso

Plan de implementación derivado de la especificación `fproperties_objeto_proceso.md`,
ajustado al código real de fProperties 1.6.0.

**Estado:** decisiones de diseño cerradas el 2026-08-09 (§5). **Fase P0 completada.**
Siguiente: F1.

---

## 0. Diagnóstico del código actual

Lo que ya existe y sirve de base:

- `listaFluidos` / `listaAires` son arrays hookstate de objetos planos con las propiedades
  ya calculadas (`src/listaFluidos.js`, `src/listaAires.js`). El "Estado" del documento ya
  existe como concepto, sin nombre propio.
- `Diagrama.jsx` construye datasets de Chart.js con `showLine` / `pointRadius`. **Un proceso
  encaja directamente como un dataset más** con `showLine: true, pointRadius: 0`. No hace
  falta tocar el motor de dibujo, solo alimentarlo.
- `getPropFluido()` y `getPropAireHumedo()` son funciones puras sobre CoolProp. Todo el
  motor de procesos puede construirse encima sin tocar React.
- La i18n por clave (`getTextoUI`) permite que la tabla de definiciones lleve claves de
  traducción en lugar de literales.

Lo que falta o estorba:

| Problema | Dónde | Impacto |
|---|---|---|
| **Los estados no tienen identidad** | `TablaFluidos.jsx:187` usa `key: i`; `fluidosSeleccionados` guarda índices; `borrarFluidos` hace splice; `reordenarFluidos` reconstruye el array | Bloqueante. Un proceso que guarde `estadoOrigen: 2` apunta a otro estado en cuanto se borra o reordena una fila |
| La curva de saturación se recalcula en cada render | `Diagrama.jsx:314` llama a `getTodasSeries()` inline, y `getCurvaSat()` hace ~200 llamadas a CoolProp | Hoy es tolerable; con N procesos × 25 puntos cada uno pasa a ser notable |
| `cargarTextosUI()` se invoca en el cuerpo del render | `fProperties.jsx:32` | Hace `fetch` + `set` en cada render, en bucle amortiguado por la caché del navegador |
| `Psicrometrico.jsx` y `Diagrama.jsx` están duplicados al ~70% | ambos | Añadir procesos a los dos duplicaría también esa lógica si no se factoriza el motor |
| No hay tests | — | El cálculo de η real, SHR o factor de by-pass es justo lo que conviene fijar con tests |

---

## 1. Ajustes a la especificación

Cuatro puntos de la especificación no sobreviven al contacto con el código. Los cuatro
quedan resueltos como se indica aquí (decisiones 1 y 2 de §5).

### 1.1 La mezcla adiabática tiene dos orígenes

La especificación define el Proceso como "arista entre dos estados", pero la lista mínima
de tipos incluye *mezcla adiabática de dos caudales*: dos estados de entrada y uno de
salida. No es una arista.

**Resuelto:** el modelo guarda `origenes: [ref, ...]` (array) desde el primer día, con
aridad 1 en todos los tipos salvo la mezcla. Cambiarlo ahora cuesta nada; cambiarlo en la
fase 6, con la tabla y el trazado ya escritos, cuesta mucho.

### 1.2 La restricción no puede ser una ecuación dentro del JSON

La especificación pide que `restriccion` sea "la ecuación que liga origen y destino" y a la
vez que el esquema sea JSON portable. Una ecuación ejecutable en JSON obliga a `eval` o a
un mini-intérprete propio; ninguna de las dos cosas merece la pena.

**Resuelto — separación contrato / física:**

- El **JSON declara el contrato**: qué parámetros pide, con qué unidades, valores por
  defecto y rangos; qué columnas de resultado muestra; con qué tolerancia valida; cómo se
  barre la curva. Esto es lo verdaderamente portable a Python.
- El **código implementa la física**, en un registro `clave → función`. El JSON referencia
  al resolvedor por nombre (`"resolvedor": "compresionEta"`).

Una futura versión Python reimplementa el mismo registro de resolvedores y lee el mismo
JSON. La fuente única de verdad se mantiene donde importa (el contrato), sin inventar un
lenguaje de ecuaciones.

### 1.3 El trazado se genera en el espacio de estados, no en el plano del diagrama

Si el trazado produce puntos `(x, y)` para el p-h, esa misma curva no sirve para el T-s ni
para el p-T, y fProperties ya tiene los tres. Peor: la laminación es una recta vertical en
p-h pero **no** es recta en T-s, así que un `trazado: "recta"` daría una curva falsa al
cambiar de diagrama.

**Resuelto:** el resolvedor de trazado devuelve una lista de **estados termodinámicos
completos** (el objeto que ya produce `getObjetoFluido`). La proyección a ejes se hace
después, reutilizando la lógica de `getDato()` de `Diagrama.jsx`. Un solo trazado sirve
para los tres diagramas y sale correcto en todos.

### 1.4 En modo calculado, un ciclo cerrado es un ciclo en el grafo

La fase de ciclos y la de modo calculado chocan: propagar el recálculo por el grafo de
procesos entra en bucle infinito en cuanto el ciclo se cierra sobre el estado inicial.

**Resuelto:** un proceso cuyo destino es un estado que **ya existe y no fue generado por
otro proceso** no genera nada — *verifica* el cierre y marca la discrepancia. El ciclo se
cierra solo, sin UI adicional y sin detección de ciclos en el grafo: basta con ordenar
topológicamente ignorando las aristas de cierre.

---

## 2. Arquitectura

Módulo nuevo `src/procesos/`, sin dependencias de React:

```
src/procesos/
  definiciones.json     Tabla declarativa de tipos (el contrato, portable)
  resolvedores.js       Registro clave → { destino, verificar, derivados, trazar }
  proceso.js            Motor: valida, calcula derivados, genera la curva
  listaProcesos.js      Estado hookstate + operaciones CRUD
```

Y en componentes:

```
src/components/
  TablaProcesos.jsx     Tabla con columnas declaradas por tipo
  DialogoProceso.jsx    Alta/edición de un proceso
```

### 2.1 Modelo de datos

```js
{
  id: "p3",                       // estable, no índice
  origenes: ["f1"],               // array; 2 elementos en la mezcla
  destino: "f2",
  tipo: "compresion_isentropica", // clave en definiciones.json
  modoDestino: "manual",          // | "calculado"
  parametros: { p_final: 1200, eta: 0.8, m_punto: 0.05 },
  estilo: { color: "#0000FF", grosor: 2, trazo: "solid" }
}
```

El Estado no cambia salvo por ganar un `id`.

### 2.2 Esquema de `definiciones.json`

```json
{
  "esquema": 1,
  "parametrosComunes": [
    { "clave": "m_punto", "unidad": "kg/s", "requerido": false }
  ],
  "tipos": [
    {
      "clave": "compresion_isentropica",
      "dominio": "fluido",
      "diagramas": ["p-h", "T-s", "p-T"],
      "aridad": { "origenes": 1 },
      "i18n": "proc_compresion_isentropica",
      "parametros": [
        { "clave": "p_final", "unidad": "kPa", "requerido": true },
        { "clave": "eta", "unidad": "-", "defecto": 0.8, "min": 0.01, "max": 1 }
      ],
      "restriccion": {
        "resolvedor": "compresionEta",
        "tolerancia": { "magnitud": "S", "rel": 0.02 }
      },
      "trazado": { "resolvedor": "barridoP", "nPuntos": 25 },
      "columnas": ["dh", "ds", "w_esp", "rel_compresion", "eta_real", "potencia"]
    }
  ]
}
```

Ubicación: `src/procesos/definiciones.json`, importado por Vite (entra en el bundle,
falla en build si tiene un error de sintaxis). Se puede copiar a `public/json/` si en el
futuro interesa exponerlo como descarga para la versión Python.

### 2.3 Interfaz de un resolvedor

```js
compresionEta: {
  // F6: genera el estado destino a partir del origen
  destino(origen, params) { ... },

  // F1: comprueba coherencia de una pareja dada por el usuario
  verificar(origenes, destino, params) { return { ok, aviso } },

  // F2: magnitudes de la tabla de procesos
  derivados(origenes, destino, params) { return { dh, ds, w_esp, ... } },

  // F4: lista de estados intermedios (no puntos x/y)
  trazar(origenes, destino, params, nPuntos) { return [estado, ...] },
}
```

Las cuatro operaciones son independientes: cada fase añade una y las anteriores siguen
funcionando.

### 2.4 Columnas de resultado

- **p-h:** `dh` [kJ/kg], `ds` [kJ/(kg·K)], `w_esp` o `q_esp` [kJ/kg], `rel_compresion` [-],
  `eta_real` [-], `potencia` [kW] (solo si hay caudal).
- **Psicrométrico:** `q_sensible` [kW], `q_latente` [kW], `q_total` [kW], `SHR` [-],
  `m_condensados` [kg/s y L/h], `factor_bypass` [-].

El caudal es parámetro común opcional; las columnas de potencia se ocultan si no está.

---

## 3. Fases

Orden revisado respecto a la especificación: el permalink pasa del último puesto al tercero
(decisión 5). La correspondencia con la numeración original es P0 → nueva, F1 → 1, F2 → 2,
**F3 → 7**, F4 → 3, F5 → 4, F6 → 5, F7 → 6.

### P0 — Identidad estable de los estados *(prerequisito)* ✅

Sin esto, cualquier proceso se corrompe al borrar o reordenar una fila. No es parte de la
especificación pero es lo que la hace viable, y además es lo que habilita el permalink.

- [x] `id` estable en `nuevoFluido()` / `nuevoAire()`, derivado del máximo en uso (`f1`,
  `a1`…), para que sobreviva a la carga de un permalink sin colisionar. `indiceFluido(id)` /
  `indiceAire(id)` devuelven -1 si el estado ya no existe: es el gancho para detectar
  procesos huérfanos en F1.
- [x] `duplicarFluidos()` / `duplicarAires()` generan `id` nuevo, no lo copian.
  `borrarFluidos()`, `duplicarFluidos()` y `actualizarFluido()` reciben ids, no índices.
- [x] `iFluidoActual` / `iAireActual` → `idFluidoActual` / `idAireActual` (`null` =
  ninguno); `fluidosSeleccionados` / `airesSeleccionados` guardan ids; el `rowKey` de las
  tablas es el id.
- [x] Curva de saturación y curvas de HR constante memorizadas (`useCallback` + `useMemo`
  sobre fluido, tipo de diagrama y límites de eje).
- [x] `cargarTextosUI()` movido a un `useEffect` con dependencia del idioma.
- [x] Vitest montado (`npm test` / `npm run test:watch`) con CoolProp real (decisión 3).
- [x] `.eslintrc.cjs` ignora `docs/` (salida de build publicada) y el `coolprop.js`
  vendorizado. `npm run lint` pasa de 943 problemas a 29, todos preexistentes y en código
  propio, con lo que vuelve a servir de puerta de calidad.

*Entregable: sin cambios visibles. Refactor puro.* Verificado en navegador: alta,
duplicado, borrado, reordenación por drag&drop, edición apuntando al estado correcto tras
borrar y tras reordenar, diagrama p-h y psicrométrico, sin errores de consola.

**Deuda que P0 deja abierta** (no bloquea F1):
- Quedan 27 errores de ESLint preexistentes (`react/prop-types` en las filas arrastrables,
  `__APP_VERSION__` no declarado como global, `while (true)`). Con `--max-warnings 0`,
  `npm run lint` sigue en rojo; limpiarlos es una tarea aparte.
- `Diagrama.jsx` y `Psicrometrico.jsx` siguen duplicados al ~70%. Conviene factorizarlos
  antes de F4, que es cuando ambos tendrían que aprender a dibujar procesos.

### F1 — Objeto Proceso en modo manual

- `definiciones.json` con el conjunto mínimo de tipos.
- `resolvedores.js` con `verificar()` y tolerancias por tipo.
- `listaProcesos.js` (CRUD hookstate) y `DialogoProceso.jsx`.
- Validación de coherencia: aviso en la fila, sin bloquear.
- Validaciones estructurales: los dos estados deben ser del mismo fluido (p-h) o de la
  misma presión/altitud (psicrométrico); un estado borrado deja el proceso en rojo, no lo
  borra en cascada.
- Claves i18n nuevas en `es.json` / `en.json`.

*Se cierra primero con los tipos p-h; los psicrométricos entran después sobre el mismo
motor, para no abrir tanta superficie de golpe.*

### F2 — Tabla de procesos

- `TablaProcesos.jsx` bajo la tabla de estados, con columnas de identidad + columnas de
  resultado declaradas por el tipo.
- Reutilizar el patrón de `TablaFluidos.jsx` (selección, CSV, dnd si procede).
- Potencias visibles solo con caudal introducido.

### F3 — Permalink y exportación *(adelantada)*

Depende solo de P0 y F1. Es la fase de mayor valor docente por unidad de esfuerzo
(compartir un enunciado como enlace), y adelantarla obliga a fijar pronto el formato
serializado, lo que disciplina el modelo de datos antes de que se compliquen las fases
siguientes.

- Serializar `{ estados, procesos, configuracion }` a JSON.
- Comprimir con `CompressionStream('deflate-raw')` — nativo en navegadores modernos, sin
  dependencia nueva — y codificar en base64url tras `#`. El hash evita configurar rewrites
  en GitHub Pages y no viaja al servidor.
- Vigilar la longitud: un problema de 10 estados y 8 procesos debería quedar holgado; si se
  dispara, degradar a "descargar JSON".
- Versionar el formato (`{"v":1,...}`) desde el primer permalink publicado.

### F4 — Trazado de la curva real

- `trazar()` en cada resolvedor, devolviendo estados.
- Proyección a ejes en `Diagrama.jsx` / `Psicrometrico.jsx` reutilizando `getDato()`.
- Un dataset Chart.js por proceso, con `estilo` aplicado.
- Aquí la memoización de P0 deja de ser cosmética.

### F5 — Selección sincronizada

- Fila de procesos → resalta la curva y las filas de estado implicadas.
- Clic en la curva → selecciona la fila (`getElementsAtEventForMode` de Chart.js; el
  `idProceso` viaja dentro del propio dataset).
- Fila de estado → resalta los procesos incidentes.

Barato una vez P0 hizo que todo se referencie por `id`.

### F6 — Modo calculado

- `destino()` en los resolvedores.
- Propagación en orden topológico, con las aristas de cierre excluidas (§1.4).
- El estado generado se marca como derivado en la tabla de estados.
- Si el usuario edita a mano un estado calculado, **se rompe el vínculo y el proceso pasa a
  `manual`, con aviso** (decisión 4). Se descarta bloquear la edición: es más simple de
  implementar pero deja al usuario sin salida delante de un valor que quiere tocar.

### F7 — Ciclos

Lista ordenada de procesos + comprobación de cierre + balance global (ΣW, ΣQ, COP o η).
No requiere un tercer objeto de primera clase.

---

## 4. Versionado

| Versión | Contenido |
|---|---|
| 1.6.1 | P0 (refactor sin cambios visibles) — *publicada* |
| 1.7.0 | F1 (procesos p-h en modo manual) |
| 1.8.0 | F1 psicrométrica + F2 (tabla de procesos) |
| 1.9.0 | F3 (permalink / exportación) |
| 1.10.0 | F4 (trazado real) + F5 (selección sincronizada) |
| 2.0.0 | F6 (modo calculado) — cambia el modelo mental de la app |
| 2.1.0 | F7 (ciclos y balance) |

---

## 5. Decisiones tomadas *(2026-08-09)*

1. **`origenes` es un array desde el principio** (§1.1). El coste de introducirlo solo sube
   con el tiempo.
2. **Contrato en JSON, física en código** (§1.2). Se descarta el intérprete de ecuaciones.
3. **Tests con Vitest, montados en P0.** El motor de procesos es puro y merece tests.
   *Resuelto en P0: CoolProp sí arranca en Node*, así que no hace falta el plan B de los
   estados tabulados y los tests pueden llamar a la EoS de verdad. El glue de emscripten
   necesita tres empujones, todos confinados en `src/test/setupCoolprop.js` y documentados
   allí: inyectar `require` y `__dirname` (no existen en ESM), redirigir la lectura de
   `coolprop.wasm` a `public/` (Vite reescribe `__dirname` al directorio del módulo) y
   esperar a la instanciación asíncrona del wasm con `esperarCoolprop(Module)`, que todo
   test que use CoolProp debe llamar en su `beforeAll`.
4. **Editar un estado calculado rompe el vínculo** y devuelve el proceso a `manual`, con
   aviso (§F6).
5. **El permalink se adelanta** a la posición F3, justo detrás de la tabla de procesos
   (§F3).
