# fProperties — documentación

Estado del proyecto en la **versión 2.1.0**.

fProperties es una calculadora tabular de propiedades de fluidos y de aire húmedo que
funciona entera en el navegador. La física la resuelve **CoolProp 6.4.1** compilado a
WebAssembly, así que no hay servidor: ni cálculos en remoto, ni cuentas de usuario, ni datos
que salgan del equipo.

Sobre esa base tabular hay tres capas más: **diagramas** (p-h, T-s, p-T y psicrométrico),
**procesos** que conectan dos estados y comprueban o calculan su coherencia termodinámica, y
**ciclos**, que aparecen solos cuando los procesos cierran un camino.

| | |
|---|---|
| Interfaz | React 18 + Ant Design 5, sin router (navegación por estado) |
| Estado | @hookstate/core 4 |
| Gráficas | Chart.js 4 con react-chartjs-2 |
| Física | CoolProp 6.4.1 (WebAssembly) |
| Construcción | Vite 5 + vite-plugin-pwa |
| Tests | Vitest (77 tests contra CoolProp real) |
| Idiomas | Español e inglés |

Índice: [1. Cómo se usa](#1-cómo-se-usa) · [2. El permalink](#2-el-permalink) ·
[3. Arquitectura](#3-arquitectura) · [4. Tests](#4-tests) ·
[5. Estado y deuda conocida](#5-estado-y-deuda-conocida)

---

## 1. Cómo se usa

### 1.1 Acceso, idioma e instalación

La aplicación se sirve con **GitHub Pages desde la carpeta `docs/`**, bajo el dominio que
declara `docs/CNAME` (`fproperties.jfcoronel.org`; la cabecera de la aplicación enlaza además
a `fproperties.org`). No hace falta registrarse ni instalar nada: basta abrir la página.

> **Ojo:** publicar no es automático. `npm run build` deja la aplicación en `dist/`, y lo que
> se sirve es `docs/`, que se actualiza copiando esa salida. Ahora mismo `docs/` contiene la
> **versión 1.6.0**, así que lo que hay en línea todavía no tiene procesos, permalink ni
> ciclos: todo lo que describe este documento a partir del [§1.4](#14-procesos) está en el
> repositorio pero no publicado.

Arriba a la derecha hay tres botones —compartir, descargar e importar, todos ellos descritos
en el [§2](#2-el-permalink)— y el **selector de idioma** (español / inglés), que cambia toda
la interfaz en el acto.

Es una **PWA**: el navegador ofrece instalarla como aplicación y, una vez visitada, funciona
**sin conexión**, porque el binario de CoolProp y los textos quedan precacheados.

Debajo del título hay dos pestañas, que son los dos mundos de la aplicación:
**Fluidos** y **Aire Húmedo**.

### 1.2 Fluidos: la tabla de estados

Un **estado** es un punto termodinámico: un fluido más dos propiedades independientes.

- **Crear**: el botón `+` añade un estado (agua a 25 ºC y 101,325 kPa) que se edita después.
- **Editar**: pulsando el nombre de la fila se abre el diálogo, donde se elige el nombre, el
  fluido (121, con buscador) y **las dos propiedades que lo definen**: T, p, título
  de vapor X, densidad ρ, entalpía h o entropía s. Todo lo demás se recalcula al vuelo.
- **Columnas**: fijas van nombre, fluido, fase, T y p; además se eligen **hasta siete
  columnas** más entre 19 propiedades (ρ, v, h, u, s, c_p, c_v, k, Pr, μ, ν, α, β, M y los
  puntos crítico y triple) desde el botón de la rueda dentada, que también fija el **número
  de cifras significativas** de toda la aplicación.
- **Manejo de filas**: casillas de selección para borrar o duplicar en bloque, y un asa para
  **reordenar arrastrando**. Reordenar o borrar no rompe nada: los procesos apuntan a los
  estados por un identificador estable, no por su posición.
- **Exportar a CSV** vuelca la tabla tal y como se ve.

Si CoolProp no puede resolver la pareja de propiedades pedida, las celdas muestran `NaN`: el
estado queda fuera del rango de la ecuación de estado, y los procesos que lo usen lo dirán.

### 1.3 Diagramas

El interruptor con el icono de gráfica muestra el **diagrama de fluidos**, con la curva de
saturación del fluido elegido y los puntos de la tabla que sean de ese fluido.

El botón *Configuración diagrama* abre un panel lateral con:

- **Tipo**: `log p – h`, `T – s` o `p – T`.
- **Fluido** del diagrama, con los datos de sus puntos crítico y triple.
- **Qué puntos añadir**: todos los del fluido, o solo los seleccionados en la tabla; en este
  segundo caso se pueden **guardar series** para comparar varias familias de puntos.
- **Color, nombre y línea** de los puntos.
- **Límites de los ejes**, con un botón de *ajustar a los datos*.

### 1.4 Procesos

Bajo la tabla de estados está la tabla de **procesos**. Un proceso conecta un estado de
origen con uno de destino y declara **de qué tipo es**:

| Tipo | Restricción | Se usa para |
|---|---|---|
| Compresión con rendimiento isentrópico | η_s dentro de (0, 1] y p_2 > p_1 | Compresores, bombas |
| Isobárico | p constante | Condensadores, evaporadores, calentadores |
| Isentálpico | h constante | Válvulas de laminación |
| Isotermo | T constante | Compresión o expansión isoterma |

Formas de crearlo: seleccionando **exactamente dos estados** y pulsando `+`, con lo que el
proceso nace ya conectado; o pulsando `+` sin selección y eligiendo los estados en el
diálogo, donde además se ajusta el **caudal másico** y el **estilo** de la curva (color,
grosor, continua o discontinua).

Cada fila muestra, además de la identidad y el tipo, **las columnas de resultado propias de
ese tipo**: Δh, Δs, ΔT, trabajo o calor específicos, relación de compresión o de expansión,
rendimiento isentrópico real y potencia. Las columnas de potencia solo aparecen cuando algún
proceso lleva caudal, y cada columna solo se muestra si algún proceso de la tabla la pide.

La última columna es el **diagnóstico**, en tres niveles:

- ✅ **Coherente**: la pareja de estados encaja con el tipo declarado.
- ⚠️ **Revisar** (fila ámbar): encaja mal —la presión no se mantuvo constante, la entropía
  disminuye en un adiabático, el rendimiento sale fuera de rango—. El mensaje dice qué
  valores no cuadran. No bloquea nada: es lo que convierte a la herramienta en un corrector.
- ❌ **Inválido** (fila roja): fallo estructural —un estado borrado, dos fluidos distintos,
  un estado fuera del rango de la ecuación de estado—. El proceso **no se borra**: se marca,
  para poder recrear el punto y seguir.

Los procesos válidos se **dibujan en el diagrama** con su estilo. La curva se calcula en el
espacio de estados y se proyecta después, de modo que sale correcta en los tres diagramas:
una laminación es una recta vertical en p-h pero **no** en T-s, y ahí se dibuja curva.

**Selección sincronizada**: seleccionar un proceso resalta su curva y las filas de los
estados implicados; seleccionar un estado resalta los procesos que inciden en él; y pulsar
sobre una curva del diagrama selecciona su fila.

### 1.5 Modo calculado

Cada proceso decide quién pone el estado de destino:

- **Dado por mí** (modo manual): el usuario crea los dos estados y el proceso los *comprueba*.
- **Calculado**: el usuario da los **parámetros** —presión final, temperatura final, título
  final, rendimiento isentrópico— y el proceso **genera** el estado de destino. Si no había
  estado de destino, se crea uno.

Al cambiar de manual a calculado, los parámetros se rellenan con lo que ya describía la
pareja de estados (la presión y la temperatura del destino, el rendimiento real medido), de
forma que el punto no salta al cambiar de modo.

Un estado generado se marca en la tabla con el icono de una calculadora. Se recalcula solo
cuando cambia su origen o los parámetros del proceso, y **la cadena se propaga entera**:
mover el estado de partida arrastra a todos los que dependan de él, en el orden correcto.

Si el usuario **edita a mano** un estado calculado, no se le bloquea: se rompe el vínculo, el
proceso vuelve a modo manual y se avisa.

Cuando la cadena se cierra sobre sí misma, el último proceso **no regenera** el estado de
partida —entraría en bucle—: lo **verifica**. Si el estado al que llega no es el que dice el
enunciado, marca la discrepancia. Es lo que permite comprobar que un ciclo cierra.

### 1.6 Ciclos

Cuando los procesos forman un camino cerrado, aparece automáticamente el panel **Ciclos**,
con la secuencia de estados y el balance global:

- **Trabajo neto**, **calor absorbido** y **calor cedido**, por unidad de masa, y en kW si
  todo el ciclo comparte el mismo caudal.
- **COP frigorífico** y **COP de bomba de calor** si el ciclo consume trabajo, o
  **rendimiento térmico** si lo produce.

El convenio de signos es el del propio fluido: positivo lo que absorbe, negativo lo que cede.
Pulsando la secuencia de estados se resalta el ciclo entero en el diagrama. Si alguno de sus
procesos está marcado para revisar, el panel lo señala pero **no oculta el balance**.

### 1.7 Aire húmedo

La segunda pestaña es la tabla de **estados de aire húmedo**, con el mismo manejo que la de
fluidos (crear, editar, duplicar, borrar, columnas configurables, CSV).

Un estado de aire se define con **tres datos**: la altitud o la presión, y dos propiedades
entre temperatura seca T, húmeda T_H, de rocío T_R, humedad absoluta w, humedad relativa HR,
entalpía h y entropía s. La altitud se traduce a presión con el modelo de atmósfera estándar.

El interruptor de gráfica muestra el **diagrama psicrométrico**, con las curvas de humedad
relativa constante y los puntos de la tabla. Como el diagrama es válido para una sola
presión, su panel de configuración filtra qué puntos se muestran por altitud o por presión.

Los procesos todavía **no** cubren el aire húmedo: es la única funcionalidad que queda
pendiente de la especificación original ([§5](#5-estado-y-deuda-conocida)).

### 1.8 Sacar los resultados de la aplicación

Tres caminos, según para qué:

| Quiero… | Uso |
|---|---|
| Las tablas en una hoja de cálculo | *Exportar a CSV*, en cada tabla |
| Compartir el problema con alguien | El botón de compartir: un enlace ([§2](#2-el-permalink)) |
| Guardar el problema en disco | El botón de descargar: un fichero JSON |

---

## 2. El permalink

Un permalink es **el problema entero metido en la propia dirección de la página**: los
estados, los procesos y la configuración de las tablas y los diagramas. Quien abra el enlace
ve exactamente lo mismo que quien lo generó.

Es la forma natural de plantear un enunciado ("abre este enlace y calcula el COP"), de
entregar una solución, o de guardar un caso para retomarlo más tarde.

### 2.1 Qué guarda y qué no

De cada estado **solo se guardan sus entradas** —el fluido y las dos propiedades que lo
definen, o los tres datos del aire húmedo—, nunca las propiedades derivadas: al abrir el
enlace las recalcula CoolProp. Así el enlace es corto y no envejece si mañana se añade una
columna nueva a la tabla.

| Viaja en el enlace | Se queda fuera |
|---|---|
| Versión del formato | Propiedades calculadas (se recalculan) |
| Estados de fluido y de aire (solo sus entradas) | Filas seleccionadas y diálogos abiertos |
| Procesos completos: tipo, extremos, modo, parámetros y estilo | La marca de "estado calculado" (se vuelve a deducir) |
| Configuración: idioma, cifras, columnas, tipo de diagrama, fluido, ejes… | Series guardadas a mano en el diagrama |

La lista de claves de configuración que viajan es **explícita**: lo que no está en ella se
considera estado de sesión y no se comparte.

### 2.2 Cómo se codifica

```
problema → JSON → UTF-8 → deflate-raw → base64url → …/#p=z<carga>
```

- **`deflate-raw` con `CompressionStream`**, que es nativo en los navegadores modernos: no
  añade ninguna dependencia. Un problema de cuatro estados y cuatro procesos ocupa unos 500
  caracteres.
- La carga empieza por una **marca**: `z` comprimido, `j` sin comprimir. La segunda es la
  degradación para un navegador sin `CompressionStream`, y evita que un enlace antiguo deje
  de leerse.
- Va en el **fragmento** (`#`), no en la ruta ni en la query. Dos consecuencias buenas: el
  fragmento **no se envía al servidor** —el problema no sale del navegador— y no hace falta
  configurar redirecciones en GitHub Pages.
- El formato lleva **número de versión** (`{"v":1,…}`) desde el primer enlace publicado. Un
  enlace de otra versión da un mensaje claro en vez de fallar a medias.

Por encima de unos 4000 caracteres la aplicación avisa de que el enlace puede dar problemas
al pegarlo y sugiere descargar el fichero.

### 2.3 Qué pasa al abrir un enlace

1. Se descodifica la carga del fragmento.
2. Se **normaliza campo a campo**. Todo lo que llega por un enlace es entrada no fiable: los
   estados y procesos incompletos se descartan, los parámetros no numéricos se limpian y la
   configuración se filtra por lista blanca. Un enlace manipulado no puede inyectar claves
   arbitrarias en la aplicación.
3. Se espera a que CoolProp esté listo —un permalink se resuelve al arrancar, y puede
   adelantarse al binario— y se recalculan todos los estados.
4. Se **sustituye** el contenido de la aplicación, no se mezcla con lo que hubiera abierto.
5. Se propagan los procesos en modo calculado, que es de donde sale la marca de estado
   generado.
6. Un mensaje confirma cuántos estados y procesos se han cargado.

### 2.4 Descargar e importar

El mismo objeto que viaja en el enlace se puede **descargar como JSON** (legible y
versionado) e **importar** después. Es la salida recomendada cuando el problema es grande, y
el formato de archivo si se quiere guardar una colección de casos.

El botón de compartir copia el enlace al portapapeles y lo deja en la barra de direcciones.
Si el navegador no da acceso al portapapeles —hace falta contexto seguro—, el enlace se
muestra para copiarlo a mano.

---

## 3. Arquitectura

### 3.1 Mapa

```
src/
  main.jsx                  Punto de entrada de React
  fProperties.jsx           Raíz de la interfaz
  configuracion.js          Estado global, i18n y exportación CSV
  fproperties.css           Estilos propios

  propFluidos/              La física
    coolprop.js             Módulo WebAssembly de CoolProp (vendorizado)
    fluidos.js              Propiedades de fluidos puros
    aires.js                Psicrometría

  listaFluidos.js           Lista de estados de fluido
  listaAires.js             Lista de estados de aire húmedo

  procesos/                 El motor de procesos
    definiciones.json       Contrato declarativo de los tipos
    resolvedores.js         Física de cada tipo
    proceso.js              Motor: valida, deriva, traza y ordena
    propagacion.js          Modo calculado sobre la lista de estados
    listaProcesos.js        Lista de procesos e incidencia con los estados
    ciclo.js                Detección de ciclos y balance global
    mensajes.js             Traducción de los mensajes del motor

  permalink/
    formato.js              Serialización, compresión y normalización
    problema.js             Puente entre el formato y el estado vivo

  components/               La interfaz (11 componentes)
  util/formatear.js         Formato numérico
  test/setupCoolprop.js     Arranque de CoolProp en Node
```

### 3.2 Arranque y estado global

| Fichero | Función |
|---|---|
| `main.jsx` | Monta `<FProperties/>` en el DOM y carga los estilos de Ant Design. |
| `fProperties.jsx` | Raíz de la interfaz: cabecera, selector de idioma, botones de compartir, menú de pestañas y montaje de tablas y diagramas. Carga los textos al arrancar y al cambiar de idioma, y **resuelve el permalink una sola vez**, cuando ya hay textos con los que informar del resultado. |
| `configuracion.js` | El objeto de configuración global (hookstate): pestaña activa, idioma, cifras significativas, columnas, ajustes de los dos diagramas, selecciones y diálogos abiertos. Aquí viven también `cargarTextosUI`/`getTextoUI` (i18n por clave) y `descargarTablaCSV`. |
| `fproperties.css` | Estilos propios: fila seleccionada, fila de proceso inválida o con aviso, y la barra lateral del resaltado sincronizado. |

Los textos de la interfaz están en `public/json/es.json` y `public/json/en.json`, con las
mismas claves en los dos ficheros.

### 3.3 El motor de propiedades

| Fichero | Función |
|---|---|
| `propFluidos/coolprop.js` | El módulo emscripten de CoolProp 6.4.1, ~470 kB. Es código vendorizado: **no se toca ni se lee**. Se instancia de forma asíncrona. |
| `propFluidos/fluidos.js` | La envoltura de CoolProp para fluidos puros. Traduce los nombres españoles a los de CoolProp (121 fluidos), convierte unidades (ºC↔K, kPa↔Pa, kJ/kg↔J/kg), aplica los desplazamientos de referencia de h y s, y devuelve `NaN` cuando el estado no es resoluble. `getPropFluido()` da una propiedad; `getObjetoFluido()` devuelve el estado completo. `esperarCoolprop()` espera a que el binario esté instanciado. |
| `propFluidos/aires.js` | Lo mismo para el aire húmedo, sobre `HAPropsSI`. Traduce entre altitud y presión con el modelo de atmósfera estándar. |
| `util/formatear.js` | Formato de un número a un número dado de cifras significativas. |

Las dos listas de estados son arrays hookstate de objetos planos con **todas las propiedades
ya calculadas**, más las entradas que los definen y un identificador estable:

| Fichero | Función |
|---|---|
| `listaFluidos.js` | Alta, baja, duplicado, actualización y reordenación de los estados de fluido. Los ids (`f1`, `f2`…) se derivan del máximo en uso, de modo que sobreviven a la carga de un permalink sin colisionar, y las operaciones reciben **ids, no índices**: por eso borrar o reordenar una fila no corrompe los procesos que la referencian. |
| `listaAires.js` | Lo mismo para el aire húmedo (`a1`, `a2`…). |

### 3.4 El motor de procesos

Es la parte con más diseño detrás, y descansa en cuatro reglas:

**a) El contrato es declarativo; la física, código.** `definiciones.json` declara qué
parámetros pide cada tipo, con qué unidades, qué columnas de resultado muestra, con qué
tolerancia valida y cómo se barre su curva. La física vive en `resolvedores.js`, en un
registro `clave → funciones`, al que el JSON referencia **por nombre**. Se descartó meter
ecuaciones ejecutables en el JSON: obligaría a `eval` o a un mini-intérprete propio. Una
futura versión en Python podría leer el mismo JSON y reimplementar el mismo registro.

**b) Cada resolvedor implementa hasta cuatro operaciones independientes**, y el motor tolera
la ausencia de cualquiera de ellas:

```js
verificar(origenes, destino, parametros, definicion) -> [avisos]   // ¿encaja la pareja?
derivados(origenes, destino, parametros, definicion) -> { ... }    // columnas de resultado
trazar(origenes, destino, parametros, definicion)    -> [estados]  // curva del diagrama
destino(origenes, parametros, definicion)            -> pareja     // modo calculado
```

**c) El trazado se genera en el espacio de estados, no en el plano del diagrama.**
`trazar()` devuelve **estados termodinámicos completos**, y la proyección a los ejes la hace
el diagrama. Un solo trazado sirve así para el p-h, el T-s y el p-T y sale correcto en los
tres; devolver puntos `(x, y)` habría dibujado mal la laminación en cuanto se cambiara de
diagrama. Los extremos de la curva son los propios estados de la tabla, para que toque
exactamente los puntos dibujados aunque el modelo intermedio sea aproximado.

**d) Un ciclo cerrado se cierra solo.** En modo calculado, propagar por el grafo entraría en
bucle infinito en cuanto el ciclo se cierra sobre el estado inicial. La regla es que un
proceso cuyo destino ya genera otro **no genera: verifica**. En la práctica, cuando ningún
generador puede avanzar se descarta la última arista y se reintenta, así que el bucle no
llega a existir en vez de tener que romperse.

| Fichero | Función |
|---|---|
| `procesos/definiciones.json` | La tabla de tipos: parámetros (con unidad, obligatoriedad, valor por defecto y rango), tolerancias de validación, número de puntos y escala del trazado, y columnas de resultado. Incluye el **catálogo de columnas** —símbolo, unidad, si exige caudal—, que además fija el orden en que se muestran, para que una columna compartida por varios tipos no salte de sitio. Añadir un tipo nuevo es añadir una entrada aquí y su resolvedor. |
| `procesos/resolvedores.js` | La física de los cuatro tipos p-h. Incluye la tolerancia mixta (absoluta más relativa, porque h y s llevan desplazamiento de referencia y T va en ºC) y el cálculo del rendimiento isentrópico real de una pareja de estados. |
| `procesos/proceso.js` | El motor, sin dependencias de React: resuelve las referencias a estados, valida (aridad, referencias rotas, fluidos distintos, estados fuera de rango, parámetros que faltan), calcula las magnitudes derivadas, genera el trazado, comprueba el cierre de los procesos calculados y ordena topológicamente la propagación. Distingue **errores** estructurales de **avisos** de coherencia. |
| `procesos/propagacion.js` | Aplica el modo calculado sobre la lista de estados: recalcula en orden, marca los estados generados, quita la marca a los que dejan de serlo y rompe el vínculo cuando el usuario edita a mano un estado calculado. Solo escribe si algo ha cambiado, así que volver a propagar no dispara otro render. |
| `procesos/listaProcesos.js` | La lista de procesos (ids `p1`, `p2`…, alta, baja, duplicado) y las dos funciones de incidencia estado ↔ proceso que sostienen la selección sincronizada. |
| `procesos/ciclo.js` | Enumera los ciclos elementales del grafo, deduplicando por conjunto de procesos, y hace el balance. El trabajo **no se le pide a cada tipo, se deduce** del primer principio (`w = Δh − q`), de modo que el balance es coherente por construcción. |
| `procesos/mensajes.js` | El motor emite claves i18n con datos, no texto: aquí se traducen e interpolan, con los símbolos y unidades que ve el usuario. |

### 3.5 El permalink

| Fichero | Función |
|---|---|
| `permalink/formato.js` | Puro: sin hookstate, sin DOM y sin CoolProp. Serializa, comprime, codifica en base64url y —sobre todo— **normaliza** lo que llega de fuera. Aquí está la lista blanca de claves de configuración y el número de versión del formato. |
| `permalink/problema.js` | El puente con el estado vivo: construye el problema leyendo las tres listas, y al revés las sustituye al cargar uno. Genera el enlace, fija el fragmento, descarga el JSON e importa un fichero. |

### 3.6 Componentes

| Componente | Función |
|---|---|
| `TablaFluidos.jsx` | La tabla de estados de fluido: columnas configurables, selección, borrado y duplicado en bloque, reordenación por arrastre, exportación CSV, marca de estado calculado y resaltado de los estados implicados en el proceso seleccionado. |
| `DialogoFluido.jsx` | Alta y edición de un estado: nombre, fluido y las dos propiedades que lo definen. Es el único sitio donde un estado se edita a mano, y por eso es donde se rompe el vínculo de un estado calculado. |
| `ConfiguracionFluidos.jsx` | Panel lateral de columnas de la tabla de fluidos y cifras significativas. |
| `TablaAires.jsx`, `DialogoAire.jsx`, `ConfiguracionAires.jsx` | Los tres equivalentes para el aire húmedo. |
| `TablaProcesos.jsx` | La tabla de procesos: columnas de resultado por tipo, diagnóstico con sus mensajes, selección sincronizada, CSV y disparo de la propagación al crear, borrar o duplicar. |
| `DialogoProceso.jsx` | Alta y edición de un proceso: tipo, modo del estado destino, extremos, parámetros y estilo. Rellena los parámetros al pasar a modo calculado y crea el estado destino si no lo hay. |
| `Ciclos.jsx` | El panel de balance de los ciclos detectados. Solo se dibuja si hay ciclo. |
| `Diagrama.jsx` | El diagrama de fluidos: curva de saturación, puntos, curvas de los procesos y su panel de configuración. Contiene la **proyección** de un estado a los ejes, que es lo que hace que un mismo trazado valga para los tres tipos de diagrama, y la traducción de un clic sobre el lienzo a la fila del proceso. La curva de saturación y las de los procesos están memorizadas: son cientos de llamadas a CoolProp que no deben rehacerse en cada render. |
| `Psicrometrico.jsx` | El diagrama psicrométrico: curvas de humedad relativa constante, puntos filtrados por altitud o presión y su panel de configuración. |
| `Compartir.jsx` | Los tres botones de la cabecera: copiar enlace, descargar JSON e importar JSON. |

---

## 4. Tests

Los tests son de **Vitest** y se ejecutan en Node:

```bash
npm test          # una pasada
npm run test:watch
```

**Llaman a CoolProp de verdad**, no a estados tabulados: los valores que comprueban son los
de la ecuación de estado, y un cambio en la envoltura de unidades o en los desplazamientos de
referencia se nota. Para que el glue de emscripten arranque fuera del navegador hacen falta
tres empujones, todos confinados y documentados en `src/test/setupCoolprop.js`: inyectar
`require` y `__dirname` (no existen en ESM), redirigir la lectura de `coolprop.wasm` a
`public/` y esperar a la instanciación asíncrona. Todo test que use CoolProp llama a
`esperarCoolprop(Module)` en su `beforeAll`.

**77 tests en 6 ficheros:**

| Fichero | Tests | Qué fija |
|---|---:|---|
| `propFluidos/coolprop.entorno.test.js` | 3 | Que CoolProp arranca en Node y que un estado irresoluble devuelve `NaN`. Es la sonda de la que depende todo lo demás. |
| `procesos/proceso.test.js` | 43 | El motor: contrato de la tabla de definiciones, tolerancias, avisos de cada tipo, errores estructurales, columnas de resultado y sus signos, trazado de la curva, cálculo del estado destino y orden de propagación. |
| `procesos/propagacion.test.js` | 8 | El modo calculado sobre un ciclo frigorífico completo: la cadena se genera entera, el ciclo se cierra sin bucle, propagar dos veces no cambia nada, mover el estado de partida arrastra la cadena y editar a mano rompe el vínculo. |
| `procesos/ciclo.test.js` | 10 | Detección de ciclos (incluidos dos que comparten un estado) y balance: signos, primer principio, COP frigorífico y de bomba —que difieren exactamente en uno— y potencias solo con caudal común. |
| `permalink/formato.test.js` | 9 | Ida y vuelta de la codificación, tamaño del enlace, rechazo de cargas ilegibles o de otra versión, y la normalización de lo que llega de fuera. |
| `permalink/problema.test.js` | 4 | Que lo que se serializa **basta** para reconstruir el problema contra el estado real de la aplicación. Es el test que detectaría un campo de entrada olvidado. |

Qué buscan estos tests, en una frase: fijar **el comportamiento del motor**, que es puro y
donde un error es silencioso —un rendimiento mal despejado o un signo cambiado dan un número
plausible—. Los casos elegidos son los que un profesor reconocería: el ciclo de R134a entre
−10 ºC y 1000 kPa, la laminación que conserva la entalpía, la compresión que recupera el
rendimiento con el que se construyó el estado.

**Lo que los tests no cubren**: no hay tests de componentes ni de DOM. La interfaz se ha
verificado a mano en el navegador y, en los cambios grandes, conduciendo un Chrome sin
ventana por el protocolo DevTools para comprobar la selección sincronizada, el clic sobre las
curvas y la propagación al editar un estado. Esos guiones no forman parte del repositorio.

---

## 5. Estado y deuda conocida

Lo que falta o conviene arreglar, en orden de importancia:

1. **Publicar.** `docs/` sigue en la 1.6.0. Todo lo de los procesos —tabla, diagramas con
   curvas, permalink, modo calculado y ciclos— está en el repositorio y probado, pero no en
   línea hasta que se copie la salida de `npm run build` a `docs/`. Merece la pena
   automatizar ese paso con un script de npm o una acción de GitHub, en vez de dejarlo como
   una copia manual que es fácil olvidar.
2. **Procesos psicrométricos.** El aire húmedo tiene tablas y diagrama, pero no procesos.
   Faltan la mezcla adiabática de dos caudales —el único tipo con **dos** estados de origen,
   razón por la que el modelo guarda `origenes` como array desde el primer día—, el
   calentamiento sensible, el enfriamiento con deshumidificación y las humectaciones. Entran
   sobre el mismo motor, con sus columnas propias (calor sensible y latente, SHR, caudal de
   condensados, factor de by-pass).
3. **`Diagrama.jsx` y `Psicrometrico.jsx` están duplicados en un ~70 %.** Conviene
   factorizarlos antes de que el psicrométrico también tenga que dibujar procesos.
4. **27 errores de ESLint preexistentes** (`react/prop-types` en las filas arrastrables,
   `__APP_VERSION__` sin declarar como global, un `while (true)`). Como `npm run lint` corre
   con `--max-warnings 0`, sigue en rojo pese a no haber ningún error nuevo: limpiarlos es
   una tarea aparte, y hasta entonces la puerta de calidad no sirve de puerta.
5. **El bundle pasa de 1,5 MB** (460 kB comprimido), casi todo CoolProp y Ant Design. Con la
   PWA cacheando no molesta en uso normal, pero la primera visita lo nota.
