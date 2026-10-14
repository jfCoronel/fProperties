// Superficie p-v-T del diagrama 3D. Lo que se fija es lo que se vería mal sin
// que nada de la tabla cambiara: que la malla se pliegue por la campana, que la
// mezcla sea plana a la presión de saturación y que la superficie sea continua
// al cruzar la isoterma crítica.
import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getPropFluido } from '../propFluidos/fluidos';
import { contextoPvT, superficiePvT, campanaPvT } from './superficiePvT';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

describe('superficie p-v-T', () => {
  it('el contexto acota la superficie con los volúmenes crítico y del vapor triple', () => {
    const ctx = contextoPvT("Agua");
    expect(ctx.vCrit).toBeCloseTo(1 / 322, 5);
    expect(ctx.vMax).toBeGreaterThan(200);
  });

  it('malla rectangular y casi sin huecos', () => {
    for (const fluido of ["Agua", "R134a", "CO2"]) {
      const { x, y, z } = superficiePvT(fluido);
      const columnas = x[0].length;
      for (const matriz of [x, y, z]) {
        expect(matriz.every((fila) => fila.length === columnas)).toBe(true);
      }
      const huecos = z.flat().filter((p) => p === null).length;
      expect(huecos / z.flat().length).toBeLessThan(0.02);
    }
  });

  it('cada punto de la malla está sobre la superficie', () => {
    const { x, y, z } = superficiePvT("Agua");
    for (const [i, j] of [[3, 2], [10, 20], [25, 40], [35, 30]]) {
      const p = getPropFluido("Agua", "P", "T", y[i][j], "RO", 1 / x[i][j]);
      expect(z[i][j]).toBeCloseTo(p, 0);
    }
  });

  it('el tramo de mezcla es plano a la presión de saturación', () => {
    const { x, y, z } = superficiePvT("Agua");
    const fila = 10;
    const pSat = getPropFluido("Agua", "P", "T", y[fila][0], "X", 0);
    const vf = getPropFluido("Agua", "V", "T", y[fila][0], "X", 0);
    const vg = getPropFluido("Agua", "V", "T", y[fila][0], "X", 100);
    const mezcla = z[fila].filter((_, j) => x[fila][j] >= vf * 1.0001 && x[fila][j] <= vg * 0.9999);
    expect(mezcla.length).toBeGreaterThan(5);
    mezcla.forEach((p) => expect(p).toBeCloseTo(pSat, 6));
  });

  it('volumen creciente a lo largo de cada isoterma', () => {
    const { x } = superficiePvT("Agua");
    for (const fila of x) {
      for (let j = 1; j < fila.length; j++) {
        expect(fila[j]).toBeGreaterThanOrEqual(fila[j - 1] * (1 - 1e-9));
      }
    }
  });

  it('la campana va del triple al crítico y vuelve', () => {
    const ctx = contextoPvT("Agua");
    const campana = campanaPvT("Agua", ctx);
    expect(campana[0].T).toBeCloseTo(ctx.tTriple, 6);
    expect(campana.at(-1).T).toBeCloseTo(ctx.tTriple, 6);
    const cima = campana.reduce((a, b) => (b.T > a.T ? b : a));
    expect(cima.P).toBeCloseTo(ctx.pCrit, 3);
    expect(campana.at(-1).V).toBeCloseTo(ctx.vMax, 3);
  });
});
