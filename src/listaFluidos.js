import { hookstate, none } from '@hookstate/core';
import { getObjetoFluido } from './propFluidos/fluidos'
import { getTextoUI } from './configuracion';

export const listaFluidos = hookstate([]);

const PREFIJO_ID = "f";

// El id se deriva del máximo en uso, de modo que siga siendo único
// tras cargar una lista completa (permalink, importación).
function nuevoIdFluido() {
  let maximo = 0;
  listaFluidos.get({ noproxy: true }).forEach(fluido => {
    const numero = parseInt(String(fluido.id).slice(PREFIJO_ID.length), 10);
    if (Number.isFinite(numero) && numero > maximo) {
      maximo = numero;
    }
  });
  return PREFIJO_ID + (maximo + 1);
}

// Devuelve -1 si el id ya no existe (estado borrado)
export const indiceFluido = (id) => {
  return listaFluidos.get({ noproxy: true }).findIndex(fluido => fluido.id === id);
}

export const nuevoFluido = () => {
  const objetoFluido = getObjetoFluido('Agua', 'T', 25, 'P', 101.325);

  const fluidoNuevo = {
    id: nuevoIdFluido(),
    nombre: nuevoNombreFluido(),
    fluido: "Agua",
    in1Id: "T",
    in2Id: "P",
    in1Val: 25.0,
    in2Val: 101.325,
    ...objetoFluido
  };
  listaFluidos.merge([fluidoNuevo])
}

export const borrarFluidos = (ids) => {
  const indices = ids.map(indiceFluido).filter(i => i >= 0);
  indices.sort(function (a, b) { // ordenarlos al reves
    return b - a;
  });
  indices.forEach(i => { listaFluidos[i].set(none); })
}

export const duplicarFluidos = (ids) => {
  ids.forEach(id => {
    const i = indiceFluido(id);
    if (i < 0) return;
    let nuevoFluido = { ...listaFluidos[i].get({ noproxy: true }) };
    nuevoFluido.id = nuevoIdFluido();
    nuevoFluido.nombre = nuevoFluido.nombre + getTextoUI("copia_de");
    listaFluidos.merge([nuevoFluido]);
  })
}


export const actualizarFluido = (id, fluido) => {
  const i = indiceFluido(id);
  if (i < 0) return;
  const objetoFluido = getObjetoFluido(fluido.fluido, fluido.in1Id, fluido.in1Val, fluido.in2Id, fluido.in2Val);
  const fluidoCompleto = { ...fluido, ...objetoFluido, id }
  listaFluidos[i].set(fluidoCompleto);
}

export const reordenarFluidos = (fromIndex, toIndex) => {
  // Obtener una copia profunda de los valores actuales
  const listaActual = JSON.parse(JSON.stringify(listaFluidos.get()));
  const [elementoMovido] = listaActual.splice(fromIndex, 1);
  listaActual.splice(toIndex, 0, elementoMovido);
  listaFluidos.set(listaActual);
}

function nuevoNombreFluido() {
  let i = 1;
  do {
    let nuevoNombre = getTextoUI("nuevo_fluido") + i;
    if (listaFluidos.find(fluido => fluido.nombre.get() === nuevoNombre)) { // encontrado
      i++;
    } else {
      return nuevoNombre;
    }
  } while (true);
}
