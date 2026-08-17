import { hookstate, none } from '@hookstate/core';
import { getObjetoAireHumedo } from './propFluidos/aires'
import { getTextoUI } from './configuracion';

export const listaAires = hookstate([]);

const PREFIJO_ID = "a";

// El id se deriva del máximo en uso, de modo que siga siendo único
// tras cargar una lista completa (permalink, importación).
function nuevoIdAire() {
  let maximo = 0;
  listaAires.get({ noproxy: true }).forEach(aire => {
    const numero = parseInt(String(aire.id).slice(PREFIJO_ID.length), 10);
    if (Number.isFinite(numero) && numero > maximo) {
      maximo = numero;
    }
  });
  return PREFIJO_ID + (maximo + 1);
}

// Devuelve -1 si el id ya no existe (estado borrado)
export const indiceAire = (id) => {
  return listaAires.get({ noproxy: true }).findIndex(aire => aire.id === id);
}

// Devuelve el id del estado creado: el modo calculado necesita apuntar a él
// nada más crearlo.
export const nuevoAire = () => {
  const objetoAire = getObjetoAireHumedo('A', 0, 'T', 25, 'HR', 50);
  const aireNuevo = {
    id: nuevoIdAire(),
    nombre: nuevoNombreAire(),
    in1Id: "A",
    in2Id: "T",
    in3Id: "HR",
    in1Val: 0,
    in2Val: 25,
    in3Val: 50,
    // Un estado nuevo se dibuja: ocultarlo es la excepción, no la norma.
    enDiagrama: true,
    ...objetoAire
  };
  listaAires.merge([aireNuevo])
  return aireNuevo.id;
}

export const borrarAires = (ids) => {
  const indices = ids.map(indiceAire).filter(i => i >= 0);
  indices.sort(function (a, b) { // ordenarlos al reves
    return b - a;
  });
  indices.forEach(i => { listaAires[i].set(none); })
}

export const duplicarAires = (ids) => {
  ids.forEach(id => {
    const i = indiceAire(id);
    if (i < 0) return;
    let nuevoAire = { ...listaAires[i].get({ noproxy: true }) };
    nuevoAire.id = nuevoIdAire();
    nuevoAire.nombre = nuevoAire.nombre + getTextoUI("copia_de");
    listaAires.merge([nuevoAire]);
  })
}

export const actualizarAire = (id, aire) => {
  const i = indiceAire(id);
  if (i < 0) return;
  const objetoAire = getObjetoAireHumedo(aire.in1Id, aire.in1Val, aire.in2Id, aire.in2Val, aire.in3Id, aire.in3Val);
  // El diálogo solo trae las entradas del estado, así que se escribe encima del
  // anterior: lo que no edita (la visibilidad en el diagrama) se conserva.
  const anterior = listaAires[i].get({ noproxy: true });
  const aireCompleto = { ...anterior, ...aire, ...objetoAire, id }
  listaAires[i].set(aireCompleto);
}

// Visibilidad en el diagrama. Es una propiedad del estado, no de la sesión: se
// duplica con él, se borra con él y viaja en el enlace compartido.
export const verAiresEnDiagrama = (ids, valor) => {
  ids.forEach(id => {
    const i = indiceAire(id);
    if (i >= 0) {
      listaAires[i].merge({ enDiagrama: valor });
    }
  })
}

export const reordenarAires = (fromIndex, toIndex) => {
  // Obtener una copia profunda de los valores actuales
  const listaActual = JSON.parse(JSON.stringify(listaAires.get()));
  const [elementoMovido] = listaActual.splice(fromIndex, 1);
  listaActual.splice(toIndex, 0, elementoMovido);
  listaAires.set(listaActual);
}

function nuevoNombreAire() {
  let i = 1;
  do {
    let nuevoNombre = getTextoUI("nuevo_aire") + i;
    if (listaAires.find(aire => aire.nombre.get() === nuevoNombre)) { // encontrado
      i++;
    } else {
      return nuevoNombre;
    }
  } while (true);
}
