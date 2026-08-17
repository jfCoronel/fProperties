// Copia la build a docs/, que es de donde sirve GitHub Pages.
//
// Es un REEMPLAZO, no una fusión, y esa es toda la razón de que exista este
// fichero en vez de un `cp -R`: los assets llevan un hash en el nombre, así que
// fusionar dejaría acumulándose los de todas las versiones anteriores, que ya no
// referencia nadie. El CNAME no hay que preservarlo a mano porque vive en
// public/ y la propia build lo copia.
//
// Se escribe en Node y no en shell para no depender de rm ni de cp.
// Ver DOCUMENTACION.md §5.
import { rmSync, cpSync, existsSync, readdirSync } from 'node:fs';

const ORIGEN = 'dist';
const DESTINO = 'docs';

if (!existsSync(ORIGEN)) {
  console.error(`No hay ${ORIGEN}/: ejecuta antes "npm run build".`);
  process.exit(1);
}

// Una build a medias dejaría docs/ inservible, y el fallo se vería en producción
// y no aquí. Antes de borrar nada, se comprueba que lo que se va a copiar tiene
// lo imprescindible.
const IMPRESCINDIBLES = ['index.html', 'CNAME', 'coolprop.wasm'];
const faltan = IMPRESCINDIBLES.filter((fichero) => !existsSync(`${ORIGEN}/${fichero}`));
if (faltan.length > 0) {
  console.error(`La build está incompleta, falta: ${faltan.join(', ')}. No se toca ${DESTINO}/.`);
  process.exit(1);
}

rmSync(DESTINO, { recursive: true, force: true });
cpSync(ORIGEN, DESTINO, { recursive: true });

console.log(`${DESTINO}/ reemplazado con ${readdirSync(DESTINO).length} entradas desde ${ORIGEN}/.`);
