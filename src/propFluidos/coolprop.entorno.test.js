// Sonda: ¿arranca el módulo emscripten de CoolProp fuera del navegador?
// De la respuesta depende si los tests del motor de procesos (F1 en adelante)
// pueden llamar a CoolProp de verdad o tienen que ir contra estados tabulados.
// Ver PLAN-PROCESOS.md, decisión 3.
import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from './coolprop';
import { getPropFluido, getObjetoFluido } from './fluidos';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

describe('entorno de CoolProp', () => {
  it('calcula la presión de saturación del agua a 100 ºC', () => {
    const p = getPropFluido('Agua', 'P', 'T', 100, 'X', 0);
    expect(p).toBeGreaterThan(100);
    expect(p).toBeLessThan(103);
  });

  it('devuelve un objeto de estado completo y finito', () => {
    const estado = getObjetoFluido('R134a', 'T', 25, 'X', 100);
    expect(Number.isFinite(estado.P)).toBe(true);
    expect(Number.isFinite(estado.H)).toBe(true);
    expect(Number.isFinite(estado.S)).toBe(true);
  });

  it('devuelve NaN cuando el estado no es resoluble', () => {
    const p = getPropFluido('Agua', 'P', 'T', -500, 'X', 0);
    expect(Number.isNaN(p)).toBe(true);
  });
});
