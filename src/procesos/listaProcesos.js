import { hookstate, none } from '@hookstate/core';
import { getDefiniciones, getParametrosPorDefecto } from './proceso';

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
// cascada: esto sirve para avisar y, en F5, para la selección sincronizada.
export const procesosDeEstado = (idEstado) => {
  return listaProcesos.get({ noproxy: true }).filter(
    proceso => proceso.origenes.includes(idEstado) || proceso.destino === idEstado
  );
}

export const nuevoProceso = (idOrigen = null, idDestino = null) => {
  const definicion = getDefiniciones('fluido')[0];
  const nProcesos = listaProcesos.get({ noproxy: true }).length;

  const procesoNuevo = {
    id: nuevoIdProceso(),
    origenes: [idOrigen],
    destino: idDestino,
    tipo: definicion.clave,
    modoDestino: "manual",
    parametros: getParametrosPorDefecto(definicion),
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

export const actualizarProceso = (id, proceso) => {
  const i = indiceProceso(id);
  if (i < 0) return;
  listaProcesos[i].set({ ...proceso, id });
}
