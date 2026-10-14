// Refinado de la curva de un proceso para el 3D: que pase por la campana y que
// v no salte más de lo que la escala logarítmica deja ver como recta.
import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getObjetoFluido, getPropFluido } from '../propFluidos/fluidos';
import { refinarTrazo } from './refinarTrazo';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

const estado = (p, h) => ({ fluido: 'Agua', ...getObjetoFluido('Agua', 'P', p, 'H', h) });

// Isobárico como lo muestrea el resolvedor: 25 puntos uniformes en h
const isobarico = (p, h1, h2) => Array.from({ length: 25 }, (_, i) => estado(p, h1 + (h2 - h1) * i / 24));

describe('refinado del trazo 3D', () => {
  it('un isobárico de líquido a vapor pasa por los dos puntos saturados', () => {
    const p = 200;
    const trazo = refinarTrazo(isobarico(p, 300, 3300), { subdividir: true });
    const vf = getPropFluido('Agua', 'V', 'P', p, 'X', 0);
    const vg = getPropFluido('Agua', 'V', 'P', p, 'X', 100);
    expect(trazo.some((e) => Math.abs(e.V / vf - 1) < 1e-6)).toBe(true);
    expect(trazo.some((e) => Math.abs(e.V / vg - 1) < 1e-6)).toBe(true);
    trazo.forEach((e) => expect(e.P).toBeCloseTo(p, 6));
  });

  it('v no salta más de lo permitido salvo pegado a la campana', () => {
    const trazo = refinarTrazo(isobarico(200, 300, 3300), { subdividir: true });
    const saltos = trazo.slice(1).map((e, i) => Math.abs(Math.log10(e.V / trazo[i].V)));
    const grandes = saltos.filter((s) => s > 0.05);
    expect(grandes.length).toBeLessThanOrEqual(2);
    expect(Math.max(...saltos)).toBeLessThan(0.2);
  });

  it('respeta los extremos y el orden en v', () => {
    const original = isobarico(200, 300, 3300);
    const trazo = refinarTrazo(original);
    expect(trazo[0]).toBe(original[0]);
    expect(trazo.at(-1)).toBe(original.at(-1));
    for (let i = 1; i < trazo.length; i++) expect(trazo[i].V).toBeGreaterThanOrEqual(trazo[i - 1].V * (1 - 1e-9));
  });

  it('un tramo todo en vapor apenas cambia', () => {
    const original = isobarico(200, 3100, 3300);
    expect(refinarTrazo(original, { subdividir: true }).length).toBe(original.length);
  });

  it('sin subdividir solo añade los dos cruces, con su entropía', () => {
    const original = isobarico(200, 300, 3300);
    const trazo = refinarTrazo(original);
    expect(trazo.length).toBe(original.length + 2);
    const sf = getPropFluido('Agua', 'S', 'P', 200, 'X', 0);
    const sg = getPropFluido('Agua', 'S', 'P', 200, 'X', 100);
    expect(trazo.some((e) => Math.abs(e.S - sf) < 1e-6)).toBe(true);
    expect(trazo.some((e) => Math.abs(e.S - sg) < 1e-6)).toBe(true);
  });
});
