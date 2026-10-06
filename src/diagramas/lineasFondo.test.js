// Líneas de fondo de los diagramas: valores automáticos, recorte, lectura de lo
// que escribe el usuario y la física de las isolíneas.
//
// Lo que se fija de la física es lo que se vería mal sin que ningún número de la
// tabla cambiara: que una isoterma cruce la campana a la presión de saturación,
// que una línea de título acabe en el punto crítico, que nada se salga de la
// ventana del diagrama.
import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getPropFluido } from '../propFluidos/fluidos';
import {
  valoresLineales, valoresLogaritmicos, recortarPolilinea, contextoFluido,
  valoresAutomaticosFluido, curvasFondoFluido, ventanaFluido, curvasFondoAire,
  VENTANA_PSICROMETRICO
} from './lineasFondo';
import {
  configuracionFamilias, normalizarLineasFondo, parsearValores, formatearValores,
  getFamiliasFondo
} from './familiasFondo';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

describe('valores automáticos', () => {
  it('lineales: pasos redondos que cubren el intervalo', () => {
    expect(valoresLineales(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(valoresLineales(-103, 224, 8)).toEqual([-100, -50, 0, 50, 100, 150, 200]);
    expect(valoresLineales(0.745, 0.974, 8)).toEqual([0.75, 0.8, 0.85, 0.9, 0.95]);
    expect(valoresLineales(5, 5)).toEqual([]);
  });

  it('logarítmicos: 1-2-5 por década, o menos si son muchas', () => {
    expect(valoresLogaritmicos(1, 100)).toEqual([1, 2, 5, 10, 20, 50, 100]);
    // Agua: del punto triple al doble de la crítica, demasiadas para 1-2-5
    expect(valoresLogaritmicos(0.6117, 44128)).toEqual([1, 10, 100, 1000, 10000]);
  });
});

describe('recorte a la ventana', () => {
  const caja = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };

  it('corta en el borde y parte la línea si sale y vuelve a entrar', () => {
    const trozos = recortarPolilinea(
      [{ x: -5, y: 5 }, { x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 8 }, { x: 5, y: 8 }],
      caja
    );
    expect(trozos).toEqual([
      [{ x: 0, y: 5 }, { x: 5, y: 5 }, { x: 10, y: 5 }],
      [{ x: 10, y: 8 }, { x: 5, y: 8 }]
    ]);
  });

  it('con eje logarítmico corta donde se ve el borde, en log(y)', () => {
    const [trozo] = recortarPolilinea(
      [{ x: 0, y: 1 }, { x: 10, y: 10000 }], { xMin: 0, xMax: 10, yMin: 1, yMax: 100 }, true
    );
    // A mitad de camino en log: x = 5 cuando y = 100
    expect(trozo[1].x).toBeCloseTo(5, 9);
    expect(trozo[1].y).toBeCloseTo(100, 9);
  });

  it('descarta lo que queda entero fuera y parte en los puntos no finitos', () => {
    expect(recortarPolilinea([{ x: 20, y: 20 }, { x: 30, y: 30 }], caja)).toEqual([]);
    expect(recortarPolilinea(
      [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: NaN, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }], caja
    )).toHaveLength(2);
  });
});

describe('configuración y lo que escribe el usuario', () => {
  it('la configuración guardada se superpone a la de por defecto', () => {
    const familias = configuracionFamilias('p-h', { 'p-h': { isocoras: { activa: true, valores: [0.1] } } });
    expect(familias.find((f) => f.clave === 'isocoras')).toMatchObject({ activa: true, valores: [0.1] });
    expect(familias.find((f) => f.clave === 'isotermas')).toMatchObject({ activa: true, valores: null });
  });

  it('lee listas con coma o punto decimal, separadas por ; o espacios', () => {
    expect(parsearValores('0,5; 1;2,5')).toEqual([0.5, 1, 2.5]);
    expect(parsearValores('2.5 0.5  1 1 abc')).toEqual([0.5, 1, 2.5]);
    expect(parsearValores('')).toEqual([]);
    expect(formatearValores([0.5, 10], 'es')).toBe('0,5; 10');
    expect(formatearValores([0.5, 10], 'en')).toBe('0.5; 10');
  });

  it('del enlace solo pasa lo que tiene forma válida', () => {
    expect(normalizarLineasFondo({
      'p-h': {
        isotermas: { activa: false, valores: [0, 50] },
        isentropicas: { activa: 'sí', valores: ['x'] },
        inventada: { activa: true }
      },
      'z-w': { isotermas: { activa: true } },
      psicrometrico: { volumen: { activa: true, valores: null } }
    })).toEqual({
      'p-h': { isotermas: { activa: false, valores: [0, 50] } },
      psicrometrico: { volumen: { activa: true, valores: null } }
    });
    expect(normalizarLineasFondo('basura')).toEqual({});
    expect(normalizarLineasFondo({ 'p-h': { isotermas: { valores: Array(100).fill(1) } } })).toEqual({});
  });

  it('todos los diagramas tienen familias con nombre y propiedad', () => {
    ['p-h', 'T-s', 'p-T', 'psicrometrico'].forEach((diagrama) => {
      expect(getFamiliasFondo(diagrama).length).toBeGreaterThan(0);
      getFamiliasFondo(diagrama).forEach((f) => expect(f.propiedad).toBeTruthy());
    });
  });
});

describe('isolíneas de fluido', () => {
  const lineas = (diagrama, familia, valores) => curvasFondoFluido(
    'Agua', diagrama, { [diagrama]: { [familia]: { activa: true, valores } } }
  ).filter((dataset) => dataset.familia === familia);

  it('una isoterma del p-h cruza la campana horizontal, a la presión de saturación', () => {
    const pSat = getPropFluido('Agua', 'P', 'T', 100, 'X', 0);
    const puntos = lineas('p-h', 'isotermas', [100]).flatMap((d) => d.data);
    const enSaturacion = puntos.filter((p) => Math.abs(p.y - pSat) < 1e-6);
    // Los dos extremos del tramo horizontal: líquido y vapor saturados
    expect(enSaturacion).toHaveLength(2);
    const [hLiquido, hVapor] = [0, 100].map((x) => getPropFluido('Agua', 'H', 'T', 100, 'X', x));
    expect(enSaturacion.map((p) => p.x).sort((a, b) => a - b)[0]).toBeCloseTo(hLiquido, 6);
    expect(enSaturacion.map((p) => p.x).sort((a, b) => a - b)[1]).toBeCloseTo(hVapor, 6);
  });

  it('una isobara del T-s cruza la campana a la temperatura de saturación', () => {
    const tSat = getPropFluido('Agua', 'T', 'P', 1000, 'X', 0);
    const puntos = lineas('T-s', 'isobaras', [1000]).flatMap((d) => d.data);
    expect(puntos.filter((p) => Math.abs(p.y - tSat) < 1e-6)).toHaveLength(2);
  });

  it('isotermas e isobaras cruzan la saturación sin partirse', () => {
    // Pegado a la saturación CoolProp devuelve NaN, y la línea se cortaba en el
    // vapor saturado y en el líquido saturado de 200 y 300 ºC
    [['p-h', 'isotermas', [200, 300]], ['T-s', 'isobaras', [1000, 10000]]].forEach(([diagrama, familia, valores]) => {
      const datasets = lineas(diagrama, familia, valores);
      expect(datasets).toHaveLength(valores.length);
    });
  });

  it('los rótulos del borde derecho se escriben hacia dentro', () => {
    // Las isócoras del agua en el p-h acaban todas a la derecha de la ventana
    lineas('p-h', 'isocoras', [0.01, 0.1, 1]).forEach((dataset) => {
      const rotulado = dataset.data.find((p) => p.nombre);
      expect(rotulado.posicionNombre.align).toBe('right');
    });
  });

  it('las de título constante acaban junto al punto crítico', () => {
    const ctx = contextoFluido('Agua');
    const [dataset] = lineas('T-s', 'titulo', [50]);
    const ultimo = dataset.data[dataset.data.length - 1];
    expect(ultimo.y).toBeGreaterThan(ctx.tCrit - 1);
    expect(ultimo.y).toBeLessThan(ctx.tCrit);
  });

  it('nada se sale de la ventana del diagrama', () => {
    const ctx = contextoFluido('R134a');
    ['p-h', 'T-s'].forEach((diagrama) => {
      const caja = ventanaFluido(diagrama, ctx);
      const todas = curvasFondoFluido('R134a', diagrama, {
        [diagrama]: Object.fromEntries(getFamiliasFondo(diagrama).map((f) => [f.clave, { activa: true }]))
      });
      expect(todas.length).toBeGreaterThan(10);
      // Holgura de redondeo, proporcional al tamaño de la ventana
      const ex = 1e-9 * (caja.xMax - caja.xMin);
      const ey = 1e-9 * (caja.yMax - caja.yMin);
      todas.flatMap((d) => d.data).forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(caja.xMin - ex);
        expect(x).toBeLessThanOrEqual(caja.xMax + ex);
        expect(y).toBeGreaterThanOrEqual(caja.yMin - ey);
        expect(y).toBeLessThanOrEqual(caja.yMax + ey);
      });
    });
  });

  it('los valores automáticos dependen del fluido', () => {
    const isotermas = getFamiliasFondo('p-h').find((f) => f.clave === 'isotermas');
    expect(valoresAutomaticosFluido(isotermas, contextoFluido('Agua'))).toContain(100);
    expect(valoresAutomaticosFluido(isotermas, contextoFluido('R134a'))).toContain(-50);
  });

  it('sin familias activas no hay fondo (el p-T por defecto)', () => {
    expect(curvasFondoFluido('Agua', 'p-T', {})).toEqual([]);
  });
});

describe('psicrométrico', () => {
  it('por defecto, las tres familias de siempre, todas dentro de la ventana', () => {
    const datasets = curvasFondoAire('A', 0, {});
    expect(new Set(datasets.map((d) => d.familia)))
      .toEqual(new Set(['humedadRelativa', 'bulboHumedo', 'entalpia']));
    const { xMin, xMax, yMin, yMax } = VENTANA_PSICROMETRICO;
    datasets.flatMap((d) => d.data).forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(xMin - 1e-9);
      expect(x).toBeLessThanOrEqual(xMax + 1e-9);
      expect(y).toBeGreaterThanOrEqual(yMin - 1e-9);
      expect(y).toBeLessThanOrEqual(yMax + 1e-9);
    });
  });

  it('las de volumen, encendidas, tienen el volumen de su etiqueta', () => {
    const datasets = curvasFondoAire('A', 0, { psicrometrico: { volumen: { activa: true, valores: [0.85] } } })
      .filter((d) => d.familia === 'volumen');
    expect(datasets.length).toBeGreaterThan(0);
    // getPropAireHumedo no está importado aquí: basta con que la línea baje
    // de la campana al eje, como las demás isolíneas oblicuas
    const puntos = datasets[0].data;
    expect(puntos[puntos.length - 1].y).toBe(0);
    expect(puntos[0].y).toBeGreaterThan(10);
  });
});
