// Arranque de CoolProp en Node, para los tests.
//
// El glue de emscripten de coolprop.js decide su entorno al importarse y necesita
// `require` y `__dirname` para tomar la rama Node; ninguna de las dos existe en ESM.
// Además Vite reescribe `__dirname` al directorio del propio módulo, así que el
// binario se busca en src/propFluidos/ en vez de en public/. Se resuelve
// redirigiendo la lectura de coolprop.wasm, sin duplicar el binario en el repo.
//
// Todo esto es exclusivo de los tests: en el navegador el módulo carga el wasm
// por su cuenta desde la raíz publicada.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rutaWasm = path.join(raiz, 'public', 'coolprop.wasm');

globalThis.require = require;
globalThis.__dirname = path.dirname(rutaWasm);

const fs = require('fs');
const readFileSyncOriginal = fs.readFileSync;
fs.readFileSync = function (ruta, ...resto) {
  if (typeof ruta === 'string' && ruta.endsWith('coolprop.wasm')) {
    return readFileSyncOriginal.call(this, rutaWasm, ...resto);
  }
  return readFileSyncOriginal.call(this, ruta, ...resto);
};

// El módulo llama a run() al importarse, pero la instanciación del wasm es
// asíncrona: PropsSI no existe hasta que termina.
export async function esperarCoolprop(Module, msLimite = 20000) {
  const t0 = Date.now();
  while (typeof Module.PropsSI !== 'function') {
    if (Date.now() - t0 > msLimite) {
      throw new Error('CoolProp no terminó de inicializarse');
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
