# Plan de desarrollo — objeto Proceso

Plan de implementación derivado de la especificación `fproperties_objeto_proceso.md`,
ajustado al código real de fProperties 1.6.0.

**Estado:** decisiones de diseño cerradas el 2026-08-09 (§5). **Plan completo: P0 y F1 a F7
implementadas.** Queda pendiente, de F1, la familia psicrométrica, que no bloquea nada y
entra sobre el mismo motor.

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
  definiciones.json     Tabla declarativa de tipos y de columnas (el contrato, portable)
  resolvedores.js       Registro clave → { verificar, derivados, trazar, destino }
  proceso.js            Motor: valida, calcula derivados, traza y ordena la propagación
  propagacion.js        Aplica el modo calculado sobre la lista de estados
  listaProcesos.js      Estado hookstate + operaciones CRUD
  ciclo.js              Detección de ciclos y balance global
  mensajes.js           Interpola las claves i18n que emite el motor
```

Y, desde F3, el problema completo como unidad serializable:

```
src/permalink/
  formato.js            Serialización, compresión y normalización (puro)
  problema.js           Puente con hookstate: leer, aplicar, enlazar, descargar
```

Y en componentes:

```
src/components/
  TablaProcesos.jsx     Tabla con columnas declaradas por tipo
  DialogoProceso.jsx    Alta/edición de un proceso
  Ciclos.jsx            Balance de los ciclos detectados
  Compartir.jsx         Enlace, descarga e importación del problema
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
        { "clave": "p_final", "unidad": "kPa", "requerido": true, "soloCalculado": true },
        { "clave": "eta", "unidad": "-", "defecto": 0.8, "min": 0.01, "max": 1, "soloCalculado": true }
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

**`soloCalculado`** (añadido al implementar F1). En modo manual el usuario crea los dos
estados y el proceso *deduce* las magnitudes: `p_final` y `eta` no son entradas, son
resultados. Solo hacen falta cuando el proceso genera el estado destino. Marcarlos así
deja el diálogo de F1 reducido a tipo + origen + destino + caudal + estilo, y hace que F6
sea puramente aditiva: cambia `modoDestino` y los parámetros aparecen.

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

### F1 — Objeto Proceso en modo manual — *p-h completada, psicrométrica pendiente*

- [x] `definiciones.json` con los cuatro tipos p-h: compresión con rendimiento
  isentrópico, isobárico, isentálpico e isotermo.
- [x] `resolvedores.js` con `verificar()` y tolerancias por tipo. La tolerancia es mixta
  (`abs` + `rel`): h y s llevan desplazamiento de referencia y T va en ºC, así que una
  tolerancia puramente relativa sería inservible cerca de cero.
- [x] `proceso.js` (motor), `listaProcesos.js` (CRUD hookstate), `DialogoProceso.jsx` y
  `TablaProcesos.jsx`.
- [x] Dos niveles de diagnóstico: **errores** estructurales (fila roja, proceso inválido)
  y **avisos** de coherencia (fila ámbar, no bloquea). El motor emite claves i18n con
  datos; `mensajes.js` los interpola.
- [x] Validaciones estructurales: aridad, referencias rotas, fluidos distintos y estados
  fuera del rango de la EoS. Un estado borrado deja el proceso marcado, no lo borra en
  cascada.
- [x] Un proceso nuevo hereda los dos estados seleccionados en la tabla, si hay
  exactamente dos.
- [x] 17 tests del motor contra CoolProp real, incluido el redondeo del rendimiento
  isentrópico y el caso de estado huérfano.
- [x] Claves i18n en `es.json` / `en.json` (119 en cada uno, sin desfase).
- [ ] Tipos psicrométricos sobre el mismo motor (mezcla adiabática, calentamiento
  sensible, enfriamiento con deshumidificación, humectación adiabática y con vapor).
  Pasa a 1.9.0: F2 y F3 no dependen de ellos, y el permalink ya serializa los estados de
  aire húmedo, así que añadirlos será puramente aditivo.

**Lo que F1 deliberadamente no trae:** las columnas de resultado por tipo (Δh, Δs, w, SHR…)
son F2, y el trazado en el diagrama es F4. La tabla de F1 muestra identidad y diagnóstico.

### F2 — Tabla de procesos ✅

- [x] Catálogo `columnasResultado` en `definiciones.json`: cada columna declara símbolo,
  unidad, clave i18n y si exige caudal. Los tipos siguen eligiendo las suyas en `columnas`,
  pero **el orden de la tabla es el del catálogo**, no el del tipo: así una columna
  compartida por varios tipos no salta de sitio según qué proceso encabece la tabla.
- [x] `derivados()` en los cuatro resolvedores. Δh, Δs y ΔT son comunes; cada tipo añade lo
  suyo (w y relación de compresión y η real en el compresor, q = Δh en el isobárico,
  q = T·Δs en el isotermo, relación de expansión en la laminación).
- [x] `derivadosProceso()` filtra el resultado a las columnas que el tipo declara y a los
  valores finitos: el JSON sigue siendo el contrato y un resolvedor que calcule de más no
  ensucia la tabla. Un proceso inválido no produce derivados.
- [x] La tabla muestra la unión de las columnas de los procesos existentes; las de potencia
  desaparecen mientras ningún proceso lleve caudal.
- [x] Exportación CSV de la tabla de procesos (`Procesos.csv`), con el resumen del
  diagnóstico en vez de los mensajes, que llevan comas.
- [x] 11 tests nuevos, incluidos los signos (w > 0 en el compresor, q < 0 al comprimir
  isotermo, ΔT < 0 en la laminación) y el orden de columnas.

No hizo falta dnd ni selección propia más allá de la que ya traía F1.

### F3 — Permalink y exportación *(adelantada)* ✅

Depende solo de P0 y F1. Es la fase de mayor valor docente por unidad de esfuerzo
(compartir un enunciado como enlace), y adelantarla obliga a fijar pronto el formato
serializado, lo que disciplina el modelo de datos antes de que se compliquen las fases
siguientes.

- [x] `src/permalink/formato.js`: puro, sin hookstate ni DOM. Serializa
  `{ v, estados, aires, procesos, configuracion }`, comprime con
  `CompressionStream('deflate-raw')` y codifica en base64url tras `#p=`. El hash evita
  rewrites en GitHub Pages y no viaja al servidor. Marca inicial `z` (comprimido) o `j`
  (plano) para degradar donde no exista `CompressionStream`.
- [x] **De un estado solo se guardan las entradas** (`fluido`, `in1Id/in1Val`,
  `in2Id/in2Val`), no las propiedades derivadas: CoolProp las recalcula al cargar. Un
  problema de 8 estados y un proceso ocupa ~500 caracteres de enlace, holgado.
- [x] Todo lo que llega por un enlace es entrada no fiable: `normalizarProblema()` valida
  campo a campo, descarta estados y procesos incompletos y filtra la configuración a una
  lista blanca explícita. Lo que no está en ella (selecciones, diálogos abiertos) es estado
  de sesión y no viaja.
- [x] `src/permalink/problema.js`: puente con hookstate. **Sustituye** el contenido en vez
  de fusionarlo — un enunciado compartido tiene que verse igual en el navegador de quien lo
  recibe. Espera a CoolProp (`esperarCoolprop()`), que en el arranque sí puede no estar
  listo todavía.
- [x] `Compartir.jsx`: copiar enlace, descargar JSON e importar JSON. Sin portapapeles
  (contexto no seguro) el enlace se muestra para copiarlo a mano; por encima de 4000
  caracteres avisa de que conviene descargar el fichero.
- [x] Formato versionado (`{"v":1,...}`) desde el primer permalink publicado; un enlace de
  otra versión da un mensaje claro, no un fallo a medias.
- [x] 13 tests: ida y vuelta de codificación, rechazos, normalización, y reconstrucción del
  problema contra el estado real de la aplicación (que es donde se detectaría un campo de
  entrada olvidado).

Verificado además de extremo a extremo en Chrome: un enlace generado fuera de la aplicación
reconstruye los dos estados, el proceso y sus columnas de resultado, y un hash corrupto
avisa sin dejar la aplicación inservible.

### F4 — Trazado de la curva real ✅

- [x] `trazar()` en los cuatro resolvedores, devolviendo **estados**, no puntos del plano.
  La proyección la hace `proyectar()` en `Diagrama.jsx`, así que un solo trazado sirve para
  el p-h, el T-s y el p-T (§1.3). Comprobado en pantalla: en T-s la laminación sale curva y
  la condensación enseña el desrecalentamiento; un `trazado: "recta"` habría dibujado las
  dos mal.
- [x] La compresión real no tiene trayectoria termodinámica definida —es irreversible—, así
  que se dibuja suponiendo que el rendimiento actúa por igual a lo largo de toda la
  compresión: `h(p) = h1 + (h_s(p) − h1)/η`, con el η **medido en la pareja**, no con el
  declarado (que en modo manual ni existe). La curva pasa exactamente por los dos estados.
- [x] Los extremos de la curva son los propios estados de la tabla, de modo que toque los
  puntos dibujados aunque el modelo intermedio sea aproximado. Los puntos que CoolProp no
  resuelve se descartan: el isotermo dentro de la campana es el caso, porque ahí p y T dejan
  de ser independientes.
- [x] Un dataset Chart.js por proceso, con `estilo` (color, grosor, trazo) aplicado.
- [x] Memoización por firma de procesos y estados: sin ella cada render rehace 25 llamadas a
  CoolProp por proceso. Aquí la memoización de P0 dejó de ser cosmética.
- [x] `trazado` en `definiciones.json` ya no nombra un resolvedor propio (`barridoP` /
  `barridoH` de la especificación no podían compartirse: el barrido de presión del
  compresor y el de la laminación son física distinta). Declara `nPuntos` y `escala`, y el
  trazado lo implementa el resolvedor del tipo, como las otras tres operaciones (§2.3).

### F5 — Selección sincronizada ✅

- [x] Fila de procesos → resalta la curva (más grosor) y las filas de estado implicadas.
- [x] Clic en la curva → selecciona la fila. El `idProceso` viaja dentro del dataset, y hay
  un radio de 30 px alrededor del punto: con `nearest` e `intersect: false`, sin ese
  filtro un clic en cualquier parte del lienzo seleccionaba la curva más próxima.
- [x] Fila de estado → resalta los procesos incidentes.
- [x] El resaltado es una barra lateral, no un fondo, para no tapar el color del
  diagnóstico de la fila.

Barato una vez P0 hizo que todo se referencie por `id`: son dos funciones de incidencia
(`idsProcesosDeEstados`, `idsEstadosDeProcesos`) y un conjunto en cada tabla.

### F6 — Modo calculado ✅

- [x] `destino()` en los cuatro resolvedores. No construye el estado: devuelve **la pareja
  de propiedades que lo define**, con las mismas claves que usa la tabla. El motor la pasa
  por `getObjetoFluido`, así que un punto generado es idéntico a uno escrito a mano
  —editable, exportable— y no hay un camino de creación paralelo.
- [x] Propagación en orden topológico (`planificarPropagacion`), con las aristas de cierre
  excluidas. **El bucle infinito no llega a existir en vez de romperse**: cuando ningún
  generador puede avanzar, se descarta el último de la lista —el que vuelve al estado de
  partida— y se reintenta (§1.4). Dos procesos que generen el mismo estado: gana el primero.
- [x] Un proceso calculado que no genera su destino lo **verifica**: compara el estado al
  que llega con el que hay y marca la discrepancia.
- [x] El estado generado se marca en la tabla de estados con un icono y su tooltip.
- [x] Si el usuario edita a mano un estado calculado, se rompe el vínculo y el proceso pasa
  a `manual`, con aviso (decisión 4). Cambiar solo el nombre no rompe nada.
- [x] Al pasar un proceso a calculado, los parámetros que hasta entonces eran resultado se
  rellenan con lo que ya describía la pareja de estados (p_final, t_final, η real): el punto
  no salta al cambiar de modo. Y si no había estado destino, se crea uno.
- [x] **Añadido `x_final` al isobárico** (no estaba en la especificación). Condensar hasta
  líquido saturado no se puede pedir con la temperatura, porque dentro de la campana T no
  distingue el título, y sin eso el tipo no sirve para medio ciclo frigorífico. De ahí
  también `requiereAlguno` en el esquema: exigir uno de varios parámetros, declarativamente.
- [x] La marca de derivado no viaja en el permalink: se vuelve a deducir propagando al
  cargar, que es la única fuente de verdad.

### F7 — Ciclos ✅

Confirmado que no requiere un tercer objeto de primera clase: un ciclo es un camino cerrado
en el grafo que ya forman los procesos.

- [x] `detectarCiclos()` enumera los ciclos elementales y deduplica por conjunto de
  procesos, porque el mismo ciclo se puede recorrer empezando por cualquier arista. Con
  topes de longitud y de número de ciclos: el grafo de un problema docente es diminuto, pero
  un enunciado raro no debe poder colgar la interfaz.
- [x] **El trabajo no se le pide a cada tipo, se deduce**: `w = Δh − q`, con la `q` que dé
  el resolvedor (Δh en el isobárico, T·Δs en el isotermo, cero en los adiabáticos). Así el
  balance es coherente por construcción y ΣΔh = 0 alrededor del ciclo sale solo, en vez de
  ser una comprobación que puede fallar por un signo mal puesto en un tipo.
- [x] Balance global: trabajo neto, calor absorbido y cedido, y el indicador que
  corresponda —COP frigorífico y de bomba de calor si el ciclo consume trabajo, rendimiento
  térmico si lo produce—. Con caudal común a todo el ciclo, además las potencias en kW.
- [x] El panel solo aparece cuando hay ciclo, y pulsar la secuencia de estados resalta el
  ciclo entero en el diagrama (reutiliza F5).
- [x] La comprobación de cierre la hacen los propios procesos (§1.4, implementada en F6): un
  proceso calculado que no genera su destino compara y marca la discrepancia. El panel
  señala si alguno de los procesos del ciclo está marcado, sin ocultar el balance.

Verificado con el ciclo frigorífico de R134a de referencia (−10 ºC / 1000 kPa, η = 0,75):
COP frigorífico 3,074, COP de bomba 4,074 —que difieren exactamente en uno— y w + q = 0.

---

## 4. Versionado

| Versión | Contenido |
|---|---|
| 1.6.1 | P0 (refactor sin cambios visibles) — *publicada* |
| 1.7.0 | F1 (procesos p-h en modo manual) — *publicada* |
| 2.0.0 | F2 (tabla de procesos), F3 (permalink), F4 (trazado real), F5 (selección sincronizada) y F6 (modo calculado) — el modo calculado cambia el modelo mental de la app, de ahí el salto de mayor |
| 2.1.0 | F7 (ciclos y balance) |
| 2.2.0 | F1 psicrométrica (los tipos de aire húmedo sobre el mismo motor) |

F2 y F3 se habían planeado como una 1.8.0 propia, pero salen dentro de la 2.0.0: no llegaron
a publicarse por separado y no tiene sentido inventar una versión que nadie ha visto.

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
