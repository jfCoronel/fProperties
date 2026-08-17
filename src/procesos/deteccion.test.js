import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getObjetoFluido, getPropFluido } from '../propFluidos/fluidos';
import { evaluarProceso, derivadosProceso, trazarProceso, parejaDestino } from './proceso';
import { detectarTipo, sugerirTipo } from './deteccion';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

function estado(id, fluido, prop1, val1, prop2, val2) {
  return { id, nombre: id, fluido, ...getObjetoFluido(fluido, prop1, val1, prop2, val2) };
}

function proceso(tipo, origen, destino, parametros = {}, modoDestino = 'manual') {
  return { id: 'p1', tipo, origenes: [origen], destino, modoDestino, parametros };
}

describe('detección del tipo que encaja', () => {
  it('reconoce cada uno de los tipos con restricción', () => {
    const agua = estado('f1', 'Agua', 'P', 200, 'T', 60);
    expect(detectarTipo(agua, estado('f2', 'Agua', 'P', 200, 'T', 90))).toBe('isobarico');
    expect(detectarTipo(agua, estado('f2', 'Agua', 'T', 60, 'P', 100))).toBe('isotermo');

    // La laminación de un ciclo frigorífico: h constante y la temperatura cae.
    const liquido = estado('f1', 'R134a', 'P', 800, 'X', 0);
    expect(detectarTipo(liquido, estado('f2', 'R134a', 'H', liquido.H, 'P', 200)))
      .toBe('isentalpico');
  });

  it('propone compresión cuando la presión sube con un rendimiento posible', () => {
    const aspiracion = estado('f1', 'R134a', 'T', -10, 'X', 100);
    const descarga = estado('f2', 'R134a', 'P', 800, 'T', 55);
    expect(detectarTipo(aspiracion, descarga)).toBe('compresion_isentropica');
  });

  it('propone expansión cuando la presión cae con un rendimiento posible', () => {
    const admision = estado('f1', 'Agua', 'P', 4000, 'T', 400);
    const hIsentropico = getPropFluido('Agua', 'H', 'P', 10, 'S', admision.S);
    const escape = estado('f2', 'Agua', 'P', 10, 'H', admision.H + 0.85 * (hIsentropico - admision.H));
    expect(detectarTipo(admision, escape)).toBe('expansion_isentropica');
  });

  it('propone conducto cuando cae la presión sin mantener nada constante', () => {
    // Se calienta mientras pierde carga: el rendimiento de expansión sale
    // negativo, así que no lo confunde con una turbina.
    const entrada = estado('f1', 'Agua', 'P', 300, 'T', 40);
    const salida = estado('f2', 'Agua', 'P', 280, 'T', 70);
    expect(detectarTipo(entrada, salida)).toBe('sin_trabajo');
  });

  it('un enfriamiento con pérdida de carga no se confunde con una turbina', () => {
    // Enfría muy por debajo del estado isentrópico: η > 1, imposible adiabático.
    const entrada = estado('f1', 'Agua', 'P', 300, 'T', 120);
    const salida = estado('f2', 'Agua', 'P', 280, 'T', 40);
    expect(detectarTipo(entrada, salida)).toBe('sin_trabajo');
  });

  it('no juzga parejas incomparables', () => {
    const agua = estado('f1', 'Agua', 'P', 200, 'T', 60);
    const r134a = estado('f2', 'R134a', 'P', 200, 'T', 20);
    expect(detectarTipo(agua, r134a)).toBeNull();
    expect(detectarTipo(agua, null)).toBeNull();
  });

  it('solo sugiere cambio cuando lo declarado no se cumple', () => {
    const estados = [
      estado('f1', 'Agua', 'P', 300, 'T', 40),
      estado('f2', 'Agua', 'P', 280, 'T', 70)
    ];

    // Declarado isobárico, pero la presión cae: encaja mejor con el conducto.
    const declaradoMal = proceso('isobarico', 'f1', 'f2');
    expect(sugerirTipo(declaradoMal, evaluarProceso(declaradoMal, estados))).toBe('sin_trabajo');

    // Declarado conducto: se cumple, y entonces no hay nada que proponer.
    const declaradoBien = proceso('sin_trabajo', 'f1', 'f2');
    expect(sugerirTipo(declaradoBien, evaluarProceso(declaradoBien, estados))).toBeNull();
  });
});

describe('conducto / intercambiador sin trabajo', () => {
  const entrada = estado('f1', 'Agua', 'P', 300, 'T', 40);
  const salida = estado('f2', 'Agua', 'P', 280, 'T', 70);
  const estados = [entrada, salida];

  it('da q = Δh aunque la presión caiga, y la caída como resultado', () => {
    const p = proceso('sin_trabajo', 'f1', 'f2', { m_punto: 2 });
    const evaluacion = evaluarProceso(p, estados);
    const derivados = derivadosProceso(p, evaluacion);

    expect(evaluacion.avisos).toHaveLength(0);
    expect(derivados.q_esp).toBeCloseTo(salida.H - entrada.H, 6);
    expect(derivados.dp).toBeCloseTo(-20, 6);
    expect(derivados.potencia).toBeCloseTo(2 * (salida.H - entrada.H), 6);
  });

  it('avisa si la presión sube, que sin trabajo de eje no debería', () => {
    const subida = estado('f2', 'Agua', 'P', 400, 'T', 70);
    const p = proceso('sin_trabajo', 'f1', 'f2');
    const evaluacion = evaluarProceso(p, [entrada, subida]);

    expect(evaluacion.valido).toBe(true);
    expect(evaluacion.avisos.map((a) => a.clave)).toContain('aviso_presion_sube_sin_trabajo');
  });

  it('traza una curva que toca los dos extremos', () => {
    const p = proceso('sin_trabajo', 'f1', 'f2');
    const curva = trazarProceso(p, evaluarProceso(p, estados));

    expect(curva.length).toBeGreaterThan(2);
    expect(curva[0].P).toBeCloseTo(entrada.P, 6);
    expect(curva[curva.length - 1].P).toBeCloseTo(salida.P, 6);
    // La presión avanza monótonamente entre los dos extremos
    curva.forEach((punto) => {
      expect(punto.P).toBeLessThanOrEqual(entrada.P + 1e-6);
      expect(punto.P).toBeGreaterThanOrEqual(salida.P - 1e-6);
    });
  });

  it('sin caída de presión sigue trazando (barrido de entalpía)', () => {
    const salidaIsobara = estado('f2', 'Agua', 'P', 300, 'T', 70);
    const p = proceso('sin_trabajo', 'f1', 'f2');
    const curva = trazarProceso(p, evaluarProceso(p, [entrada, salidaIsobara]));
    expect(curva.length).toBeGreaterThan(2);
  });

  it('calcula el destino con el calor y la pérdida de carga', () => {
    const p = proceso('sin_trabajo', 'f1', 'f2', { q_dato: 125, dp_dato: 20 }, 'calculado');
    const pareja = parejaDestino(p, [entrada]);

    expect(pareja.in1Id).toBe('P');
    expect(pareja.in1Val).toBeCloseTo(280, 6);
    expect(pareja.in2Id).toBe('H');
    expect(pareja.in2Val).toBeCloseTo(entrada.H + 125, 6);
  });
});

describe('tipo indeterminado', () => {
  const inicial = estado('f1', 'Agua', 'P', 300, 'T', 40);
  const final = estado('f2', 'Agua', 'P', 280, 'T', 70);
  const estados = [inicial, final];

  it('nunca es incoherente y solo mide los saltos', () => {
    const p = proceso('generico', 'f1', 'f2');
    const evaluacion = evaluarProceso(p, estados);
    const derivados = derivadosProceso(p, evaluacion);

    expect(evaluacion.valido).toBe(true);
    expect(evaluacion.avisos).toHaveLength(0);
    expect(derivados.dh).toBeCloseTo(final.H - inicial.H, 6);
    expect(derivados.dp).toBeCloseTo(-20, 6);
    expect(derivados.q_esp).toBeUndefined();
    expect(derivados.w_esp).toBeUndefined();
  });

  it('dibuja el segmento entre los extremos, sin inventar camino', () => {
    const p = proceso('generico', 'f1', 'f2');
    expect(trazarProceso(p, evaluarProceso(p, estados))).toHaveLength(2);
  });

  it('no genera estado destino', () => {
    const p = proceso('generico', 'f1', 'f2', {}, 'calculado');
    expect(parejaDestino(p, [inicial])).toBeNull();
  });
});
