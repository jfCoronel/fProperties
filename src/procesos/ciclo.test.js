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

// Ciclo Rankine de agua: caldera a 4000 kPa, condensador a 10 kPa, turbina y
// bomba con rendimiento isentrópico 0,85. Es el ciclo que obligó a añadir la
// expansión con trabajo: sin ella la turbina había que declararla "sin trabajo",
// que da q = Δh y deja el trabajo neto en el de la bomba, positivo, con lo que el
// ciclo se clasificaba como máquina frigorífica.
function cicloRankine() {
  const conRendimiento = (origen, pFinal, eta, esCompresion) => {
    const hIsentropico = getPropFluido('Agua', 'H', 'P', pFinal, 'S', origen.S);
    return esCompresion
      ? origen.H + (hIsentropico - origen.H) / eta
      : origen.H + eta * (hIsentropico - origen.H);
  };
  const punto = (id, prop1, val1, prop2, val2) => ({
    id, nombre: id, fluido: 'Agua', ...getObjetoFluido('Agua', prop1, val1, prop2, val2)
  });

  const f1 = punto('f1', 'P', 4000, 'T', 400);                                  // entrada turbina
  const f2 = punto('f2', 'P', 10, 'H', conRendimiento(f1, 10, 0.85, false));    // escape
  const f3 = punto('f3', 'P', 10, 'X', 0);                                      // líquido saturado
  const f4 = punto('f4', 'P', 4000, 'H', conRendimiento(f3, 4000, 0.85, true)); // salida bomba

  const procesos = [
    { ...arista('p1', 'f1', 'f2', 'expansion_isentropica'), parametros: { m_punto: 10 } },
    { ...arista('p2', 'f2', 'f3', 'isobarico'), parametros: { m_punto: 10 } },
    { ...arista('p3', 'f3', 'f4', 'compresion_isentropica'), parametros: { m_punto: 10 } },
    { ...arista('p4', 'f4', 'f1', 'isobarico'), parametros: { m_punto: 10 } }
  ];
  return { estados: [f1, f2, f3, f4], procesos };
}

describe('balance de un ciclo de potencia', () => {
  it('produce trabajo neto y cierra el primer principio', () => {
    const { estados, procesos } = cicloRankine();
    const balance = balanceCiclo(procesos, estados);

    expect(balance.w_neto).toBeLessThan(0);      // el ciclo produce trabajo
    expect(balance.q_absorbido).toBeGreaterThan(0);
    expect(balance.q_cedido).toBeLessThan(0);
    expect(balance.w_neto + balance.q_absorbido + balance.q_cedido).toBeCloseTo(0, 8);
  });

  it('da rendimiento térmico, no COP, y con un valor de ciclo real', () => {
    const { estados, procesos } = cicloRankine();
    const { indicador } = balanceCiclo(procesos, estados);

    expect(indicador.cop_frigorifico).toBeUndefined();
    expect(indicador.eta_termico).toBeGreaterThan(0.2);
    expect(indicador.eta_termico).toBeLessThan(0.4);
  });

  it('declarar la turbina como conducto rompe el balance: es a lo que obligaba', () => {
    const { estados, procesos } = cicloRankine();
    procesos[0] = { ...procesos[0], tipo: 'sin_trabajo' };

    const balance = balanceCiclo(procesos, estados);
    // El Δh de la turbina se contabiliza como calor cedido, y el único trabajo
    // que queda es el de la bomba: el ciclo aparenta consumir trabajo.
    expect(balance.w_neto).toBeGreaterThan(0);
    expect(balance.indicador?.eta_termico).toBeUndefined();
  });
});

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
