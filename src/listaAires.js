import { hookstate, none } from '@hookstate/core';
import { getObjetoAireHumedo } from './propFluidos/aires'
import { getTextoUI } from './configuracion';

export const listaAires = hookstate([]);

export const nuevoAire = () => {
  const objetoAire = getObjetoAireHumedo('A', 0, 'T', 25, 'HR', 50);
  const aireNuevo = {
    nombre: nuevoNombreAire(),
    in1Id: "A",
    in2Id: "T",
    in3Id: "HR",
    in1Val: 0,
    in2Val: 25,
    in3Val: 50,
    ...objetoAire
  };
  listaAires.merge([aireNuevo])
}

export const borrarAires = (lista) => {
  lista.sort(function (a, b) { // oredenarlos al reves
    return b - a;
  });
  lista.forEach(i => { listaAires[i].set(none); })
}

export const duplicarAires = (lista) => {
  lista.forEach(i => {
    let nuevoAire = Object.assign({}, listaAires[i].get());
    nuevoAire.nombre = nuevoAire.nombre + getTextoUI("copia_de");
    listaAires.merge([nuevoAire]);
  })
}

export const actualizarAire = (i, aire) => {
  const objetoAire = getObjetoAireHumedo(aire.in1Id, aire.in1Val, aire.in2Id, aire.in2Val, aire.in3Id, aire.in3Val);
  const aireCompleto = { ...aire, ...objetoAire }
  listaAires[i].set(aireCompleto);
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



