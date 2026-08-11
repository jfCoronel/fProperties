import { hookstate } from '@hookstate/core';

const configuracionInicial = {
  menuActual: "fluidos",
  version: __APP_VERSION__,
  idFluidoActual: null,
  idAireActual: null,
  columnasTablaFluidos: ["X", "RO", "H", "S", "CP", "NO", "NO"],
  columnasTablaAires: ["RO", "HR", "TH", "TR", "H", "NO", "NO"],
  verConfiguracion: false,
  nCifras: 4,
  idioma: "es",
  textosUI: {},
  textosCargados: false,
  verPsicrometrico: false,
  opcionPsicrometrico: "A",
  valorOpcionPsicrometrico: 0,
  opcionAddDatosPsicrometrico: "todos",
  ejeXmaxPsicrometrico: 50,
  ejeXminPsicrometrico: 0,
  ejeYmaxPsicrometrico: 50,
  ejeYminPsicrometrico: 0,
  verDialogoFluido: false,
  verDialogoAire: false,
  // "ninguno" = sin diagrama: el desplegable de tipo hace de interruptor, así que
  // no hace falta un botón aparte para mostrarlo u ocultarlo.
  tipoDiagrama: "ninguno",
  fluidoDiagrama: "Agua",
  colorDatos: "#0000FF",
  lineaDatos: false,
  nombreDatos: false,
  airesSeleccionados: [],
  fluidosSeleccionados: [],
  idProcesoActual: null,
  verDialogoProceso: false,
  procesosSeleccionados: []
}

export const configuracion = hookstate(configuracionInicial);

export async function cargarTextosUI() {
  const url = './json/' + configuracion.idioma.get() + '.json'
  const respuesta = await fetch(url)
  const respuestaJson = await respuesta.json()
  configuracion.textosUI.set(respuestaJson);
  configuracion.textosCargados.set(true);
}

export function getTextoUI(key, textos = configuracion.textosUI) {
  const elemento = textos[key]
  if (elemento === undefined) {
    return "__";
  } else {
    return elemento.get()
  }
}

// Descargar tabla como CSV
export async function descargarTablaCSV(columnas, valores, nombreFichero = "Tabla.csv") {
  let contenidoCSV = "";
  let fila = ""
  columnas.forEach((objetoCol) => {
    if (objetoCol.key !== "accion") {
      fila += objetoCol.title.replace("<br>", "") + ",";
    }
  })
  contenidoCSV += fila + "\r\n";
  valores.forEach((objetoVal) => {
    fila = ""
    for (const key in objetoVal) {
      if (key !== "key") {
        fila += objetoVal[key] + ",";
      }
    }
    contenidoCSV += fila + "\r\n";
  })

  // Escribirlos
  let dataStr = "data:text/csv;charset=utf-8," + encodeURI(contenidoCSV);
  let downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", nombreFichero);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}







