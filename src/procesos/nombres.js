// Nombre que se propone para el estado destino que crea un proceso calculado.
// Puro: recibe los nombres y no toca las listas, para poder probarlo sin montar
// la aplicación.

// Un número con lo que vaya delante y detrás: "1", "3a", "Fluido 2", "T1'".
const CON_NUMERO = /^(.*?)(\d+)(\D*)$/;

/**
 * El nombre que seguiría a los de los orígenes, libre entre los existentes.
 *
 * Si algún origen lleva número, se toma el mayor y se incrementa conservando lo
 * que lo rodea ("3a" → "4a"); así, en la mezcla, el destino sigue al último de
 * los dos. Si ninguno lo lleva, se marca el primero con una prima ("A" → "A'").
 * Devuelve null si no hay orígenes de los que partir.
 */
export function sugerirNombreDestino(nombresOrigenes, nombresExistentes) {
  const existentes = new Set(nombresExistentes);
  const origenes = nombresOrigenes.filter((nombre) => typeof nombre === 'string' && nombre !== '');
  if (origenes.length === 0) return null;

  const numerados = origenes
    .map((nombre) => nombre.match(CON_NUMERO))
    .filter((partes) => partes !== null)
    .map(([, prefijo, numero, sufijo]) => ({ prefijo, numero: parseInt(numero, 10), sufijo }));

  if (numerados.length > 0) {
    const { prefijo, numero, sufijo } = numerados.reduce((a, b) => (b.numero > a.numero ? b : a));
    for (let n = numero + 1; ; n++) {
      const nombre = `${prefijo}${n}${sufijo}`;
      if (!existentes.has(nombre)) return nombre;
    }
  }

  for (let nombre = `${origenes[0]}'`; ; nombre += "'") {
    if (!existentes.has(nombre)) return nombre;
  }
}
