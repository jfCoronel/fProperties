# pSolver

Versión hecha con: React  + Firebase
Nombre de la versión: _3_

### CARACTERISTICAS PENDIENTES:

- Uso de las " en las variables, como gestionarlo?, int -> pone una integral

- Uso de problemas como funciones desde otros problemas:
  
  * Colocarlo como un nuevo componente que tenga una barra lateral adecuada para su definición 
  * Se podría meter como una función que se crea exclusiva para ese problema y que su ejecución es la resolución de otro problema.
  * Se le mandan una serie de datos y se devuelven una serie de incógnitas.

- Poder añadir más de una etiqueta a los problema

- Corregir el error por el que cuando se añade una cuestión o se cambia los textos no se actualizan.
  
  

---

### ACCIONES REALIZADAS

2-MAY-2025: Versión 4.40

- Se ha añadido el nuevo componente "Cuestión". Este componente sirve para incluir en los textos cuadros de texto o listas desplegable que pueden ser rellenados por los alumnos.

24-ABR-2025: Versión 4.35

- CRTL+Z: Montar en memoria una lista con los estados anteriores del problema para poder volver hacia atrás (25 estados sería suficiente), no es totalmente prefecto, pero guarda los cambios de posiciones, las ediciones de objetos y la creación, copia y borrado de objetos 

7-ABR-2025: Versión 4.34

- Se cambia ## por ?? para delimitar los valores de variables en markdown para que no sea inompatible con ## de Markdown que genera un título.
- "R": Resolver todas las secciones de un problema
- Botón Nuevo... sin flecha hacia abajo

3-ABR-2025: Versión 4.33

- Error: Cuando una tarea tiene un ID de enunciado usado en tareas anteriores muestra todos los alumnos que han tenido ese enunciado en veces anteriores. Ahora solo usa el ID del enunciado si no encuentra ninguna actividad con ese ID. Para mantener compatibilidad.

- Poder incluir el valor de un dato, una incógnita, una propiedad de fluido o Aire húmedo en los textos en Markdown. Se hace escribiendo el símbolo entre ## x_1 ##

- Los datos en las tablas deben de estar siempre en la unidad inicial, el procedimiento de resolución aplica el cambio de unidad al dato.

3-FEB-2025: Versión 4.32

- Se añade un check a las tablas para permitir el recalculo automático de las tablas al resolver el problema. Las tablas deben de estar en la misma sección que se recalcula.
- Se corrige un error en la escritura del archivo csv para las actividades.
- Otros cambios menores: Se reduce la etiqueta de sección y se le añade un Tooltip

20-ENE-2025: Versión 4.31

- Botón para activar la autocorrección de las actividades desde la tarea
- Poder importar/borrar cursos externos al usuario (de otro profesor) a través del id del curso.
- Poner check "Ocultar cambio de unidades" para los datos y las incógnitas.
- Evitar la carga de los json que son privados (actividades) salvo que el usuario sea el que los carga
- Permitir que la tarea no tenga ID de solución y entonces muestra la lista de actividades pero no las corrige.
- Cuando se edite el curso volver a cargarlo, no sea que por fuera se apuntara alguien ... ¿Qué pasa mientras estoy editando el curso?
- Al crear una nueva actividad comprobar que no existe ya, para no duplicarla, en la creación por parte del alumno y al mandarla a todos los miembros del curso.
- Tareas guardar y mostrar la tabla de actividades corregidas
- Ordenar, filtrar por curso y poder duplicar la lista de Tareas.
- Ordenar y poder duplicar la lista de Cursos.
- Volver a colocar el botón imprimir en la barra de botones de los problemas

18-OCT-2024: Versión 4.30

- Nueva gestión de las actividades a través de los cursos y tareas que los profesores pueden crear.
- El botón nueva actividad se cambia por la gestión de actividades y cursos donde el usuario puede registrarse en un curso o crear una nueva actividad.
- Cambio en la visualización de las tablas, diferenciando las tablas que van en el "papel" y las tablas de la interfaz.
- Cambio en la barra de herramientas, configuración a la izquierda y el usuario a la derecha con un icono y un tooltip (para evitar el ancho variable).
- El tipo "Solución" se añade como un tipo más de problemas 
- La selección del tipo de problema se realiza mediante una lista despleglable en las propiedades generales del problema.
- Se ajusta el alto del papel para A4.

12-SEP-2024: VERSIÓN 4.26

- Se pueden corregir datos tipo texto (entre comillas), en el enunciado del profesor pueden existir una lista de valores separados por comas, por ejemplo r_1 = "disminuye", "baja".
- Error en la lista de actividades vinculadas a un enunciado al cargar el nombre del enunciado.

23-ABR-2024: VERSIÓN 4.25

- Se mueve el servidor a jfcoronel.github.io
  -Añadir a la lista de problemas el nombre de usuario del alumno buscándolo con su e-mail
- El click para cambiar las propiedades generales del problema se extiende a la etiqueta y el identificador

11-ABR-2024: VERSIÓN 4.24

- Error: Ajustar la impresión para que sea igual a lo que se ve, en los textos el ancho cuando se imprime es mayor????

- Se añade la posibilidad mediante un check de bloquear los componentes de manera individual, impidiendo así que puedan ser modificados o eliminados involuntariamente.

18-MAR-2024: VERSIÓN 4.23

- Se aumenta el límite del ancho de las imágenes, gráficas a 200% para los formatos apaisados o A3 de página.
- Tamaños del papel A3, A3 apaisado

06-MAR-2024: Se corrigen los siguientes errores sin cambiar de versión
    - Las actividades creadas de un enunciado que es copia de otro se vinculan al enunciado original.
    - El ancho del filtro de categorías se ajusta
    - Ordenación por fecha de entrega de la tabla de actividades

29-FEB-2024: VERSIÓN 4.22

- Tamaños del papel A4, A4 apaisado
- Recordar el estado de la paginación en la lista de problemas. (Tamaño y página actual)

24-ENE-2024: VERSIÓN 4.21

- Comprobar que en la lista de actividades sólo tenemos actividades
- Cambiar la etiqueta "Importar problema con ID" por "Copiar problema con ID"
- No permitir copiar los "enunciados" a los alumnos.

17-ENE-2024: VERSIÓN 4.20

- Convertir tipo de usuario "estándar" "avanzado" en "alumno", "profesor", "jefe" (sólo para mi)
  
  * El nº máximo (nMaxProblemas) de problemas se limita por separado (50 alumnos, 250 profesores)
  * De momento el paso a tipo profesor se hace solicitándolo por e-mail
  * Los profesores pueden editar las actividades de sus alumnos

- La importación desde Google Drive parece no funcionar, cambio en Google Drive 11-ene-2024,  https://issuetracker.google.com/issues/319531488?pli=1     

5-DIC-2023: VERSIÓN 4.13

- Que las incógnitas muestren las dos unidades aunque no estén calculadas

- Quitar el mensaje de hacer click al crear por tiempo

- Poder convertir un problema normal en actividad de profesor y viceversa
  
  * Eliminar el botón crear actividad
  * Redefinición de los tipos de problemas "Normal", "Enunciado", "Actividad"
  * id de la solución en los enunciados
  * link para ir a la solución

- Reordenación de los botones.

- Lista de actividades de alumnos
  
  * Añadir selector de filas por página
  * Para las actividades de profesor recordar el ID del problema correcto
  * Error en la ordenación en las tablas de ejercicios de alumnos
  * Exportar tabla csv con los resultados de la corrección de los alumnos

- Hacer nuestra propia función para exportar tablas a csv y eliminar ant-table-extension

- la flecha de vuelta a la pantalla anterior a la izquierda

- Convertir los id en links que permitan guardar en el portapapeles

30-OCT-2023: VERSIÓN 4.12

- No resolver problemas con algún componente activo con errores. Mensaje informativo antes de intentar resolver.

- En la corrección por comparación los valores se consideran correctos cuando el error es inferior al 0.1%. Para el caso de que el valor correcto sea 0 el valor del usuario debe ser menor a 1e-9.

19-SEP-2023: VERSIÓN 4.11

- Añadir link "Documentación" en la parte superior de la página
- Mejorar la edición online para los datos, las ecuaciones y las incógnitas, sólo se realimenta al inicio de la edición.

11-SEP-2023: VERSIÓN 4.10

- Secciones Globales: se incluyen en todas las otra secciones

- Secciones: ya es posible corregir por comparación problemas con secciones

- Problemas privados: No se permite su copia o visualización. 

- Las actividades de profesor son no privadas, las actividades de alumno son privadas, y no se puede modificar

- Tipos de problemas: Normales, actividad de profesor, actividad de alumno

- Cambio de idioma únicamente en la pantalla de registro.

- Error: los datos que con valor ? No se deben incluir en la resolución

- Error: Tablas con secciones (he visto que no funciona correctamente). 

- Error en el mensaje de nº máximo de problemas superado

- Error en las etiquetas de actividad entregada y el mensaje de confirmación

- Corrección : * Traducir al inglés el tipo de dato y si la variable es principal o secundaria

12-JUL-2023: VERSIÓN 4.00 (pSolver)

- Traducción al inglés
  
  * Prepararlo para que pueda estar en cualquier idioma.
  * Propuestas de nuevos nombres: pSolver

- Se puede hacer click en las cajas de edición rápida, el cursor se coloca al principio.

- Una línea discontinua para la selección ( https://jsfiddle.net/Souleste/8cpqntjh/ ), ahora la selección se hace con cmd/ctrl + ratón.

- Permitir ordenar la vista tabular por secciones.

- Error en gamma (no entiende el símbolo), se elimina la función gamma (Gamma de Euler, una generalización del factorial)

- Crear ecuaciones dentro de los textos usando $ $.

- Comprobación de si el fluido existe en base al cálculo de su densidad a 25ºC y 1 atm, en lugar de con la masa molecular.
    permite usar los fluidos incompresibles del CoolProp, por ejemplo f = "INCOMP::DowQ" ó "INCOMP::LiBr-23%".
     http://www.coolprop.org/fluid_properties/Incompressibles.html

19-MAY-2023: VERSIÓN 3.55

- Opción de edición rápida para datos, incógnitas, textos y ecuaciones.
  
  * Usando doble click o Enter con el componente seleccionado
  * Para salir del la edición pulsar 'Enter' (para caja de texto no vale), 'Escape' o hacer click fuera

- Eliminar algunos símbolos del formato que utiliza Mathjax, los que tiene sólo dos letras 
    'in', 'ne', 'gt', 'le', 'ge', 'll', 'gg', 'vv', 'nn', 'uu', 'cc', 'CC', 'NN', 'QQ', 'RR', 'ZZ', 'AA', 'EE'

11-MAY-2023: VERSIÓN 3.54

- Los problemas que se realicen sin estar registrados como usuarios podrán guardarse al disco duro en un archivo json
- Estos archivos podrán ser importados a cualquier cuenta de usuario usando el botón "importar problemas desde archivo"
- Cambios en la pantalla inicial, ahora cuando se trabaja sin usuario se pueda cargar un problema almacenado en disco

3-MAY-2023: VERSIÓN 3.53

- Simplificando la creación de actividades.
  * Los enunciados de las actividades se crean con un nuevo botón desde el listado de problemas.
  * Se elimina la sección "Actividades/Exámenes" de los parámetros de configuración del problema.
  * La entrega de actividades por parte del alumno se hace con un enlace colocado al lado del nombre del problema.
- Se corrige un error por el que no se corregían correctamente los problemas debido a la gestión de secciones.

21-ABR-2023: VERSIÓN 3.52

- SECCIONES (Permite resolver varios problemas en 1)
  
  * Nuevo componente que marque el fin de cada una de las secciones
  * Cuando se resuelva o actualice el problema sólo coja los elementos de esa sección
  * Debe de existir siempre una sesión activa     * El cambio entre secciones se hace automáticamente cuando pinche o la selecciona el usuario

- Fondo cuadrícula y puntos más claro, y márgenes laterales un poco menores (ajustados a la cuadrícula)

- Error: Reemplazar símbolo fallaba cuando el símbolo estaba al final de la cadena de texto

- Error: cuando se hacia click sobre un componente no cogía bien la posición x, y (Arreglado)

- Pedir la posición para crear las incógnitas encontradas

- Quitado la creación automática de incógnitas al resolver.

- Los mensajes de creación y pegado de componentes se esperan a que se haga click para destruirse

- Quitar la paginación cuando se realiza un filtrado de la lista

21-MAR-2023: VERSIÓN 3.51

- Se añade la paginación en la parte superior de la lista de problemas
- Error en al convertir incógnita en dato y la incógnita en dato
- Mejoras en corrección:
  * Generar los campos de la tabla (lista de objetos json) con una función de problemas independiente de la forma de visualización
  * Pensar como se funden en una única tabla (columna "Encontrada en") con un único botón corregir
- Error en reemplazar símbolo, no mostraba el mensaje.
- Programar una función para descargar la base de datos completa de firebase a un archivo json. La función sólo se podrá usar por consola

21-FEB-2023: VERSIÓN 3.50

- Actividades
  
  * Las actividades sólo pueden copiarse si su id es el original (no permitir copia de actividades entre alumnos)
  * Los problemas pueden convertirse en actividades con una propiedad global del problema    * Agrupar todo lo referente en un desplegable "Actividad/examen"
  * Guardar el ID_original de para poder realizar un filtro luego por este campo
  * Etiqueta superior después del nombre a todas la actividades incluso la original
  * En la cabecera del papel añadir si el problema está entregado o no y su fecha de entrega cuando la actividad no sea la original
  * El alumno de la actividad puede entregar la actividad a través de un botón
  * Entregar actividad -> Bloquea la modificación de la actividad 
  * El autor original puede ver una lista de los problemas con esa ID_original.
  * El autor original debe poder desbloquear (desentregar) la actividad de los alumnos

- Cambiar los valores por defecto de datos e incógnitas y quitarles la unidad, y la descripción a los fluidos y los aires húmedos.

- Cambio del color de las líneas de las tablas y de la cabecera

- Uso de tablas en markdown operativo con bordes y colores

- Error en las tablas en el procesado de los valores de datos iguales e una expresión "T_1 = 23" ó "T_1 = T_1  + 45"

- Se corrige un error en las gráficas por el que las gráficas nuevas no recordaban la tabla de la que toman los datos. 

9-FEB-2023: VERSIÓN 3.49

- Tablas: A partir de esta versión pueden usarse expresiones matemáticas en la definición de como cambian los datos. Las expresiones se evaluaran usando las variables que han sido previamente calculadas en el problema. En el caso de la definición de los datos separados por comas, a partir del segundo valor se calculan usando los valores de la fila anterior en la tabla. Para más detalle ver la sección de tablas en el manual de usuario.

- Actualización de datos al terminar la edición. Hasta ahora la actualización de datos y fluidos se realizaba al mismo tiempo que el usuario modificaba los valores en la caja de texto. Esto producía un retardo en la escritura en problemas grandes. La revisión y actualización del problema se realiza ahora al terminar la edición y volver al "papel".

- Reordenación de la librería de resolución de ecuaciones.

19-ENE-2023: VERSIÓN 3.48

- Gráficas: cambiar la referencia al nombre de la tabla por una referencia al id (ok)
  
  * Reestructurado el formulario para las gráficas (series en desplegables)
  * Cada serie puede referirse a una tabla diferente.
  * Se le añade nombre a cada una de las series.
  * Añadir eje secundario
  * Formato de miles de los números de los ejes (locale="es" usa la ,)

- Actualizaciones:
  
  * Uso de Vite js
  * Versión 18 de React.
  * Versión 4 de hookstate:
    - En la estados globales: createState -> hookstate
    - En los componentes de React: useState -> useHookstate

- El valor cambiado de unidad de los datos e incógnitas no lo formatea correctamente (pone 10^-06)

- Al cerrar o actualizar el Tab se cargaba el último problema, salvaba un problema con la lista ya vacía. Ahora sólo se guarda al cerrar si estamos en modo problema.

- Añadir las mayúsculas a los Shortcuts "X", "Y", "R", ...

- Buscar y crear las incógnitas en los valores de las propiedades de los fluidos y/o aires húmedos.

- Corregir el reemplazar símbolo para que reemplace variables en las expresiones y no texto (problema al cambiar "t" por "p", reemplaza también "t_1" por "p_1"

- Se ha independizado el código para resolver, revisar y otras herramientas de los problemas.

20-OCT-2022: VERSIÓN 3.47

- En las tablas hacer que el valor de un dato sea una variable de la resolución de los instantes anteriores, por ejemplo: T_i = 10, T_pre.  Mejor poder poner expresiones evaluadles con las variables del instante/s anterior/es.
- Eliminar de las tablas el nº de hojas / page, eso se dice en la tabla
- Implementar cortar (ctrl x) básicamente es mover el componente

6-OCT-2022: VERSIÓN 3.46

- Añadir la opción "Problema de examen"
  * Sólo sería editable esta opción si el autor es el autor original, para el resto se ve pero no se edita
  * Cuando usemos el id de un "Problema de examen" definido por otro usuario, no podremos copiar nada de fuera de ese problema. 
  * Escribir marca de agua en los folios para los problemas de examen (autor, id, autor original)
- Mover los componentes seleccionados con los cursores
- Añadir las propiedades de fluidos constantes (Masa molecular, p y T del punto crítico, p y T del punto Triple) 

12-SEP-2022: VERSIÓN 3.45

-El botón "Reemplazar símbolo" toma el elemento seleccionado como símbolo original en el diálogo de refactoring

- Revisar/reordenar la corrección por comparación
  - Poner una columna "Borde", y el filtro mostrar pasarlo a "Variables con borde / Todas las variables"
- Error en las unidades cambiadas de las incógnitas en la corrección (4-jul-2022), lo subo a producción

27-JUN-2022: VERSIÓN 3.44

- Nueva opción de corrección por comparación
- En el filtro de problemas cambiar "Categorias" por "Por categorías ..."
- Firebase v 8 -> v 9, cambio de las funciones a "await" 
- Reordenando la barra de botones:
  - Creación de todos los componentes en el botón Nuevo.
  - 4 zonas: Creación, edición, cálculo y usuario.
  - Se elimina el botón print (redundante con imprimir)
  - flecha atrás para volver a la pantalla de la lista de problemas o de registro.

6-MAY-2022: VERSIÓN 3.43

- Botón para cambiar nombre a los símbolos de datos, incógnitas y propiedades de fluidos, de forma que automáticamente busque en todas las ecuaciones y datos y los reemplace.
- Error en el tamaño de los números cuando se produce un cambio de unidad (datos e incógnitas)
- Poner opción para añadir unidades en la cabecera de las tablas
- Permitir el uso de nombres de fluidos diferentes a los de la lista, función para ver si existe
- Cuando se cambia el nombre de una tabla buscar las gráficas que dependen de ella y actualizar la referencia.
- Edición en las ecuaciones en un campo multilinea (como los textos)
- Aumentaremos los márgenes algo más hasta 2,5 cm aproximadamente.
- Color de elementos inactivos configurable. Por defecto gris clarito, pero el usuario puede cambiarlo.
- Cambiar la “#" que aparece en la primera fila de las tablas por “n”
- Vista tabular formatear el valor inicial a los decimales configurados en el problema ...

20-ABR-2022: VERSIÓN 3.42

- Para identificar las ecuaciones, buscar un igual que no esté entre paréntesis. El = puede aparecer dentro de la función if, pero irá entre paréntesis.
- Tamaño de las ecuaciones igual al tamaño del texto.
- Márgenes del papel algo mayores
- Usar el mismo tipo de letra para todo (Times New Roman ?)
- Se añade la función at
- Se coloca la vista tabular en el mismo lado que la página (izq, der., centrado).
- Error cuando el fluido no existe, distinto de problemas con las propiedades
- VOLVER A JAVASCRIPT, TYPESCRIPT complica innecesariamente las cosas.

28-MAR-2022: VERSIÓN 3.41

- Cambiar a create-react-app
  - Se añade Coolprop.js directamente como un script en el html
  - los archivos cls se incluyen con un import en el "index.tsx"
  - Una vez generada la versión build, cambiar en el archivo índex.html las referencias a los archivos "/static/..." por "./static/..."

22-MAR-2022: VERSIÓN 3.40

- Cambio de la librería para las gráficas: Chart.js
- Añadir vista Tabular con lista de componentes (datos, incógnitas, ecuaciones, ...)
- Se añade cabecera con el tipo de componente a los formularios de edición.
- Error en la selección cuando se tiene aplicado un zoom, usar una combinación de e.pageX y la escala.
- Error en el desplazamiento cuando tenemos zoom (propiedad scale de Draggable)
- Color ecuaciones por defecto: #34495E, Color Fluidos: Verde

14-MAR-2022: VERSIÓN 3.37

- Añadir filtro por categoría.
- Permitir selección arrastrando en todas las direcciones
- Poder editar y modificar el nombre y color de las etiquetas.
- Error en la convergencia de incógnitas a 0
- Configuración para notación exponencial y redondeo a 0
- Valores de tablas se guardan en number
- Vaciar el problema antes de volver a la lista
- Valor mínimo 1 en el nº de cifras, 0 da un casque
- Error en "Enviar al fondo", intercambiaba posiciones en lugar de correr el sitio, aparecía con dos imágenes.
- Se añade ctrl + C / V en mayúsculas

3-FEB-2022: VERSION 3.36

-Se eliminan las versiones de escritorio (la aplicación es capaz de funcionar off-line desde el explorador)

- Que el nombre del fluido sea un dato que se pueda cambiar.
  
  - Datos tipo texto (usar " ")
  - Que la combo de los fluidos añadan a la lista todos los datos tipo texto.

- Descargar a archivo sólo los problemas seleccionados

- Posibilidad de escalar el area de la hoja únicamente usando la propiedad css transform:
  
  - transform: scale(300%);
  - transform-origin: left top;
  - Intentar que no afecte a la impresión

- Explorar copiar entre pestañas diferentes:
  
  - Utilizar el clipboard del sistema pasando los objetos a texto
  - Piden permiso al usuario para acceder al portapapeles

- Revisar los atajos de teclado f se activa con se hace ctrl-f, comprobar que ctrl no está pulsado

- mejorada la resolución para problemas tipo hipérbola, se invierte la ecuación, resolviendo 1/(primer_miembro) = 1/(segundo_miembro)

- Hipervínculos dentro de la propia página (ya está usando html <a>)

- Es posible escribir ecuaciones en los textos usando <p> Esto es una ecuación`a = b / c `</p>, requiere que el MathJax esté activo (incluirlo en la carga de textos)

- 18-nov-2021: VERSIÓN 3.35

- Formato de los números grandes/pequeños después de un cambio de unidad es del tipo 2.34 · 10^-8, poner ese valor como elevado es un follón gordo.

- Añadir botón para Activar/Desactivar los elementos seleccionados

- Añadir la energía interna y el volumen específico a las propiedades del fluido

- Error al crear nuevo dato, incógnita ... lo crea más abajo y a la derecha del click

- Cambio de los coloreas por defecto (la ecuación no se distingue del texto)

- Color de los elementos configurable

- Error: el pasoGrid no se guarda entre sesiones

- Eliminar la descripción para datos, ecuaciones e incógnitas nuevos e incógnitas encontradas.

- Seleccionar elementos arrastrando el ratón (de arriba a abajo y de izquierda a derecha

- 6-oct-2021: VERSIÓN 3.34

- Botón de configuración de la pantalla de problemas

- Revisar los márgenes de página

- Tipos de fondo de papel: (blanco, cuadrícula, puntos)

- Colocación del papel (izq, der, centro)

- Colocación de la barra lateral (izq, der)

- Guardar los  valores de configuración de pantalla entre sesiones

- Eliminar la barra lateral, cuando no está nada seleccionado, o sean más de uno los objetos seleccionados.

- Cuando se cambia el tipo de imagen no pone la imagen de ERROR.

- 27-sep-21: VERSIÓN 3.33

- Convertir datos en incógnitas e incógnitas en datos. (botón en el área de edición)

- Añadir cambio de unidad para los datos

- Añadir cambio de unidad para los fluidos y los aires húmedos (Sólo es posible mostrar la unidad final, cuando es una incógnita el proceso de convergencia no obtiene la unidad original)

- Mejorar la gestión de las imágenes cuando no se encuentran que ponga el not found o una imagen de sin conexión

- Gráficas, el título del eje y no sale centrado

- Añadir id a la vista de la tabla

- Check de problemas a la izquierda, permite selección de problema múltiple.

- Doble click sobre el problema de la lista lo edita.

- Autor original: Muestra el e-mail del creador del problema. (En problemas antiguos no muestra nada)

- Valor por defecto del paso de ratón en los problemas nuevos: 12 px

- Barra lateral colapsable

- Notación exponencial para valores muy pequeños (< 1e-3) o muy grandes (> 1e6).

- Nuevas opciones de Remarkable para el markdown, y tipo de letra Times New Roman

- Añadido "shortcut" b para buscar las incógnitas

- 20-jun-21: VERSIÓN 3.32

- Ajuste del ancho de la barra lateral 

- Error: cuando a una ecuación le falta un paréntesis no muestra el error -> Cuando se cambia la ecuación se revisa la ecuación por si tiene errores y se revisan todos los componentes para poner ? En las incógnitas

- Error: Para un fluido dice que existe un error cuando una propiedad depende de una expresión que incluye una incógnita. Por ejemplo (T_E + T_S)/2 y T_S es una incógnita -> Cuando la incógnita no existe da error, en cuanto se creo deja de existir el error

- 20-may-21: VERSIÓN 3.31

- 

- Implementar la opción copiar/pegar (múltiple) y que para pegar pida hacer click 

- Error: Al cargar un problema de la lista no muestra que la imagen tenía un error y que no se puede encontrar... Ahora parece funcionar

- Los errores no se guardan con los componentes al cargarlos desde la lista parecen no tener errores

- Error: Las expresiones de las propiedades del aire no reconocen como variable a otra propiedad del aire definida anteriormente.

- 4-may-21: VERSIÓN 3.30

- Y otras muchas mejoras ...

- Nuevo componente "Gráfica" para realizar gráfica de línea vinculadas a las tablas.

- Botón "exportar a CSV" en las tabla.

- Se añade el botón "encontrar incógnitas" que revisa el problema en busca de nuevas incógnitas añadidas a las ecuaciones.

- Selección múltiple utilizando cmd/ctrl mejorada.

- Movimiento de los componentes discontinuo para facilitar la alineación. En las propiedades de cada problema aparece el campo "Paso de ratón [px]" configurable para cada problema. 

- Nº de cifras significativas personalizables en cada problema

- Edición de las propiedades del problema a través de vínculo en el propio nombre del problema.

- Formato A4 de fondo para simular totalmente el aspecto al imprimir.

- Área lateral de edición fija, cambiando en función del componente seleccionado en el problema

- Versión simplificada de la lista de problemas, la edición de todas las propiedades del problema se pasan al área de trabajo. 

- Reescrito por completo utilizando Typescript y Hookstate, reducción del tamaño y mejora en la velocidad de ejecución

- 20-ene-21: VERSIÓN 3.22

- Error: El Mínimo y máximo están invertidos y parecen no funcionar

- El nº de columnas de una tabla sólo puede ser un número (para no borrar los valores de las columnas)

- 19-nov-20: VERSIÓN 3.21

- No se cambian los valores iniciales en el proceso de chequeo de los Fluidos y Aires

- Los Fluidos o Aires que se pueden calcular se pasan como datos al sistema de resolución de ecuaciones.

- Los diálogos laterales permiten scroll en el problema y no lo sombrean

- Optimización de la resolución para números muy grandes/pequeños

- Se añade el formato exponencial para números grandes

- Error en el formato de números datos mayores de 10^4

- 3-nov-20: VERSIÓN 3.20

- TABLAS. Usando las tablas de Ant Desing

- Para los fluidos y aires cuando se pueda calcular automáticamente su valor, cambiar también su valor inicial y cuando no se pueda volver a poner 1, si no lo cambio el usuario.

- valorInicial, mínimo y máximo deben ser variable interactivas y no usar el getState

- Añadir vínculo a "cuadernodeproblemas.es" en el logo de arriba

- 3-sep-20: VERSIÓN 3.10

- modo off-line activado.

- Importación de archivo de los problemas v2

- Botón "imprimir" directamente eliminando la cabecera y la barra de estado de la impresión

- Importación/exportación v3 corregido error que ponía "null" en las fechas (creación y modificación)

- “Procedente de:” En imágenes “Dirección URL, Google drive, Dropbox, One drive”, donde pone URL poner “Enlace:”
    DROPBOX: 
    Enlace de Dropbox: https://www.dropbox.com/s/tcv6ueytcs6wzbc/Logo%20US.jpg?dl=0
    Enlace para CdP: https://dl.dropboxusercontent.com/s/tcv6ueytcs6wzbc/Logo%20US.jpg
  
    GOOGLE DRIVE:
    Enlace de Google Drive: https://drive.google.com/file/d/0B2ksyEosi5lbMVZBMUJVUFZOZkk/view?usp=sharing
    Enlace para CdP: https://drive.google.com/uc?id=0B2ksyEosi5lbMVZBMUJVUFZOZkk&export=view    
    ONE DRIVE:
    Enlace de One Drive: https://uses0-my.sharepoint.com/:i:/g/personal/jfc_us_es/EdtLsxqvoyVEp-zg8i_cHxABQpehXFkHgH3aj3kzj6ViWQ?e=HFLbnF
    Enlace para CdP: ... No sé como se hace ...

- Añadir Markdown a los textos (remarkable)

- Conversor de unidades para incógnitas (y-1.8 +32)

- Selección múltiple, para las acciones mover (dejar cmd pulsado), borrar, duplicar, enviar al fondo

- Poner bordes a los elementos

- Gestionar que componente está delante y cual detrás

- Error: Los tooltips de los botones salian hacia arriba cuando se hacia scroll en la página

- Procesar la descripción de datos, incógnitas, ecuaciones e imágenes para convertir -> en ➞ y <- en ←, 

- 5-jun-20: VERSIÓN 3.06

- Botón para convertir soluciones en valores iniciales.

- Añadir “dot m” para las expresiones matemáticas , YA ESTABA AÑADIDO, usando “dotm”

- Añadir a las unidades un formateador que convierta ^2, ^3, ^4 y ^5 y el º en los carácteres UTF-8

- Check para poner/quitar la descripción en fluidos y aires, valor por defecto sí

- Añadir nu, beta y alpha a las propiedades de fluidos

- cambiar mensaje de muchas iteraciones por uno que hable de cambiar valores iniciales y límites.

- Cambiar el mensaje de matriz singular 

- ¿Qué ocurre cuando los límites no permiten converger? Arreglado en mates-jfc. Cuando se produce un infinito evaluando perturba el valor inicial y si los comprueba si los límites le dejan converger o no.

- Apertura automática de la edición después de crear.

- Quitar los “:” a la descripción de datos e incógnitas

- 30-abr-20: VERSIÓN 3.05

- Crear nuevos datos, incógnitas, etc … con un número en la descripción.

- Resolver solamente los elementos “activos”

- Añadir “activar” a los datos, las ecuaciones, las incógnitas, los fluidos y aire húmedo.

- Color para datos, incógnitas, fluidos y AireHúmedo

- 24-abr-20: Versión 3.04

- 24-abr-20: Problema con el Timestamp resuelto.

- 24-abr-20: Opción guardar con botón, cuando se calcula o se pide la lista de problemas y se sale de la pestaña.

- 22-abr-20: Versión 3.03

- 22-abre-20: Resuelto: Cuando las incógnitas están en distintas ecuaciones se crean un encima de la otra

- 22-abr-20: Los componentes se crean haciendo click donde se desea colocarlos

- 19-abr-20: pi, e, true y false son constantes y no pueden ser el nombre de datos o incógnitas.

- 19-abr-20: Versión 3.02

- 19-abr-20: Limitar nº de problemas al usuario estándar mostrar (Max. 30)

- 19-abr-20: Cambiar el icono de ir al problema

- 13-abr-20: Versión 3.01

- 13-abr-20: Importación de archivo de los problemas v3 

- 12-abr-20: Exportación a archivo de la versión 3

- 12-abr-20: Exportación a archivo de la versión 2

- 9-abr-20: Arranque sin usuario y con un problema cargado conociendo su id, id=no arranque con problema vacío

- 8-abr-20: Actualización de las reglas para que sólo los usuarios puedan modificar/borrar sus datos.

- 7-abr-20: Informes tras “resolver”

- 4-abr-20: Añadir el alto y el ancho como propiedad de las cajitas para calcular bien la posición de los nuevos componentes.

- 4-abr-20: Copiar problemas entre usuarios

- 2-abr-20: Versión 3.00

- 2-abr-20: Añadir el campo Tipo para los usuarios

- 2-abr-20: Ordenación de la lista de problemas por distintos criterios

- 2-abr-20: Crear nueva categoría / color

- 31-mar-20:  Navegación por teclado: borrar (supr), nuevos (x, y, e, i, t), editar (enter), cambiar entre objetos (tab), ...

- 30-mar-20: Pasar el inicio/registro … etc a página de inicio

- 29-mar-20: Control de teclado, problemas con el stopPropagation

- 26-mar-20: Categorías problemas

- 26-mar-20: Fecha de creación/modificación problemas

- 24-mar-20: Fecha de creación y último acceso de usuarios

- 24-mar-20: Duplicar problemas.

- mar-20:Gestión de usuarios a través de Firebase, Almacenamiento en Firebase

- 26-ago-19: Gestionar el click sobre el espacio vacío para que no seleccione ningún componente.

- 24-ago-19: Implementar la comprobación de que el símbolo del Dato es correcto y que no existe otro igual
