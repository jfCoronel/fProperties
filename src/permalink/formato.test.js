import { describe, it, expect } from 'vitest';
import {
  ESQUEMA_PROBLEMA,
  codificarProblema,
  decodificarProblema,
  normalizarProblema
} from './formato';

const problema = {
  v: ESQUEMA_PROBLEMA,
  estados: [
    { id: 'f1', nombre: 'Aspiración', fluido: 'R134a', in1Id: 'T', in1Val: -10, in2Id: 'X', in2Val: 100 },
    { id: 'f2', nombre: 'Descarga', fluido: 'R134a', in1Id: 'P', in1Val: 1000, in2Id: 'T', in2Val: 60 }
  ],
  aires: [],
  procesos: [
    {
      id: 'p1',
      origenes: ['f1'],
      destino: 'f2',
      tipo: 'compresion_isentropica',
      modoDestino: 'manual',
      parametros: { m_punto: 0.05 },
      estilo: { color: '#1890FF', grosor: 2, trazo: 'solid' }
    }
  ],
  configuracion: { idioma: 'es', nCifras: 4, tipoDiagrama: 'p-h' }
};

describe('codificación del problema', () => {
  it('sobrevive a la ida y vuelta', async () => {
    const carga = await codificarProblema(problema);
    expect(await decodificarProblema(carga)).toEqual(problema);
  });

  it('produce una carga apta para una URL', async () => {
    const carga = await codificarProblema(problema);
    expect(carga).toMatch(/^[zj][A-Za-z0-9_-]*$/);
  });

  it('comprime: un problema de 8 estados cabe holgado en un enlace', async () => {
    const grande = {
      ...problema,
      estados: Array.from({ length: 8 }, (_, i) => ({
        id: `f${i + 1}`, nombre: `Estado ${i + 1}`, fluido: 'R134a',
        in1Id: 'T', in1Val: 20 + i, in2Id: 'P', in2Val: 500 + i
      }))
    };
    const carga = await codificarProblema(grande);
    expect(carga.length).toBeLessThan(1000);
    expect((await decodificarProblema(carga)).estados).toHaveLength(8);
  });

  it('rechaza una carga que no se puede leer', async () => {
    await expect(decodificarProblema('z!!!no-es-base64!!!')).rejects.toThrow('error_problema_ilegible');
    await expect(decodificarProblema('x1234')).rejects.toThrow('error_problema_ilegible');
  });
});

describe('normalización', () => {
  it('rechaza un esquema de otra versión', () => {
    expect(() => normalizarProblema({ ...problema, v: 99 })).toThrow('error_problema_version');
    expect(() => normalizarProblema('no soy un problema')).toThrow('error_problema_ilegible');
  });

  it('descarta las claves de configuración que no forman parte del enunciado', () => {
    const limpio = normalizarProblema({
      ...problema,
      configuracion: { nCifras: 5, verDialogoFluido: true, inventada: 1 }
    });
    expect(limpio.configuracion).toEqual({ nCifras: 5 });
  });

  it('descarta estados y procesos incompletos en vez de romperse', () => {
    const limpio = normalizarProblema({
      ...problema,
      estados: [...problema.estados, { nombre: 'sin id' }, null, 42],
      procesos: [...problema.procesos, { id: 'p2' }]
    });
    expect(limpio.estados).toHaveLength(2);
    expect(limpio.procesos).toHaveLength(1);
  });

  it('limpia los parámetros no numéricos y completa el estilo ausente', () => {
    const limpio = normalizarProblema({
      ...problema,
      procesos: [{
        id: 'p1', origenes: ['f1'], destino: 'f2', tipo: 'isobarico',
        parametros: { m_punto: '0.05', eta: 'mucho' }
      }]
    });
    expect(limpio.procesos[0].parametros).toEqual({ m_punto: 0.05 });
    expect(limpio.procesos[0].modoDestino).toBe('manual');
    expect(limpio.procesos[0].estilo.trazo).toBe('solid');
  });

  it('tolera las listas ausentes', () => {
    const limpio = normalizarProblema({ v: ESQUEMA_PROBLEMA });
    expect(limpio).toEqual({
      v: ESQUEMA_PROBLEMA, estados: [], aires: [], procesos: [], configuracion: {}
    });
  });
});
