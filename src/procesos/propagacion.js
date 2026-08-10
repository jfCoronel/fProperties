// Modo calculado (F6): los procesos que generan su estado destino lo recalculan
// aquí, en orden topológico. El orden y la física viven en proceso.js y en los
// resolvedores; este módulo solo los aplica sobre el estado vivo.
// Ver PLAN-PROCESOS.md §1.4 y §F6.
import { none } from '@hookstate/core';
import { listaFluidos, indiceFluido } from '../listaFluidos';
import { listaProcesos, indiceProceso } from './listaProcesos';
import { getObjetoFluido } from '../propFluidos/fluidos';
import { planificarPropagacion, parejaDestino } from './proceso';

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
 * Recalcula todos los estados generados por procesos en modo calculado.
 *
 * Sustituye la lista de estados solo si algo ha cambiado: la propagación es
 * determinista, así que volver a lanzarla sobre el mismo problema no dispara
 * otro render. Devuelve el número de estados regenerados.
 */
export function propagarProcesos() {
  const { orden } = planificarPropagacion(listaProcesos.get({ noproxy: true }));
  const anteriores = listaFluidos.get({ noproxy: true });

  let estados = anteriores;
  const generados = new Set();

  orden.forEach((proceso) => {
    const origenes = proceso.origenes.map((id) => estados.find((estado) => estado.id === id));
    const actual = estados.find((estado) => estado.id === proceso.destino);
    if (!actual || origenes.some((origen) => origen === undefined)) return;

    const pareja = parejaDestino(proceso, origenes);
    if (pareja === null) return;

    const fluido = origenes[0].fluido;
    const generado = {
      ...sinMarca(actual),
      fluido,
      ...pareja,
      ...getObjetoFluido(fluido, pareja.in1Id, pareja.in1Val, pareja.in2Id, pareja.in2Val),
      [MARCA]: proceso.id
    };
    estados = estados.map((estado) => (estado.id === generado.id ? generado : estado));
    generados.add(generado.id);
  });

  // Un estado deja de ser derivado en cuanto su proceso deja de generarlo (ha
  // pasado a manual, se ha borrado o ha quedado como arista de cierre).
  estados = estados.map((estado) => (generados.has(estado.id) ? estado : sinMarca(estado)));

  if (JSON.stringify(estados) !== JSON.stringify(anteriores)) {
    listaFluidos.set(estados);
  }
  return generados.size;
}

export function esDerivado(estado) {
  return estado?.[MARCA] !== undefined;
}

/**
 * Rompe el vínculo de un estado calculado con el proceso que lo generó.
 *
 * Decisión 4 del plan: editar a mano un estado calculado no se bloquea, devuelve
 * el proceso a modo manual y avisa. Bloquear la edición es más simple, pero deja
 * al usuario sin salida delante de un valor que quiere tocar.
 *
 * Devuelve el proceso que ha pasado a manual, o null si el estado no era
 * derivado.
 */
export function romperVinculo(idEstado) {
  const estado = listaFluidos.get({ noproxy: true }).find((e) => e.id === idEstado);
  if (!esDerivado(estado)) return null;

  // El id se guarda antes de borrar la marca: con noproxy, el objeto que
  // devuelve hookstate es el de dentro, y quitar la propiedad lo cambia.
  const idProceso = estado[MARCA];

  const iEstado = indiceFluido(idEstado);
  if (iEstado >= 0) {
    listaFluidos[iEstado][MARCA].set(none);
  }

  const iProceso = indiceProceso(idProceso);
  if (iProceso < 0) return null;

  const proceso = listaProcesos[iProceso].get({ noproxy: true });
  listaProcesos[iProceso].merge({ modoDestino: 'manual' });
  return proceso;
}
