import { hookstate } from '@hookstate/core';

const configuracionInicial = {
  menuActual: "fluidos",
  version: "1.2.0",
  iFluidoActual: -1,
  iAireActual: -1,
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
  verDialogoFluido: false,
  verDialogoAire: false
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






