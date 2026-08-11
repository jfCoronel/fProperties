import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getObjetoFluido, getPropFluido } from '../propFluidos/fluidos';
import { detectarCiclos, balanceCiclo, getCiclos } from './ciclo';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

const arista = (id, origen, destino, tipo = 'isobarico') => ({
  id, origenes: [origen], destino, tipo, modoDestino: 'manual', parametros: {}
});

describe('detección de ciclos', () => {
  it('encuentra el ciclo de cuatro procesos', () => {
    const ciclos = detectarCiclos([
      arista('p1', 'f1', 'f2'), arista('p2', 'f2', 'f3'),
      arista('p3', 'f3', 'f4'), arista('p4', 'f4', 'f1')
    ]);
    expect(ciclos).toHaveLength(1);
    expect(ciclos[0].map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('no inventa ciclos en una cadena abierta', () => {
    expect(detectarCiclos([
      arista('p1', 'f1', 'f2'), arista('p2', 'f2', 'f3')
    ])).toEqual([]);
  });

  it('cuenta una sola vez el mismo ciclo, se empiece por donde se empiece', () => {
    const ciclos = detectarCiclos([
      arista('p2', 'f2', 'f1'), arista('p1', 'f1', 'f2')
    ]);
    expect(ciclos).toHaveLength(1);
  });

  it('distingue dos ciclos que comparten un estado', () => {
    const ciclos = detectarCiclos([
      arista('p1', 'f1', 'f2'), arista('p2', 'f2', 'f1'),
      arista('p3', 'f1', 'f3'), arista('p4', 'f3', 'f1')
    ]);
    expect(ciclos).toHaveLength(2);
  });
});

// Ciclo frigorífico de R134a: evaporación a −10 ºC, condensación a 1000 kPa,
// compresor con rendimiento isentrópico 0,75.
function cicloFrigorifico() {
  const f1 = { id: 'f1', nombre: '1', fluido: 'R134a', ...getObjetoFluido('R134a', 'T', -10, 'X', 100) };
  const hIsentropico = getPropFluido('R134a', 'H', 'P', 1000, 'S', f1.S);
  const h2 = f1.H + (hIsentropico - f1.H) / 0.75;

  const f2 = { id: 'f2', nombre: '2', fluido: 'R134a', ...getObjetoFluido('R134a', 'P', 1000, 'H', h2) };
  const f3 = { id: 'f3', nombre: '3', fluido: 'R134a', ...getObjetoFluido('R134a', 'P', 1000, 'X', 0) };
  const f4 = { id: 'f4', nombre: '4', fluido: 'R134a', ...getObjetoFluido('R134a', 'P', f1.P, 'H', f3.H) };

  const procesos = [
    { ...arista('p1', 'f1', 'f2', 'compresion_isentropica'), parametros: { m_punto: 0.05 } },
    { ...arista('p2', 'f2', 'f3', 'isobarico'), parametros: { m_punto: 0.05 } },
    { ...arista('p3', 'f3', 'f4', 'isentalpico'), parametros: { m_punto: 0.05 } },
    { ...arista('p4', 'f4', 'f1', 'isobarico'), parametros: { m_punto: 0.05 } }
  ];
  return { estados: [f1, f2, f3, f4], procesos };
}

describe('balance del ciclo', () => {
  it('reparte trabajo y calores con los signos del convenio', () => {
    const { estados, procesos } = cicloFrigorifico();
    const balance = balanceCiclo(procesos, estados);

    expect(balance.w_neto).toBeGreaterThan(0);   // el ciclo consume trabajo
    expect(balance.q_absorbido).toBeGreaterThan(0);
    expect(balance.q_cedido).toBeLessThan(0);
    // Primer principio: alrededor del ciclo, ΣΔh = 0 → w + q = 0
    expect(balance.w_neto + balance.q_absorbido + balance.q_cedido).toBeCloseTo(0, 8);
  });

  it('da el COP frigorífico y el de bomba de calor, que difieren en uno', () => {
    const { estados, procesos } = cicloFrigorifico();
    const { indicador } = balanceCiclo(procesos, estados);

    expect(indicador.cop_frigorifico).toBeGreaterThan(2);
    expect(indicador.cop_frigorifico).toBeLessThan(6);
    expect(indicador.cop_bomba).toBeCloseTo(indicador.cop_frigorifico + 1, 6);
  });

  it('el caudal común del ciclo permite dar potencias', () => {
    const { estados, procesos } = cicloFrigorifico();
    expect(balanceCiclo(procesos, estados).caudal).toBe(0.05);
  });

  it('sin un caudal único no se ofrece potencia', () => {
    const { estados, procesos } = cicloFrigorifico();
    procesos[2].parametros = { m_punto: 0.02 };
    expect(balanceCiclo(procesos, estados).caudal).toBeNull();
  });

  it('un ciclo con un proceso inválido no se presenta', () => {
    const { estados, procesos } = cicloFrigorifico();
    procesos[1].destino = 'f9'; // estado inexistente: además deja de haber ciclo
    expect(getCiclos(procesos, estados)).toEqual([]);
  });

  it('no cierra el balance si el ciclo lleva un proceso indeterminado', () => {
    const { estados, procesos } = cicloFrigorifico();
    // La condensación pasa a declararse de tipo indeterminado: sin saber cuánto
    // de su Δh es calor, el reparto entre w y q dejaría de significar nada.
    procesos[1] = { ...procesos[1], tipo: 'generico' };

    const balance = balanceCiclo(procesos, estados);
    expect(balance.indeterminado).toBe(true);
    expect(balance.indicador).toBeNull();
  });

  it('el balance normal no se declara indeterminado', () => {
    const { estados, procesos } = cicloFrigorifico();
    expect(balanceCiclo(procesos, estados).indeterminado).toBe(false);
  });

  it('avisa de que hay procesos marcados sin ocultar el balance', () => {
    const { estados, procesos } = cicloFrigorifico();
    // La condensación deja de ser isobárica: el proceso avisa, el ciclo sigue
    estados[2] = { ...estados[2], ...getObjetoFluido('R134a', 'P', 900, 'X', 0), id: 'f3' };

    const ciclos = getCiclos(procesos, estados);
    expect(ciclos).toHaveLength(1);
    expect(ciclos[0].hayAvisos).toBe(true);
  });
});
