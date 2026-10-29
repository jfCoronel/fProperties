// Ejemplos con nombre: un enlace corto (#ex=r134a-cycle) que se puede citar en un
// artículo o en un enunciado impreso, donde un permalink de cientos de caracteres
// no cabe. Son problemas en el mismo formato que el permalink, empaquetados con la
// aplicación y no en un servidor, así que también funcionan sin conexión.
// Añadir uno es dejar su JSON en ejemplos/. Ver DOCUMENTACION.md §2.5.
const ficheros = import.meta.glob('./ejemplos/*.json', { eager: true, import: 'default' });

export const CLAVE_EJEMPLO = 'ex';

export const EJEMPLOS = Object.fromEntries(
  Object.entries(ficheros).map(([ruta, problema]) => [ruta.replace(/^.*\/(.+)\.json$/, '$1'), problema])
);

// Copia: aplicarProblema no debe poder alterar el ejemplo empaquetado.
export function getEjemplo(nombre) {
  if (!Object.hasOwn(EJEMPLOS, nombre)) {
    throw new Error('error_ejemplo_desconocido');
  }
  return structuredClone(EJEMPLOS[nombre]);
}
