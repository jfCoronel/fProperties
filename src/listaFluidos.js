import { hookstate, none } from '@hookstate/core';
import { getObjetoFluido } from './propFluidos/fluidos'
import { getTextoUI } from './configuracion';

export const listaFluidos = hookstate([]);

export const nuevoFluido = () => {
  const objetoFluido = getObjetoFluido('Agua', 'T', 25, 'P', 101.325);

  const fluidoNuevo = {
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

export const borrarFluidos = (lista) => {
  lista.sort(function (a, b) { // oredenarlos al reves
    return b - a;
  });
  lista.forEach(i => { listaFluidos[i].set(none); })
}

export const duplicarFluidos = (lista) => {
  lista.forEach(i => {
    let nuevoFluido = Object.assign({}, listaFluidos[i].get());
    nuevoFluido.nombre = nuevoFluido.nombre + getTextoUI("copia_de");
    listaFluidos.merge([nuevoFluido]);
  })
}


export const actualizarFluido = (i, fluido) => {
  const objetoFluido = getObjetoFluido(fluido.fluido, fluido.in1Id, fluido.in1Val, fluido.in2Id, fluido.in2Val);
  const fluidoCompleto = { ...fluido, ...objetoFluido }
  listaFluidos[i].set(fluidoCompleto);
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



