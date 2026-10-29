// Carga de los textos de la interfaz. La interfaz repinta al cambiar
// textosCargados, no textosUI: un cambio de idioma que no pase esa señal por false
// deja los textos nuevos sin pintar (el caso del permalink con otro idioma).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configuracion, cargarTextosUI } from './configuracion';

function respuestaCon(textos) {
  return Promise.resolve({ json: () => Promise.resolve(textos) });
}

beforeEach(() => {
  configuracion.merge({ idioma: 'es', textosUI: {}, textosCargados: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cargarTextosUI', () => {
  it('baja textosCargados mientras carga aunque ya estuviera en true', async () => {
    configuracion.merge({ idioma: 'en', textosCargados: true });
    let durante;
    vi.stubGlobal('fetch', vi.fn((url) => {
      durante = configuracion.textosCargados.get();
      expect(url).toBe('./json/en.json');
      return respuestaCon({ hola: 'hello' });
    }));

    await cargarTextosUI();

    expect(durante).toBe(false);
    expect(configuracion.textosCargados.get()).toBe(true);
    expect(configuracion.textosUI.hola.get()).toBe('hello');
  });

  it('descarta una respuesta que llega después de cambiar de idioma', async () => {
    vi.stubGlobal('fetch', vi.fn(() => {
      // El idioma cambia mientras la petición está en vuelo
      configuracion.idioma.set('en');
      return respuestaCon({ hola: 'hola' });
    }));

    await cargarTextosUI();

    expect(configuracion.textosUI.hola.get()).toBeUndefined();
    expect(configuracion.textosCargados.get()).toBe(false);
  });
});
