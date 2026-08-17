// Enlace entre un dominio y el estado vivo de la aplicación: qué lista hookstate
// guarda sus estados y cómo se crean o localizan.
//
// Va aparte de procesos/dominios.js —que es el adaptador puro que consume el
// motor— para que el motor siga sin depender de hookstate y se pueda probar sin
// montar la aplicación. Aquí, en cambio, todo es hookstate.
// Ver DOCUMENTACION.md §3.4.
import { listaFluidos, indiceFluido, nuevoFluido } from './listaFluidos';
import { listaAires, indiceAire, nuevoAire } from './listaAires';
import { DOMINIO_POR_DEFECTO } from './procesos/dominios';

const LISTAS = {
  fluido: { lista: listaFluidos, indice: indiceFluido, nuevoEstado: nuevoFluido },
  aire: { lista: listaAires, indice: indiceAire, nuevoEstado: nuevoAire }
};

export function getListaDominio(clave) {
  return LISTAS[clave] ?? LISTAS[DOMINIO_POR_DEFECTO];
}

// Los estados del dominio, ya desenvueltos: es la forma en que los quieren tanto
// el motor como los componentes.
export function estadosDominio(clave) {
  return getListaDominio(clave).lista.get({ noproxy: true });
}

/**
 * A qué dominio pertenece un estado, buscándolo en las listas.
 *
 * Los ids ya van prefijados ("f1", "a1") y bastaría con mirar la letra, pero
 * buscarlo de verdad no cuesta nada y no ata el dominio a una convención de
 * nombres que existe por otro motivo.
 */
export function dominioDeEstado(id) {
  const encontrado = Object.entries(LISTAS).find(
    ([, { lista }]) => lista.get({ noproxy: true }).some((estado) => estado.id === id)
  );
  return encontrado ? encontrado[0] : null;
}
