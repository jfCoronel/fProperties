// Modo calculado: los procesos que generan su estado destino lo recalculan
// aquí, en orden topológico. El orden y la física viven en proceso.js y en los
// resolvedores; este módulo solo los aplica sobre el estado vivo.
// Ver DOCUMENTACION.md §1.5 y §3.4.
import { none } from '@hookstate/core';
import { getListaDominio, dominioDeEstado } from '../listasDominio';
import { getDominio, CLAVES_DOMINIO } from './dominios';
import { listaProcesos, indiceProceso } from './listaProcesos';
import { planificarPropagacion, parejaDestino, dominioDeProceso } from './proceso';

// Un estado generado se marca con el proceso que lo genera. La marca no viaja en
// el permalink: se vuelve a deducir de los procesos al propagar.
const MARCA = 'derivadoDe';

function sinMarca(estado) {
  if (estado[MARCA] === undefined) return estado;
  const copia = { ...estado };
  delete copia[MARCA];
  return copia;
}

/**
 * Aplica sobre la lista de un dominio los procesos que generan en él.
 *
 * Sustituye la lista solo si algo ha cambiado: la propagación es determinista,
 * así que volver a lanzarla sobre el mismo problema no dispara otro render.
 */
function propagarDominio(clave, procesos) {
  const { lista } = getListaDominio(clave);
  const dominio = getDominio(clave);
  const anteriores = lista.get({ noproxy: true });

  let estados = anteriores;
  const generados = new Set();

  procesos.forEach((proceso) => {
    const origenes = proceso.origenes.map((id) => estados.find((estado) => estado.id === id));
    const actual = estados.find((estado) => estado.id === proceso.destino);
    if (!actual || origenes.some((origen) => origen === undefined)) return;

    const entradas = parejaDestino(proceso, origenes);
    if (entradas === null) return;

    const generado = {
      ...sinMarca(actual),
      ...dominio.identidad(origenes[0]),
      ...entradas,
      ...dominio.construir(entradas, origenes[0]),
      [MARCA]: proceso.id
    };
    estados = estados.map((estado) => (estado.id === generado.id ? generado : estado));
    generados.add(generado.id);
  });

  // Un estado deja de ser derivado en cuanto su proceso deja de generarlo (ha
  // pasado a manual, se ha borrado o ha quedado como arista de cierre).
  estados = estados.map((estado) => (generados.has(estado.id) ? estado : sinMarca(estado)));

  if (JSON.stringify(estados) !== JSON.stringify(anteriores)) {
    lista.set(estados);
  }
  return generados.size;
}

/**
 * Recalcula todos los estados generados por procesos en modo calculado.
 *
 * El orden topológico se planifica sobre la lista COMPLETA de procesos, que es
 * una sola para los dos dominios; el reparto por dominio viene después y solo
 * decide en qué lista se escribe. Hacerlo al revés —planificar por separado—
 * daría el mismo resultado hoy, pero rompería en cuanto un problema encadenara
 * los dos dominios.
 *
 * Devuelve el número de estados regenerados.
 */
export function propagarProcesos() {
  const { orden } = planificarPropagacion(listaProcesos.get({ noproxy: true }));

  return CLAVES_DOMINIO.reduce((total, clave) => total + propagarDominio(
    clave, orden.filter((proceso) => dominioDeProceso(proceso) === clave)
  ), 0);
}

export function esDerivado(estado) {
  return estado?.[MARCA] !== undefined;
}

/**
 * Rompe el vínculo de un estado calculado con el proceso que lo generó.
 *
 * Editar a mano un estado calculado no se bloquea, devuelve
 * el proceso a modo manual y avisa. Bloquear la edición es más simple, pero deja
 * al usuario sin salida delante de un valor que quiere tocar.
 *
 * Devuelve el proceso que ha pasado a manual, o null si el estado no era
 * derivado.
 */
export function romperVinculo(idEstado) {
  const clave = dominioDeEstado(idEstado);
  if (clave === null) return null;

  const { lista, indice } = getListaDominio(clave);
  const estado = lista.get({ noproxy: true }).find((e) => e.id === idEstado);
  if (!esDerivado(estado)) return null;

  // El id se guarda antes de borrar la marca: con noproxy, el objeto que
  // devuelve hookstate es el de dentro, y quitar la propiedad lo cambia.
  const idProceso = estado[MARCA];

  const iEstado = indice(idEstado);
  if (iEstado >= 0) {
    lista[iEstado][MARCA].set(none);
  }

  const iProceso = indiceProceso(idProceso);
  if (iProceso < 0) return null;

  const proceso = listaProcesos[iProceso].get({ noproxy: true });
  listaProcesos[iProceso].merge({ modoDestino: 'manual' });
  return proceso;
}
