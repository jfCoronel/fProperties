// Estado de referencia de h y s. Lo que se fija: que cada convenio da los
// valores de sus tablas, que cambiar de referencia no mueve ningún estado
// físico —ni los definidos por h o s, ni los calculados por un proceso—, y que
// un enlace de antes de poder elegir se sigue leyendo con la IIR.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { esperarCoolprop } from './test/setupCoolprop';
import { Module } from './propFluidos/coolprop';
import {
  getPropFluido, setReferenciaHS, getReferenciaHS, tieneReferencia, convertirReferencia
} from './propFluidos/fluidos';
import { configuracion } from './configuracion';
import { listaFluidos, nuevoFluido, actualizarFluido } from './listaFluidos';
import { listaAires } from './listaAires';
import { listaProcesos } from './procesos/listaProcesos';
import { cambiarReferenciaHS } from './referenciaHS';
import { aplicarProblema } from './permalink/problema';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

beforeEach(() => {
  setReferenciaHS('auto');
  configuracion.referenciaHS.set('auto');
  listaFluidos.set([]);
  listaAires.set([]);
  listaProcesos.set([]);
});

const h = (fluido, ...entradas) => getPropFluido(fluido, 'H', ...entradas);
const s = (fluido, ...entradas) => getPropFluido(fluido, 'S', ...entradas);

describe('valores de cada convenio', () => {
  it('IIR: h = 200 y s = 1 en líquido saturado a 0 ºC', () => {
    setReferenciaHS('IIR');
    expect(h('R134a', 'T', 0, 'X', 0)).toBeCloseTo(200, 6);
    expect(s('R134a', 'T', 0, 'X', 0)).toBeCloseTo(1, 6);
  });

  it('ASHRAE: h = 0 y s = 0 en líquido saturado a −40 ºC', () => {
    setReferenciaHS('ASHRAE');
    expect(h('R134a', 'T', -40, 'X', 0)).toBeCloseTo(0, 6);
    expect(s('R134a', 'T', -40, 'X', 0)).toBeCloseTo(0, 6);
  });

  it('NBP: h = 0 y s = 0 en líquido saturado a 1 atm', () => {
    setReferenciaHS('NBP');
    expect(h('R134a', 'P', 101.325, 'X', 0)).toBeCloseTo(0, 6);
    expect(s('Nitrogeno', 'P', 101.325, 'X', 0)).toBeCloseTo(0, 6);
  });

  it('punto triple: el agua da las tablas de vapor (Çengel, tabla A-4)', () => {
    setReferenciaHS('TRIPLE');
    expect(getPropFluido('Agua', 'U', 'T', 0.01, 'X', 0)).toBeCloseTo(0, 3);
    expect(h('Agua', 'T', 100, 'X', 0)).toBeCloseTo(419.17, 1);
    expect(h('Agua', 'T', 100, 'X', 100)).toBeCloseTo(2675.6, 0);
    expect(s('Agua', 'T', 100, 'X', 0)).toBeCloseTo(1.3072, 3);
  });

  it('automática: punto triple para el agua, IIR para el resto', () => {
    setReferenciaHS('auto');
    expect(h('Agua', 'T', 100, 'X', 0)).toBeCloseTo(419.17, 1);
    expect(h('R134a', 'T', 0, 'X', 0)).toBeCloseTo(200, 6);
  });

  it('sin el estado de referencia, la de CoolProp', () => {
    // El helio no tiene líquido a 0 ºC, ni el CO2 a 1 atm
    expect(tieneReferencia('Helio', 'IIR')).toBe(false);
    expect(tieneReferencia('CO2', 'NBP')).toBe(false);
    expect(tieneReferencia('R134a', 'NBP')).toBe(true);
    setReferenciaHS('IIR');
    expect(Number.isFinite(h('Helio', 'T', 25, 'P', 101.325))).toBe(true);
  });

  it('una clave desconocida cae en la IIR', () => {
    setReferenciaHS('inventada');
    expect(getReferenciaHS()).toBe('IIR');
  });
});

describe('cambio de referencia', () => {
  it('convertir un valor da el mismo estado físico', () => {
    setReferenciaHS('IIR');
    const hIIR = h('R134a', 'T', 20, 'P', 500);
    const hASHRAE = convertirReferencia('R134a', 'H', hIIR, 'IIR', 'ASHRAE');
    setReferenciaHS('ASHRAE');
    expect(getPropFluido('R134a', 'T', 'P', 500, 'H', hASHRAE)).toBeCloseTo(20, 6);
    expect(convertirReferencia('R134a', 'T', 20, 'IIR', 'ASHRAE')).toBe(20);
  });

  it('los estados definidos por h o s siguen siendo los mismos', () => {
    nuevoFluido();
    nuevoFluido();
    const [a, b] = listaFluidos.get({ noproxy: true });
    actualizarFluido(a.id, { ...a, fluido: 'Agua', in1Id: 'P', in1Val: 1000, in2Id: 'H', in2Val: 3000 });
    actualizarFluido(b.id, { ...b, fluido: 'R134a', in1Id: 'P', in1Val: 300, in2Id: 'S', in2Val: 1.8 });
    const antes = listaFluidos.get({ noproxy: true });

    for (const referencia of ['IIR', 'ASHRAE', 'NBP', 'TRIPLE', 'auto']) {
      cambiarReferenciaHS(referencia);
      expect(configuracion.referenciaHS.get()).toBe(referencia);
      listaFluidos.get({ noproxy: true }).forEach((estado, i) => {
        expect(estado.T).toBeCloseTo(antes[i].T, 6);
        expect(estado.P).toBeCloseTo(antes[i].P, 6);
      });
    }
    // De vuelta a la de partida, los valores escritos son los de antes
    expect(listaFluidos[0].in2Val.get()).toBeCloseTo(3000, 6);
  });

  it('un enlace de antes de poder elegir abre sus estados con la IIR', () => {
    aplicarProblema({
      v: 1,
      estados: [{ id: 'f1', nombre: '1', fluido: 'Agua', in1Id: 'P', in1Val: 100, in2Id: 'H', in2Val: 619.2 }],
      aires: [],
      procesos: [],
      configuracion: {}
    });
    expect(getReferenciaHS()).toBe('IIR');
    expect(configuracion.referenciaHS.get()).toBe('IIR');
    // 619,2 kJ/kg a 100 kPa: con la IIR, apenas dentro de la campana; leído con
    // la del punto triple serían 200 kJ/kg más, un título cercano al 9 %
    expect(listaFluidos[0].T.get()).toBeCloseTo(99.6, 0);
    expect(listaFluidos[0].X.get()).toBeLessThan(1);
  });
});
