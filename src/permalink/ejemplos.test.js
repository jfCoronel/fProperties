// Los ejemplos con nombre se citan desde fuera (artículos, enunciados impresos):
// si uno deja de cargarse o cambia de resultado, el enlace publicado miente.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { listaFluidos } from '../listaFluidos';
import { listaAires } from '../listaAires';
import { listaProcesos } from '../procesos/listaProcesos';
import { getCiclos } from '../procesos/ciclo';
import { normalizarProblema } from './formato';
import { aplicarProblema } from './problema';
import { EJEMPLOS, getEjemplo } from './ejemplos';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

beforeEach(() => {
  listaFluidos.set([]);
  listaAires.set([]);
  listaProcesos.set([]);
});

function cicloAplicado(nombre) {
  aplicarProblema(getEjemplo(nombre));
  const ciclos = getCiclos(listaProcesos.get({ noproxy: true }), listaFluidos.get({ noproxy: true }));
  expect(ciclos).toHaveLength(1);
  return ciclos[0];
}

describe('ejemplos con nombre', () => {
  it('todos pasan la normalización sin perder estados ni procesos', () => {
    expect(Object.keys(EJEMPLOS).length).toBeGreaterThan(0);
    Object.entries(EJEMPLOS).forEach(([, problema]) => {
      const normalizado = normalizarProblema(problema);
      expect(normalizado.estados).toHaveLength(problema.estados.length);
      expect(normalizado.aires).toHaveLength(problema.aires.length);
      expect(normalizado.procesos).toHaveLength(problema.procesos.length);
    });
  });

  it('un nombre desconocido da un error traducible', () => {
    expect(() => getEjemplo('no-existe')).toThrow('error_ejemplo_desconocido');
    expect(() => getEjemplo('constructor')).toThrow('error_ejemplo_desconocido');
  });

  it('r134a-cycle da el COP del artículo', () => {
    const ciclo = cicloAplicado('r134a-cycle');
    expect(ciclo.indicador.cop_frigorifico).toBeCloseTo(3.022, 3);
    expect(ciclo.hayAvisos).toBe(false);
  });

  it('r134a-student-errors conserva sus dos procesos a revisar', () => {
    const ciclo = cicloAplicado('r134a-student-errors');
    expect(ciclo.hayAvisos).toBe(true);
    expect(ciclo.indicador.cop_frigorifico).toBeGreaterThan(300);
  });

  it('ahu-mixing-coil recalcula la mezcla', () => {
    aplicarProblema(getEjemplo('ahu-mixing-coil'));
    const mezcla = listaAires.get({ noproxy: true }).find((aire) => aire.nombre === 'M');
    expect(mezcla.T).toBeCloseTo(28.02, 1);
  });

  it('aplicar un ejemplo no altera el empaquetado', () => {
    const antes = JSON.stringify(EJEMPLOS['r134a-cycle']);
    aplicarProblema(getEjemplo('r134a-cycle'));
    expect(JSON.stringify(EJEMPLOS['r134a-cycle'])).toBe(antes);
  });
});
