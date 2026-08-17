import { hookstate, none } from '@hookstate/core';
import { estadosDominio } from '../listasDominio';
import { DOMINIO_POR_DEFECTO } from './dominios';
import {
  getDefiniciones, getDefinicion, getParametrosPorDefecto, puedeCalcular
} from './proceso';
import { detectarTipo } from './deteccion';

export const listaProcesos = hookstate([]);

const PREFIJO_ID = "p";

// Paleta para que dos procesos consecutivos no salgan del mismo color en el diagrama.
const COLORES = ['#1890FF', '#F5222D', '#52C41A', '#FA8C16', '#722ED1', '#13C2C2'];

// Mismo criterio que en los estados: el id se deriva del máximo en uso, para que
// siga siendo único tras cargar una lista completa (permalink, importación).
function nuevoIdProceso() {
  let maximo = 0;
  listaProcesos.get({ noproxy: true }).forEach(proceso => {
    const numero = parseInt(String(proceso.id).slice(PREFIJO_ID.length), 10);
    if (Number.isFinite(numero) && numero > maximo) {
      maximo = numero;
    }
  });
  return PREFIJO_ID + (maximo + 1);
}

// Devuelve -1 si el id ya no existe
export const indiceProceso = (id) => {
  return listaProcesos.get({ noproxy: true }).findIndex(proceso => proceso.id === id);
}

// Procesos que referencian un estado dado. La especificación pide NO borrar en
// cascada: esto sirve para avisar y para la selección sincronizada.
export const procesosDeEstado = (idEstado) => {
  return listaProcesos.get({ noproxy: true }).filter(
    proceso => proceso.origenes.includes(idEstado) || proceso.destino === idEstado
  );
}

// Las dos direcciones de la incidencia estado ↔ proceso, que es lo que sostiene
// la selección sincronizada.
export const idsProcesosDeEstados = (idsEstados) => {
  const buscados = new Set(idsEstados);
  return listaProcesos.get({ noproxy: true })
    .filter(proceso => proceso.origenes.some(id => buscados.has(id)) || buscados.has(proceso.destino))
    .map(proceso => proceso.id);
}

export const idsEstadosDeProcesos = (idsProcesos) => {
  const buscados = new Set(idsProcesos);
  const estados = new Set();
  listaProcesos.get({ noproxy: true }).forEach(proceso => {
    if (!buscados.has(proceso.id)) return;
    proceso.origenes.forEach(id => { if (id !== null) estados.add(id); });
    if (proceso.destino !== null) estados.add(proceso.destino);
  });
  return [...estados];
}

export const nuevoProceso = (idOrigen = null, idDestino = null, dominio = DOMINIO_POR_DEFECTO) => {
  // Naciendo de dos estados ya elegidos, el tipo que encaja es mejor punto de
  // partida que el primero de la lista. Es solo el valor inicial: se cambia en
  // el diálogo como cualquier otro.
  const estados = estadosDominio(dominio);
  const buscar = (id) => estados.find(estado => estado.id === id) ?? null;
  const detectado = getDefinicion(detectarTipo(buscar(idOrigen), buscar(idDestino), dominio));
  const definicion = detectado ?? getDefiniciones(dominio)[0];

  const nProcesos = listaProcesos.get({ noproxy: true }).length;

  const procesoNuevo = {
    id: nuevoIdProceso(),
    origenes: Array.from(
      { length: definicion.aridad.origenes }, (_, n) => (n === 0 ? idOrigen : null)
    ),
    destino: idDestino,
    tipo: definicion.clave,
    modoDestino: "manual",
    parametros: getParametrosPorDefecto(definicion),
    // Un proceso nuevo se dibuja: ocultarlo es la excepción, no la norma.
    enDiagrama: true,
    estilo: {
      color: COLORES[nProcesos % COLORES.length],
      grosor: 2,
      trazo: "solid"
    }
  };
  listaProcesos.merge([procesoNuevo]);
}

export const borrarProcesos = (ids) => {
  const indices = ids.map(indiceProceso).filter(i => i >= 0);
  indices.sort(function (a, b) { // ordenarlos al reves
    return b - a;
  });
  indices.forEach(i => { listaProcesos[i].set(none); })
}

export const duplicarProcesos = (ids) => {
  ids.forEach(id => {
    const i = indiceProceso(id);
    if (i < 0) return;
    const copia = { ...listaProcesos[i].get({ noproxy: true }) };
    copia.id = nuevoIdProceso();
    copia.origenes = [...copia.origenes];
    copia.parametros = { ...copia.parametros };
    copia.estilo = { ...copia.estilo };
    listaProcesos.merge([copia]);
  })
}

// Visibilidad en el diagrama, igual que en los estados: propiedad del proceso, no
// de la sesión. Se decide aparte de la de sus extremos, para que ocultar un punto
// no borre la curva que llega hasta él.
export const verProcesosEnDiagrama = (ids, valor) => {
  ids.forEach(id => {
    const i = indiceProceso(id);
    if (i >= 0) {
      listaProcesos[i].merge({ enDiagrama: valor });
    }
  })
}

export const actualizarProceso = (id, proceso) => {
  const i = indiceProceso(id);
  if (i < 0) return;
  listaProcesos[i].set({ ...proceso, id });
}

/**
 * Cambia el tipo de un proceso conservando lo que siga teniendo sentido.
 *
 * Vive aquí, y no en el diálogo, porque el cambio se ofrece desde dos sitios: el
 * desplegable del editor y el aviso de la tabla ("encaja con isentálpico"). El
 * tipo nuevo puede no saber calcular su destino, y en ese caso el proceso vuelve
 * a modo manual en vez de quedarse en un modo que no haría nada.
 *
 * No propaga: de eso se encarga quien llama, que es quien sabe si hay más
 * cambios en camino.
 */
export const cambiarTipoProceso = (id, clave) => {
  const i = indiceProceso(id);
  if (i < 0) return;

  const proceso = listaProcesos[i].get({ noproxy: true });
  const definicion = getDefinicion(clave);
  if (!definicion) return;

  const modoDestino = (proceso.modoDestino === 'calculado' && !puedeCalcular(definicion))
    ? 'manual'
    : proceso.modoDestino;

  // No todos los tipos conectan el mismo número de estados: la mezcla adiabática
  // toma dos. Al cambiar de tipo se ajusta la lista de orígenes a la aridad
  // nueva —rellenando con huecos o recortando— para que el proceso no quede
  // inválido por una razón que el usuario no ha elegido.
  const aridad = definicion.aridad.origenes;
  const origenes = Array.from({ length: aridad }, (_, n) => proceso.origenes[n] ?? null);

  listaProcesos[i].set({
    ...proceso,
    tipo: clave,
    modoDestino,
    origenes,
    parametros: {
      ...getParametrosPorDefecto(definicion, modoDestino),
      ...proceso.parametros
    }
  });
}
