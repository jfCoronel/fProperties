# fProperties — documentación

Estado del proyecto en la **versión 2.4.0**.

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
| Gráficas | Chart.js 4 con react-chartjs-2, y chartjs-plugin-zoom para el encuadre |
| Física | CoolProp 6.4.1 (WebAssembly) |
| Construcción | Vite 5 + vite-plugin-pwa |
| Tests | Vitest (196 tests contra CoolProp real) |
| Idiomas | Español e inglés |

Índice:

 [1. Cómo se usa](#1-cómo-se-usa) 

[2. El permalink](#2-el-permalink) 

[3. Arquitectura](#3-arquitectura)

[4. Tests](#4-tests) 

[5. Estado y deuda conocida](#5-estado-y-deuda-conocida)

[6. Hoja de ruta](#6-hoja-de-ruta)

---

## 1. Cómo se usa

### 1.1 Acceso, idioma e instalación

La aplicación vive en **[fproperties.jfcoronel.org](https://fproperties.jfcoronel.org)**,
servida por GitHub Pages. No hace falta registrarse ni instalar nada: basta abrir la página.

El dominio lo declara un fichero `CNAME` en la raíz de lo publicado. Está en **`public/`**,
que es de donde Vite lo copia a cada build, de modo que cualquier salida de `npm run build`
lo lleva dentro. Tenerlo solo en la carpeta publicada era una trampa: bastaba sobrescribirla
con una build nueva para tumbar el dominio.

Lo que hay en línea es la **última versión etiquetada**, no lo último de `main`: publicar es
etiquetar ([§3.7](#37-publicar)).

Arriba a la derecha hay tres botones —compartir, descargar e importar, todos ellos descritos
en el [§2](#2-el-permalink)— y el **selector de idioma** (español / inglés), que cambia toda
la interfaz en el acto.

Es una **PWA**: el navegador ofrece instalarla como aplicación y, una vez visitada, funciona
**sin conexión**, porque el binario de CoolProp y los textos quedan precacheados.

Junto al título hay un desplegable con los dos mundos de la aplicación, **Fluidos** y **Aire
Húmedo**, y al otro extremo de la misma línea los botones de compartir y el idioma. Son dos
calculadoras distintas, no dos vistas de lo mismo, y el desplegable lo dice mejor que unas
pestañas: además deja la cabecera en una sola línea.

Cada zona —estados, procesos, diagrama— va en su propia caja de esquinas redondeadas
(la clase `.panel`), de modo que se vea de un vistazo dónde acaba una y empieza la siguiente.
Las tres comparten contenedor, y por eso el mismo ancho y los mismos márgenes; el lienzo del
diagrama lleva altura fija y `maintainAspectRatio: false`, para que no crezca sin fin en
pantallas anchas.

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

Bajo la tabla de procesos hay dos desplegables, y son toda la configuración del **diagrama de
fluidos**:

- **Tipo**: *ninguno*, `log p – h`, `T – s`, `h – s` (Mollier) o `p – T`. *Ninguno* hace de
  interruptor: no hay un botón aparte para mostrar u ocultar el diagrama, y con él no se
  dibuja nada.
- **Fluido** del diagrama; debajo se recuerdan sus puntos triple y crítico.

El diagrama muestra la curva de saturación del fluido elegido, los **estados de la tabla**
que sean de ese fluido —círculo hueco de borde azul, con su nombre al lado, y más grandes los
que estén seleccionados— y las **curvas de los procesos** de ese mismo fluido. El punto va
hueco para que no tape la curva sobre la que cae.

El encuadre se maneja sobre el propio lienzo: **Cmd+rueda** en Apple o **Ctrl+rueda** en el
resto acerca y aleja (el pellizco sigue disponible en táctil), **Cmd+arrastrar** en Apple o
**Ctrl+arrastrar** en el resto mueve, **Mayús+arrastrar** amplía el rectángulo que dibujes, y el botón
*Reencuadrar* —o un doble clic— vuelve al ajuste automático. Solo cabe un gesto de arrastre, y
mover es el que se busca sin pensar; por eso el rectángulo va con Mayús. Cambiar de tipo de
diagrama o de fluido también reencuadra: el encuadre anterior no significa nada en otros ejes.
El zoom es estado de sesión y no viaja en el enlace compartido.

El ancho del diagrama es el de la página y el **alto**, por defecto, tres cuartos de la
ventana (entre 440 y 1000 px). Se cambia **arrastrando el tirador** que hay bajo el lienzo, y
un doble clic sobre él devuelve la altura por defecto. La altura elegida se recuerda en el
navegador —es la misma para el diagrama de fluidos y el psicrométrico— pero no viaja en el
enlace: depende de la pantalla de cada uno, no del problema.

Qué entra y qué no lo decide la columna **Diagrama**, que aparece en la tabla de estados y en
la de procesos en cuanto hay un diagrama elegido: un ojo por fila, encendido por defecto, y
otro en la cabecera que las cambia todas de golpe. Es un ojo y no una casilla porque la
columna de selección de la tabla ya son casillas y dos columnas de casillas con significados
distintos se confunden. La visibilidad es una propiedad del estado o del proceso, no de la
sesión: se duplica con la fila, se borra con ella y viaja en el enlace compartido, al
contrario que la selección. Ocultar un estado no oculta los procesos que lo tocan —la curva
sigue terminando ahí— y ocultar un proceso no oculta sus extremos. Los ejes se ajustan
solos a lo dibujado, y la curva de saturación se recorre siempre entre el punto triple y el
crítico. El color de los puntos y el de la campana son decisiones fijas: el diagrama sirve
para ver los estados y los procesos.

**Líneas de fondo.** Cada diagrama dibuja de fondo familias de isolíneas, en grises y
distinguidas por el trazo, contra las que leer un estado. El botón del engranaje abre el
diálogo *Configurar el diagrama*, cuya primera pestaña enciende o apaga cada familia y elige
sus valores; la segunda fija a mano los límites de los ejes.

| Diagrama | Familias (✓ = encendida por defecto) |
|---|---|
| p-h | isotermas ✓, isentrópicas ✓, título constante ✓, isócoras |
| T-s | isobaras ✓, título constante ✓, isentálpicas, isócoras |
| h-s | isobaras ✓, isotermas ✓, título constante ✓, isócoras |
| p-T | isócoras |
| Psicrométrico | humedad relativa ✓, bulbo húmedo ✓, entalpía ✓, volumen específico |

El **h-s** es el diagrama de la producción de potencia: en él una isentrópica es una vertical,
y dentro de la campana las isobaras son rectas de pendiente T. Por eso las compresiones y
expansiones con rendimiento dibujan, además de su curva, un **trazo auxiliar** discontinuo
del origen al estado ideal (p₂, s₁), rotulado *2s*: en el h-s los dos saltos de entalpía, el
real y el ideal, se leen directamente, y el rendimiento isentrópico es su cociente. El trazo
aparece también en los demás diagramas, donde la isentrópica se curva.

Los valores son **automáticos** por defecto: valores redondos que cubren el diagrama y se
adaptan al fluido (o a la presión total, en el psicrométrico). Con **valores propios** se
dibujan los que se escriban, separados por punto y coma o espacios y con el decimal con coma
o con punto; se aplican al salir del campo o con Intro, porque cada redibujado son cientos de
llamadas a CoolProp. La configuración es **por tipo de diagrama**, no por fluido: al cambiar
de fluido se conservan las familias encendidas y los automáticos se recalculan. Viaja en el
**enlace compartido**, de modo que quien comparte un problema decide qué líneas se ven, y
solo guarda lo que difiere de lo de por defecto. Al pie del diagrama, una leyenda dice qué
familias hay y con qué trazo. Los límites de los ejes solo se aplican si se han tocado: abrir
el diálogo para cambiar las líneas no congela el encuadre.

Las isolíneas se recortan a una **ventana** por fluido: del punto triple a un 60 % del rango
triple-crítico por encima del crítico en temperatura, y hasta el doble de la presión crítica.
Como los ejes se ajustan a lo dibujado, con líneas de fondo el encuadre por defecto es esa
ventana y no solo la campana.

### 1.4 Procesos

Bajo la tabla de estados está la tabla de **procesos**. Un proceso conecta un estado de
origen con uno de destino y declara **de qué tipo es**:

| Tipo | Restricción | Se usa para |
|---|---|---|
| Compresión con rendimiento isentrópico | η_s dentro de (0, 1] y p_2 > p_1 | Compresores, bombas |
| Expansión con rendimiento isentrópico | η_s dentro de (0, 1] y p_2 < p_1 | Turbinas y expansores |
| Isobárico | p constante | Condensadores, evaporadores, calentadores |
| Isentálpico | h constante | Válvulas de laminación |
| Isotermo | T constante | Compresión o expansión isoterma |
| Conducto / intercambiador | Sin trabajo de eje → q = Δh; la presión puede caer | Intercambiadores y tuberías con pérdida de carga, con o sin calor |
| Otro (indeterminado) | Ninguna | Lo que no encaje en los anteriores |

Compresión y expansión son simétricas salvo en un punto, y conviene saberlo: el **rendimiento
isentrópico se define invertido** en cada una. El compresor gasta más trabajo que el
reversible (η = ideal/real) y la turbina entrega menos (η = real/ideal). Invertir la razón es
lo que mantiene los dos por debajo de 1 y los hace comparables. Lo que no cambia es el
convenio de signos: el trabajo lo cuenta el fluido, así que sale positivo en el compresor y
negativo en la turbina, y con él la potencia.

Los dos últimos son los comodines, y no son el mismo comodín. El **conducto** supone una sola
cosa —que no hay trabajo de eje—, y con esa hipótesis el primer principio en régimen
estacionario da `q = Δh` aunque la presión caiga: la caída deja de ser un incumplimiento y
pasa a ser un resultado (Δp), que es justo lo que el isobárico no sabía expresar. El
**indeterminado** no supone nada: nunca puede ser incoherente, solo mide los saltos (Δh, Δs,
ΔT, Δp), su curva es el segmento entre los extremos —lo único afirmable de un camino
desconocido— y no ofrece modo calculado, porque no hay hipótesis con la que calcular.

Formas de crearlo: seleccionando **exactamente dos estados** y pulsando `+`, con lo que el
proceso nace ya conectado y **con el tipo que encaja con esa pareja**; o pulsando `+` sin
selección y eligiendo los estados en el diálogo, donde además se ajusta el **caudal másico** y
el **estilo** de la curva (color, grosor, continua o discontinua).

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

Cuando la pareja no cumple lo declarado pero sí encaja con otro tipo, el aviso lo dice y
ofrece el cambio de un clic (*encaja con isentálpico*). El editor, por su parte, muestra
siempre bajo el desplegable qué tipo se ha detectado. Son **sugerencias**: el tipo lo sigue
declarando el usuario, porque es de esa declaración de la que vive el diagnóstico —deducir el
tipo automáticamente haría imposible el desacuerdo, y con él se iría lo que la herramienta
enseña— y porque la deducción no siempre tiene respuesta única: una evaporación dentro de la
campana es isobárica e isoterma a la vez, y cualquier pareja con p₂ > p₁ tiene un rendimiento
isentrópico.

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
  final, rendimiento isentrópico, o el calor aportado y la pérdida de carga del conducto— y el
  proceso **genera** el estado de destino. Si no había estado de destino, se crea uno. Los
  tipos que no saben generarlo (el indeterminado) no ofrecen esta opción.

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

El reparto entre calor y trabajo lo decide el **tipo** de cada proceso, y por eso importa
declararlo bien: una turbina descrita como conducto sin trabajo aporta `q = Δh` y trabajo
nulo, con lo que un ciclo de potencia acabaría dando COP en vez de rendimiento térmico. Para
eso está el tipo de expansión, que al ser adiabático no declara calor y deja que todo su Δh
lo recoja `w = Δh − q`.

El convenio de signos es el del propio fluido: positivo lo que absorbe, negativo lo que cede.
Pulsando la secuencia de estados se resalta el ciclo entero en el diagrama. Si alguno de sus
procesos está marcado para revisar, el panel lo señala pero **no oculta el balance**.

Hay un caso en que sí lo oculta: si el ciclo contiene un proceso de tipo **indeterminado**. El
balance reparte con `w = Δh − q`, y de un tipo que no supone nada no se sabe cuánto de su Δh
es calor; darle todo a trabajo sería inventarse la respuesta. El panel dice entonces que el
balance no se puede cerrar, y por qué.

### 1.7 Aire húmedo

La segunda opción del desplegable es la tabla de **estados de aire húmedo**, con el mismo
manejo que la de fluidos (crear, editar, duplicar, borrar, columnas configurables, CSV).

Un estado de aire se define con **tres datos**: la altitud o la presión, y dos propiedades
entre temperatura seca T, húmeda T_H, de rocío T_R, humedad absoluta w, humedad relativa HR,
entalpía h y entropía s. La altitud se traduce a presión con el modelo de atmósfera estándar.

Desde la 2.3.0 el aire húmedo tiene **exactamente la misma forma** que los fluidos: tabla de
estados, tabla de procesos con diagnóstico, panel de ciclos, diagrama y modo calculado. No es
un parecido de fachada: es literalmente el mismo motor y el mismo componente de gráfica, con
un **dominio** distinto ([§3.4](#34-el-motor-de-procesos)).

El **diagrama psicrométrico** dibuja de fondo, por defecto, tres familias de isolíneas
(configurables, como en los de fluido: [§1.3](#13-diagramas)): la humedad
relativa al 25, 50, 75 y 100 % (continuas), la temperatura de **bulbo húmedo** de 5 a 35 ºC
(discontinuas, rotuladas sobre la campana) y la **entalpía** de 0 a 130 kJ/kg (las más
claras, rotuladas en su extremo, sobre el eje w = 0 o en el borde derecho). Las de bulbo
húmedo son la referencia contra la que leer una humectación adiabática, que es exactamente
una de ellas, y las de entalpía ayudan con las mezclas. Todo el fondo va **en grises**, más
oscuro cuanto más importante, para que resalten los estados y los procesos. Encima van los
puntos de la tabla y las curvas de los procesos, con el mismo zoom, arrastre, clic sobre
curva y resaltado cruzado que el de fluidos.

Las de bulbo húmedo empiezan en 5 ºC a propósito: CoolProp distingue agua líquida de hielo, su
bulbo húmedo salta al cruzar 0 ºC y la línea de T_h = 0 no tiene extremo seco. Un diagrama psicrométrico solo vale para **una presión
total**, así que la altitud (o la presión) hace aquí el papel que el fluido hace en el otro
diagrama: dice qué diagrama se está mirando, y los estados a otra presión no se dibujan
porque son otro sistema.

Los **tipos de proceso** del aire húmedo:

| Tipo | Restricción | Se usa para |
|---|---|---|
| Sensible | w constante | Baterías secas, recalentamientos |
| Enfriamiento con deshumidificación | — | Baterías de frío que cruzan el rocío |
| Humectación adiabática | T de bulbo húmedo constante | Enfriamiento evaporativo |
| Humectación con vapor | h₂ = h₁ + Δw·h_agua | Humectadores de vapor |
| Mezcla adiabática | Balances de masa y energía, **dos orígenes** | Mezcla de exterior y retorno |
| Otro (indeterminado) | Ninguna | Lo que no encaje en los anteriores |

En el sensible y en la batería de frío la tabla no muestra Δh: sin trabajo de eje, q = Δh, y
la columna solo repetía el mismo número. Queda q, que es la magnitud con la que se piensa una
batería. Donde sí difieren, como en la humectación con vapor, Δh se mantiene.

Todos ocurren a **presión total constante**, y que dos estados no la compartan es un error,
no un aviso: no son el mismo sistema y no hay proceso que lo arregle. La entalpía y el caudal
van **por kilo de aire seco**, que es lo que hace que los balances sean sumas.

La **mezcla adiabática** es el único tipo con dos estados de origen, y la razón de que el
modelo guarde `origenes` como array desde el primer día. Su caudal no se pide: es el resultado
de sumar los dos que entran, y la tabla lo enseña en la misma columna ṁ que el de los demás
procesos. Se dibuja la recta de mezcla completa, pasando por el segundo
origen; como el punto de mezcla cae sobre ella, el tramo de vuelta se superpone y no se ve —y
cuando el enunciado **no** cuadra, deja de solaparse y la incoherencia se ve en el diagrama
antes que en la tabla.

Del **enfriamiento con deshumidificación** salen las cifras con las que se dimensiona un
equipo: el calor **sensible** y el **latente**, su cociente (SHR) y el caudal de condensados.
El reparto es el de libro —se pasa por el estado intermedio (T final, w inicial)— y por
construcción los dos suman el calor total.

Salen también el **punto de rocío del equipo** (T_ADP) y el **factor de by-pass** (BF). El ADP
es donde la recta entrada→salida, prolongada más allá de la salida, corta la curva de
saturación: la temperatura de superficie efectiva de la batería. El factor de by-pass es
`BF = (T₂ − T_ADP)/(T₁ − T_ADP)`, la fracción del aire que en el modelo de libro atraviesa la
batería sin tocarla, mientras el resto sale saturado a T_ADP. Son **columnas derivadas**: salen
del par de estados y no piden ningún dato más. Un aire que sale saturado es su propio ADP y da
BF = 0. La recta se traza en el plano (T, w), el del diagrama; los libros a veces la trazan en
(h, w), y la diferencia no se aprecia.

El diagrama dibuja esa construcción: desde la salida, una **prolongación discontinua** del color
del proceso que acaba en un punto rotulado *ADP* sobre la curva de saturación. El cociente de
los dos tramos —salida→ADP frente a entrada→ADP— es literalmente el factor de by-pass.

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
| Estados de fluido y de aire (solo sus entradas, más su visibilidad en el diagrama) | Filas seleccionadas y diálogos abiertos |
| Procesos completos: tipo, extremos, modo, parámetros, estilo y visibilidad | La marca de "estado calculado" (se vuelve a deducir) |
| Configuración: idioma, cifras, columnas, tipo de diagrama, fluido, ejes del psicrométrico… | Series guardadas a mano en el psicrométrico |

La lista de claves de configuración que viajan es **explícita**: lo que no está en ella se
considera estado de sesión y no se comparte.

Los campos nuevos no suben la versión del esquema si se pueden leer con un valor por defecto
seguro. `enDiagrama` es el primer caso: se normaliza como *visible salvo que diga que no*, de
modo que un enlace de la 2.1.0 —que no lo lleva— sigue abriéndose con todo dibujado. Subir
`ESQUEMA_PROBLEMA` habría roto todos los enlaces anteriores, porque el cargador rechaza lo que
no coincide con su versión.

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

  diagramas/                Las líneas de fondo de los diagramas
    familiasFondo.js        Catálogo de familias y configuración (datos puros)
    lineasFondo.js          Valores automáticos, isolíneas y recorte
    leyendaFondo.js         Texto de la leyenda del pie

  permalink/
    formato.js              Serialización, compresión y normalización
    problema.js             Puente entre el formato y el estado vivo

  components/               La interfaz (12 componentes)
  util/formatear.js         Formato numérico
  test/setupCoolprop.js     Arranque de CoolProp en Node
```

### 3.2 Arranque y estado global

| Fichero | Función |
|---|---|
| `main.jsx` | Monta `<FProperties/>` en el DOM y carga los estilos de Ant Design. |
| `fProperties.jsx` | Raíz de la interfaz: cabecera, selector de calculadora, selector de idioma, botones de compartir y montaje de tablas y diagramas. Carga los textos al arrancar y al cambiar de idioma, y **resuelve el permalink una sola vez**, cuando ya hay textos con los que informar del resultado. |
| `configuracion.js` | El objeto de configuración global (hookstate): calculadora activa, idioma, cifras significativas, columnas, ajustes de los dos diagramas, selecciones y diálogos abiertos. Aquí viven también `cargarTextosUI`/`getTextoUI` (i18n por clave) y `descargarTablaCSV`. |
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

**b) Cada resolvedor implementa hasta cinco operaciones independientes**, y el motor tolera
la ausencia de cualquiera de ellas:

```js
verificar(origenes, destino, parametros, definicion)  -> [avisos]   // ¿encaja la pareja?
derivados(origenes, destino, parametros, definicion)  -> { ... }    // columnas de resultado
trazar(origenes, destino, parametros, definicion)     -> [estados]  // curva del diagrama
auxiliares(origenes, destino, parametros, definicion) -> [trazos]   // construcciones de apoyo
destino(origenes, parametros, definicion)             -> pareja     // modo calculado
```

`auxiliares` es la más reciente y la implementan tres tipos: la batería de frío, que devuelve
la prolongación de la salida a su ADP, y la compresión y la expansión con rendimiento, que
devuelven el camino isentrópico hasta el estado ideal *2s*. Cada trazo es
`{ estados, rotuloFinal? }`, con estados completos por la misma razón que `trazar`, y el
diagrama lo dibuja fino, discontinuo y del color del proceso, con el extremo marcado.

**b bis) El tipo lo declara el usuario; el programa solo sugiere.** `deteccion.js` sabe qué
tipo encaja con una pareja de estados, y ese conocimiento se usa en tres sitios: el tipo
inicial de un proceso creado desde dos estados, la pista *detectado: X* del editor y el enlace
*encaja con X* del aviso. Nunca sobrescribe lo declarado. Deducir el tipo en vez de
declararlo parece más cómodo, pero elimina la posibilidad misma del desacuerdo, que es de
donde sale el valor didáctico de la columna de diagnóstico; y además no tiene respuesta única
(isobárico e isotermo coinciden en la campana). Cada tipo se comprueba con **su** tolerancia
declarada en el JSON, y el orden va del criterio más estricto al más flojo, para que gane el
que menos se equivoca. Cuando la presión cae, la frontera entre turbina y conducto la traza el
propio rendimiento de expansión: que caiga en (0, 1] equivale a que el estado final quede
entre el isentrópico y la isentálpica, que es exactamente la franja de la expansión adiabática
irreversible. Un enfriamiento con pérdida de carga se pasa de largo y sale con η > 1; un
calentamiento, con η < 0. No hace falta más criterio.

**b ter) Un dominio es lo único que el motor necesita saber de la sustancia.** Fluidos puros y
aire húmedo comparten motor, lista de procesos, propagación, ciclos y diagrama; lo que los
separa cabe en cinco operaciones, y eso es un **dominio**:

```js
magnitudes            // las que un estado debe tener resueltas
cierre                // qué se compara al verificar un proceso calculado, y con qué tolerancia
identidad(estado)     // lo que identifica a la sustancia y se copia a un estado generado
construir(entradas)   // entradas → estado completo
compatibles(estados)  // ¿son el mismo sistema?
```

Un estado se describe por sus **entradas**, una bolsa `{ in1Id, in1Val, … }` que el motor
trata como opaca: pareja en los fluidos, terna en el aire húmedo. Esa es la generalización que
permite que la misma maquinaria valga para dos y para tres propiedades independientes, sin que
el motor sepa nunca cuántas son.

Van en **dos ficheros y no en uno** por dos razones que no son de estilo: `procesos/dominios.js`
es puro —ni hookstate ni detección de tipos— para que el motor se pueda probar sin montar la
aplicación y para que no se cierre el ciclo de imports, ya que `deteccion.js` importa
`proceso.js`; y `listasDominio.js` es el enlace con el estado vivo (qué lista, qué índice, qué
constructor, con qué claves de configuración se entiende la interfaz).

La lista de procesos es **una sola** para los dos dominios. Los ids de estado ya van
prefijados (`f1`, `a1`), el dominio de un proceso se deduce de su tipo —no se guarda, así que
no puede desincronizarse al cambiar de tipo— y cada tabla enseña los suyos. Dos listas
obligarían a duplicar ciclos, propagación e incidencia.

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
| `procesos/dominios.js` | El adaptador de dominio: las cinco operaciones que separan un fluido puro del aire húmedo. Puro —sin hookstate y sin detección— para que el motor siga siendo testeable solo y para no cerrar el ciclo de imports. |
| `listasDominio.js` | El enlace con el estado vivo: qué lista hookstate, qué índice y qué constructor tiene cada dominio, y con qué claves de configuración se entiende su interfaz. |
| `procesos/definiciones.json` | La tabla de tipos: parámetros (con unidad, obligatoriedad, valor por defecto y rango), tolerancias de validación, número de puntos y escala del trazado, y columnas de resultado. Incluye el **catálogo de columnas** —símbolo, unidad, si exige caudal—, que además fija el orden en que se muestran, para que una columna compartida por varios tipos no salte de sitio. Añadir un tipo nuevo es añadir una entrada aquí y su resolvedor. |
| `procesos/resolvedoresAire.js` | La física de los seis tipos de aire húmedo, con el mismo contrato de operaciones. Va aparte de la de fluidos solo por tamaño: el motor ve los dos registros como uno. |
| `procesos/resolvedores.js` | La física de los siete tipos de fluido. Incluye la tolerancia mixta (absoluta más relativa, porque h y s llevan desplazamiento de referencia y T va en ºC) y el cálculo del rendimiento isentrópico real de una pareja de estados, en sus dos definiciones —compresión y expansión—. |
| `procesos/deteccion.js` | Qué tipo encaja con una pareja de estados. Puro y sin estado: lo usan la creación de procesos, el editor y el aviso de la tabla, siempre como sugerencia. |
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
| `TablaFluidos.jsx` | La tabla de estados de fluido: columnas configurables, selección, borrado y duplicado en bloque, reordenación por arrastre, exportación CSV, marca de estado calculado, ojo de visibilidad en el diagrama y resaltado de los estados implicados en el proceso seleccionado. |
| `DialogoFluido.jsx` | Alta y edición de un estado: nombre, fluido y las dos propiedades que lo definen. Es el único sitio donde un estado se edita a mano, y por eso es donde se rompe el vínculo de un estado calculado. |
| `ConfiguracionFluidos.jsx` | Panel lateral de columnas de la tabla de fluidos y cifras significativas. |
| `TablaAires.jsx`, `DialogoAire.jsx`, `ConfiguracionAires.jsx` | Los tres equivalentes para el aire húmedo, con la misma columna del ojo, la misma selección sincronizada y la misma marca de estado calculado. |
| `TablaProcesos.jsx` | La tabla de procesos: columnas de resultado por tipo, diagnóstico con sus mensajes, selección sincronizada, ojo de visibilidad, CSV y disparo de la propagación al crear, borrar o duplicar. **Recibe el dominio como prop** y sirve igual para fluidos y para aire; monta también el panel de ciclos y el editor. |
| `DialogoProceso.jsx` | Alta y edición de un proceso: tipo, modo del estado destino, extremos, parámetros y estilo. Monta **tantos selectores de origen como diga la aridad** del tipo, que es lo que necesita la mezcla adiabática. Rellena los parámetros al pasar a modo calculado —cada uno sabe leerse de la pareja de estados— y crea el estado destino si no lo hay. |
| `Ciclos.jsx` | El panel de balance de los ciclos detectados. Solo se dibuja si hay ciclo, y declara el balance incompleto si alguno de sus procesos es de tipo indeterminado. |
| `columnaDiagrama.jsx` | La columna del ojo, compartida por las dos tablas: recibe los ids, el conjunto de ocultos y la función que escribe, y devuelve la definición de columna. Ni conoce las listas ni las toca. |
| `GraficaEstados.jsx` | **El andamiaje común a los dos diagramas**: rótulos de los puntos, tooltip, zoom, arrastre y reencuadre, clic sobre una curva traducido a la fila de su proceso, armado de series y resaltado. Recibe del diagrama concreto la proyección a los ejes, las etiquetas y las curvas de fondo. Dos cosas van memorizadas y ninguna por capricho: las curvas de los procesos son cientos de llamadas a CoolProp que no deben rehacerse en cada render, y **el objeto de opciones sostiene el zoom** —react-chartjs-2 lo vuelca sobre el gráfico cada vez que cambia de identidad, y el encuadre vive en los mínimos y máximos de las escalas—. También distingue un clic de un arrastre: sin ese umbral, mover el diagrama cambiaría la selección de procesos al soltar. |
| `PanelLineasFondo.jsx` | La pestaña *Líneas de fondo* del diálogo de configuración, común a todos los diagramas: un interruptor por familia, automáticos o propios, y la vuelta a lo de por defecto. Escribe en `configuracion.lineasFondo`. |
| `Diagrama.jsx` | Lo propio del diagrama de fluidos: sus dos desplegables (tipo y fluido), la curva de saturación y la **proyección** de un estado a los ejes, que es lo que hace que un mismo trazado valga para los tres tipos de diagrama. |
| `Psicrometrico.jsx` | Lo propio del psicrométrico: el selector de altitud o presión —que hace el papel del fluido en el otro diagrama— y las isolíneas de fondo (humedad relativa, bulbo húmedo y entalpía), con sus grises y la posición de sus rótulos. |
| `Compartir.jsx` | Los tres botones de la cabecera: copiar enlace, descargar JSON e importar JSON. |

### 3.7 Publicar

Publicar es **etiquetar una versión**. Al subir una etiqueta `vX.Y.Z`, la acción
`.github/workflows/publicar.yml` construye la aplicación en GitHub y despliega `dist/` con el
mecanismo oficial de Pages:

```bash
# con la versión ya subida en package.json y todo en main
git tag v2.4.0
git push origin v2.4.0
```

Antes de desplegar, la acción hace de puerta:

- **La etiqueta tiene que coincidir con `package.json`.** La versión que enseña la
  aplicación sale de ahí (`__APP_VERSION__`), y una etiqueta distinta publicaría un número
  equivocado.
- **Lint y tests**, los mismos que corre `comprobar.yml` en cada push a `main`.
- **La build tiene que estar completa** (`index.html`, `CNAME`, `coolprop.wasm`); si no, no
  se despliega nada y el sitio sigue con la versión anterior.

También se puede lanzar a mano desde la pestaña *Actions* (*Run workflow*), para volver a
publicar sin etiquetar.

Requiere, **una sola vez**, elegir en *Settings → Pages → Source* la opción *GitHub Actions*.
Con ella Pages deja de mirar la carpeta `docs/`.

#### La vía anterior: `docs/` y `npm run publicar`

Hasta la 2.3.1 el sitio se servía desde la carpeta `docs/` del repositorio, y publicar era
lanzar `npm run publicar` —`vite build` más `scripts/publicar.js`— y subir el resultado. El
script **reemplaza** `docs/` en vez de fusionar (los assets llevan hash en el nombre y se
acumularían) y **comprueba la build antes de borrar** nada.

Se conserva mientras se verifica el primer despliegue por la acción: volver atrás es elegir de
nuevo *Deploy from a branch* (`main`, `/docs`) en los ajustes de Pages. Una vez comprobado,
`docs/`, `scripts/publicar.js` y el script `publicar` de `package.json` pueden borrarse.

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

**196 tests en 12 ficheros:**

| Fichero | Tests | Qué fija |
|---|---:|---|
| `propFluidos/coolprop.entorno.test.js` | 3 | Que CoolProp arranca en Node y que un estado irresoluble devuelve `NaN`. Es la sonda de la que depende todo lo demás. |
| `procesos/proceso.test.js` | 53 | El motor: contrato de la tabla de definiciones, tolerancias, avisos de cada tipo, errores estructurales, columnas de resultado y sus signos, trazado de la curva, cálculo del estado destino y orden de propagación. Compresión y expansión se comprueban en espejo, incluido que cada una recupera el rendimiento con el que se construyó su estado destino, y que la expansión dibuja su ideal *2s* a la entropía de entrada. |
| `procesos/dominios.test.js` | 10 | El contrato del adaptador de dominio: que los dos implementan las mismas cinco operaciones, que construyen el mismo estado que la tabla y que cada uno sabe qué hace incompatibles a dos estados —fluidos distintos, presiones totales distintas—. |
| `procesos/aire.test.js` | 40 | La física psicrométrica, centrada en los balances, que es donde un signo cambiado no se ve a ojo: que sensible más latente suman el calor total, que el condensado sale con signo negativo, que la eficacia de saturación vale 1 al saturar, que la mezcla cumple masa y energía y cae entre las dos corrientes, y que de una batería construida con ADP y factor de by-pass conocidos se recuperan los dos, junto con la prolongación que se dibuja hasta el ADP. Más la detección de tipo y la incompatibilidad de presiones. |
| `procesos/propagacion.test.js` | 8 | El modo calculado sobre un ciclo frigorífico completo: la cadena se genera entera, el ciclo se cierra sin bucle, propagar dos veces no cambia nada, mover el estado de partida arrastra la cadena y editar a mano rompe el vínculo. |
| `procesos/propagacionAire.test.js` | 7 | Lo mismo sobre una climatizadora —mezcla de exterior y retorno, batería de frío y recalentamiento—, que junta los tres tipos y el único con dos orígenes. Comprueba además que la propagación escribe en la lista de aires y deja intacta la de fluidos, que es lo que estrena el registro de dominios. |
| `procesos/ciclo.test.js` | 15 | Detección de ciclos (incluidos dos que comparten un estado) y balance: signos, primer principio, COP frigorífico y de bomba —que difieren exactamente en uno—, potencias solo con caudal común y el balance que se declara incompleto ante un proceso indeterminado. Sobre un Rankine completo fija además lo contrario: que produce trabajo neto y da rendimiento térmico, y que declarar su turbina como conducto vuelve a romperlo. |
| `procesos/deteccion.test.js` | 15 | La detección del tipo que encaja con una pareja de estados —incluida la frontera entre turbina y conducto, que un enfriamiento con pérdida de carga no debe cruzar— y los dos tipos comodín: q = Δh con caída de presión, el aviso de presión que sube sin trabajo, el cálculo del destino con calor y pérdida de carga, y el indeterminado, que ni avisa, ni inventa camino, ni genera destino. |
| `propFluidos/isolineasAire.test.js` | 6 | Las isolíneas de fondo del psicrométrico: que arrancan en la campana y llegan a w = 0 sin cruzar el eje, que respetan el recorte del fondo, que **todos** sus puntos tienen la propiedad de la etiqueta, que dependen de la presión total y que la de T_h = 0, sin extremo seco, no se inventa. |
| `diagramas/lineasFondo.test.js` | 20 | Las líneas de fondo: valores automáticos redondos (lineales y logarítmicos), el recorte a la ventana —también en eje logarítmico—, la lectura de lo que escribe el usuario, el filtrado de lo que llega por un enlace y la física: una isoterma del p-h cruza la campana horizontal a la presión de saturación, una isobara del T-s a la temperatura de saturación, las de título acaban junto al crítico, nada se parte al cruzar la saturación ni se sale de la ventana, y en el h-s las isobaras son, dentro de la campana, rectas de pendiente T. |
| `permalink/formato.test.js` | 12 | Ida y vuelta de la codificación, tamaño del enlace, rechazo de cargas ilegibles o de otra versión, y la normalización de lo que llega de fuera, incluida la configuración de líneas de fondo. |
| `permalink/problema.test.js` | 7 | Que lo que se serializa **basta** para reconstruir el problema contra el estado real de la aplicación. Es el test que detectaría un campo de entrada olvidado. Incluye una mezcla adiabática —dos orígenes y dos caudales que sobrevivir al viaje— y un enlace de la 2.2.1 con claves de configuración ya retiradas, que debe abrirse igual. |

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

1. **Aviso de título mínimo a la salida de la turbina.** En una turbina de vapor, un título
   por debajo de ~0,88 erosiona los álabes, y señalarlo sería de lo más didáctico. Se dejó
   fuera a propósito al añadir el tipo de expansión: sería el primer aviso que depende del
   fluido y del componente, y no de la coherencia termodinámica de la pareja, que es lo único
   que juzgan hoy los resolvedores. Entra cuando se decida si ese umbral es un parámetro más
   del tipo o un criterio aparte.
2. **La fase de un estado supercrítico sale como «Desconocido».** CoolProp clasifica un
   estado por encima de la temperatura crítica (vapor a 400 ºC, por ejemplo) como gas
   supercrítico, y `cambiarUnidadSalidaFluido` solo traduce líquido, vapor y bifásico.
3. **El bundle pasa de 1,6 MB** (480 kB comprimido), casi todo CoolProp y Ant Design. Con la
   PWA cacheando no molesta en uso normal, pero la primera visita lo nota.

---

## 6. Hoja de ruta

La §5 recoge lo que falta o sobra en lo que ya existe; esta sección recoge **hacia dónde
crecer**. Van de menor a mayor alcance, que es también el orden propuesto.

### 6.1 Diagrama h-s (Mollier) — hecho en la 2.4.0

Entró en la 2.4.0 junto con las líneas de fondo configurables y el trazo auxiliar del estado
ideal *2s* ([§1.3](#13-diagramas)). Queda de este bloque el aviso de título mínimo a la salida
de la turbina, que sigue en la [§5](#5-estado-y-deuda-conocida).

### 6.2 Análisis exergético — 2.x

Una capa más sobre los procesos y los ciclos, con un **estado muerto** (T₀, p₀) configurable:

- Exergía específica de cada estado: `ψ = (h − h₀) − T₀·(s − s₀)`.
- **Exergía destruida** en cada proceso, `T₀·s_gen`, como columna de la tabla de procesos.
- **Rendimiento exergético** del ciclo en el panel de ciclos, junto al térmico o al COP.

Es barato porque *s* ya está en todos los estados y el reparto calor/trabajo lo deciden ya
los tipos, y es muy didáctico: dice **dónde** se pierde el ciclo, no solo cuánto. El punto
delicado es la temperatura a la que se intercambia el calor en los tipos con `q ≠ 0`, que
hace falta para la exergía del calor; habrá que decidir si es un parámetro del tipo o se toma
de los extremos.

### 6.3 Instalaciones con varias corrientes — 3.0

Es el salto de mayor alcance. Hoy el motor resuelve muy bien la *línea* (estado → proceso →
estado, y ciclo si el camino se cierra), pero buena parte de los ciclos de libro no son una
línea:

- **Rankine regenerativo**: sangrado de turbina con fracción *y* hacia un calentador abierto
  o cerrado.
- **Refrigeración en dos etapas** con depósito de *flash* o enfriamiento intermedio, y
  **cascada**.
- **Batería de frío de una UTA**: el refrigerante que se evapora enfría al aire húmedo, que
  acoplaría de verdad los dos dominios que la 2.3.0 igualó.

El motor está a medio camino: los tipos ya declaran `aridad` y guardan `origenes` como array,
y la mezcla adiabática del aire tiene dos orígenes. El límite real está en `ciclo.js`, que solo
da potencias si **todos los procesos comparten el mismo caudal**; con caudales distintos el
balance se queda en kJ/kg.

Fases propuestas:

1. **Caudal por rama** y **balance de masa en los nudos**; el ciclo deja de exigir un caudal
   único.
2. **Mezcla y división de fluidos**, reaprovechando la mezcla adiabática del aire.
3. **Intercambiador de dos corrientes**: un proceso que enlaza dos procesos con la
   restricción `ṁ₁·q₁ = −ṁ₂·q₂`, válido para cualquier pareja de dominios (fluido–fluido o
   fluido–aire).
4. **Problemas de referencia en permalink** (Rankine regenerativo, frigorífico de dos etapas),
   que sirvan a la vez de ejemplos y de tests de integración.

Encaja con el espíritu de corrector de la herramienta: un nudo cuyas masas o energías no
cuadran es un diagnóstico ⚠️ más, como los que ya emiten los resolvedores.
