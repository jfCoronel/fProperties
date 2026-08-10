// Puente entre el formato serializado (formato.js) y el estado vivo de la
// aplicación: lee las tres listas hookstate para construir el problema, y las
// reemplaza al cargar uno. Ver DOCUMENTACION.md §2.
import { configuracion } from '../configuracion';
import { listaFluidos } from '../listaFluidos';
import { listaAires } from '../listaAires';
import { listaProcesos } from '../procesos/listaProcesos';
import { propagarProcesos } from '../procesos/propagacion';
import { getObjetoFluido, esperarCoolprop } from '../propFluidos/fluidos';
import { getObjetoAireHumedo } from '../propFluidos/aires';
import {
  ESQUEMA_PROBLEMA,
  CLAVE_HASH,
  CLAVES_CONFIGURACION,
  codificarProblema,
  decodificarProblema,
  normalizarProblema
} from './formato';

// Un enlace deja de ser cómodo de pegar mucho antes de tocar el límite del
// navegador; a partir de aquí conviene sugerir la descarga del JSON.
export const LONGITUD_ENLACE_COMODA = 4000;

// De un estado solo se guardan las entradas: el resto son propiedades derivadas
// que CoolProp recalcula al cargar. Un problema de diez estados cabe así en un
// enlace corto, y el fichero no envejece si cambia el conjunto de propiedades.
export function serializarProblema() {
  const estados = listaFluidos.get({ noproxy: true }).map((estado) => ({
    id: estado.id,
    nombre: estado.nombre,
    fluido: estado.fluido,
    in1Id: estado.in1Id,
    in1Val: estado.in1Val,
    in2Id: estado.in2Id,
    in2Val: estado.in2Val
  }));

  const aires = listaAires.get({ noproxy: true }).map((estado) => ({
    id: estado.id,
    nombre: estado.nombre,
    in1Id: estado.in1Id,
    in1Val: estado.in1Val,
    in2Id: estado.in2Id,
    in2Val: estado.in2Val,
    in3Id: estado.in3Id,
    in3Val: estado.in3Val
  }));

  const ajustes = {};
  CLAVES_CONFIGURACION.forEach((clave) => {
    ajustes[clave] = configuracion[clave].get({ noproxy: true });
  });

  return {
    v: ESQUEMA_PROBLEMA,
    estados,
    aires,
    procesos: listaProcesos.get({ noproxy: true }),
    configuracion: ajustes
  };
}

/**
 * Reemplaza el contenido de la aplicación por el del problema dado.
 *
 * Sustituye en lugar de fusionar: un enunciado compartido tiene que verse igual
 * en el navegador de quien lo recibe, sin mezclarse con lo que tuviera abierto.
 * Requiere CoolProp listo, porque recalcula todas las propiedades.
 */
export function aplicarProblema(datos) {
  const problema = normalizarProblema(datos);

  listaFluidos.set(problema.estados.map((estado) => ({
    ...estado,
    ...getObjetoFluido(estado.fluido, estado.in1Id, estado.in1Val, estado.in2Id, estado.in2Val)
  })));

  listaAires.set(problema.aires.map((estado) => ({
    ...estado,
    ...getObjetoAireHumedo(
      estado.in1Id, estado.in1Val, estado.in2Id, estado.in2Val, estado.in3Id, estado.in3Val
    )
  })));

  listaProcesos.set(problema.procesos);

  Object.entries(problema.configuracion).forEach(([clave, valor]) => {
    configuracion[clave].set(valor);
  });

  // El estado de sesión no viaja en el enlace, pero sí puede quedar apuntando a
  // ids que ya no existen.
  configuracion.merge({
    idFluidoActual: null,
    idAireActual: null,
    idProcesoActual: null,
    fluidosSeleccionados: [],
    airesSeleccionados: [],
    procesosSeleccionados: [],
    verDialogoFluido: false,
    verDialogoAire: false,
    verDialogoProceso: false
  });

  // La marca de "estado calculado" no viaja en el enlace: se vuelve a deducir de
  // los procesos, que sí viajan con su modoDestino.
  propagarProcesos();

  return problema;
}

export function textoProblemaJSON() {
  return JSON.stringify(serializarProblema(), null, 2);
}

export async function getEnlaceProblema() {
  const carga = await codificarProblema(serializarProblema());
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#${CLAVE_HASH}=${carga}`;
}

// Deja el enlace en la barra de direcciones sin recargar ni empujar una entrada
// nueva al historial.
export function fijarHash(enlace) {
  const hash = enlace.slice(enlace.indexOf('#'));
  window.history.replaceState(null, '', hash);
}

function getCargaDelHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith(`${CLAVE_HASH}=`)) return null;
  const carga = hash.slice(CLAVE_HASH.length + 1);
  return carga.length > 0 ? carga : null;
}

/**
 * Carga el problema del fragmento de la URL, si lo hay.
 *
 * Devuelve el problema aplicado, o null si no había permalink. Propaga el error
 * (con clave i18n) si el enlace es ilegible o de otra versión del formato.
 */
export async function cargarDesdePermalink() {
  const carga = getCargaDelHash();
  if (carga === null) return null;

  const problema = await decodificarProblema(carga);
  await esperarCoolprop();
  return aplicarProblema(problema);
}

export async function cargarProblemaJSON(texto) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('error_problema_ilegible');
  }
  await esperarCoolprop();
  return aplicarProblema(datos);
}

export function descargarProblema() {
  const contenido = 'data:application/json;charset=utf-8,' + encodeURIComponent(textoProblemaJSON());
  const enlace = document.createElement('a');
  enlace.setAttribute('href', contenido);
  enlace.setAttribute('download', 'problema.json');
  document.body.appendChild(enlace); // required for firefox
  enlace.click();
  enlace.remove();
}
