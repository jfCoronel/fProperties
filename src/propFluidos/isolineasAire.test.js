// Isolíneas de fondo del psicrométrico (bulbo húmedo y entalpía constantes).
//
// Se fija lo que se vería mal en el diagrama sin que nadie lo notara en la tabla:
// que la línea arranque en la campana y no un grado más allá, que llegue a w = 0
// sin cruzar el eje, que respete el recorte del fondo y que todos sus puntos
// tengan de verdad la propiedad que dice la etiqueta.
import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from './coolprop';
import { getIsolineaAire, getPropAireHumedo } from './aires';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

const T_MIN = -10;
const T_MAX = 55;

describe('getIsolineaAire', () => {
  it('bulbo húmedo: arranca en saturación y acaba en aire seco', () => {
    const linea = getIsolineaAire('A', 0, 'TH', 20, T_MIN, T_MAX);
    const primero = linea[0];
    const ultimo = linea[linea.length - 1];

    // En saturación la temperatura seca es la húmeda
    expect(primero.T).toBeCloseTo(20, 6);
    expect(primero.W).toBeCloseTo(getPropAireHumedo('W', 'A', 0, 'T', 20, 'HR', 100), 6);
    // El extremo seco cae a ~56 ºC, fuera del fondo: se recorta en T_MAX
    expect(ultimo.T).toBe(T_MAX);
    expect(ultimo.W).toBeGreaterThan(0);
  });

  it('entalpía: toca el eje w = 0 dentro del fondo', () => {
    const linea = getIsolineaAire('A', 0, 'H', 50, T_MIN, T_MAX);
    const ultimo = linea[linea.length - 1];
    expect(ultimo.W).toBe(0);
    expect(ultimo.T).toBeCloseTo(49.68, 1);
  });

  it('todos los puntos tienen la propiedad de la etiqueta y w decrece', () => {
    for (const [propiedad, valor] of [['TH', 15], ['H', 80]]) {
      const linea = getIsolineaAire('A', 0, propiedad, valor, T_MIN, T_MAX);
      expect(linea.length).toBeGreaterThan(5);
      for (const { T, W } of linea) {
        expect(getPropAireHumedo(propiedad, 'A', 0, 'T', T, 'W', W)).toBeCloseTo(valor, 3);
      }
      for (let i = 1; i < linea.length; i++) {
        expect(linea[i].T).toBeGreaterThan(linea[i - 1].T);
        expect(linea[i].W).toBeLessThan(linea[i - 1].W);
      }
    }
  });

  it('se recorta por abajo y desaparece si cae entera fuera del fondo', () => {
    // h = 0 satura a ~-5,8 ºC: dentro, empieza en la campana
    expect(getIsolineaAire('A', 0, 'H', 0, T_MIN, T_MAX)[0].T).toBeCloseTo(-5.76, 1);
    // T_h = -5 va de -5 ºC a ~2 ºC: con el fondo empezando en 0 ºC, se recorta
    expect(getIsolineaAire('A', 0, 'TH', -5, 0, T_MAX)[0].T).toBe(0);
    // Enteras fuera: por debajo de T_MIN, o saturando más allá de T_MAX
    expect(getIsolineaAire('A', 0, 'TH', -15, T_MIN, T_MAX)).toEqual([]);
    expect(getIsolineaAire('A', 0, 'H', 400, T_MIN, T_MAX)).toEqual([]);
  });

  it('h = 0 llega al eje y T_h = 0 no existe (salto agua/hielo de CoolProp)', () => {
    const linea = getIsolineaAire('A', 0, 'H', 0, T_MIN, T_MAX);
    expect(linea).toHaveLength(11);
    expect(linea[linea.length - 1].W).toBe(0);
    // Con w = 0, T_h salta de -0,36 ºC a +0,93 ºC entre 10 y 11 ºC: no hay
    // extremo seco para T_h = 0, y antes que una línea inventada, ninguna.
    expect(getIsolineaAire('A', 0, 'TH', 0, T_MIN, T_MAX)).toEqual([]);
  });

  it('depende de la presión total del diagrama', () => {
    // A 2000 m la misma T húmeda admite más agua: la línea sube
    const mar = getIsolineaAire('A', 0, 'TH', 20, T_MIN, T_MAX)[0];
    const altura = getIsolineaAire('A', 2000, 'TH', 20, T_MIN, T_MAX)[0];
    expect(altura.T).toBeCloseTo(mar.T, 6);
    expect(altura.W).toBeGreaterThan(mar.W);
  });
});
