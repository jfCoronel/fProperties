// El adaptador de dominio es el contrato que hace que un mismo motor sirva para
// fluidos puros y para aire húmedo. Lo que se fija aquí es ese contrato —las
// cinco operaciones, con la misma forma en los dos dominios—, no la física, que
// tiene sus propios tests.
import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getObjetoFluido } from '../propFluidos/fluidos';
import { getObjetoAireHumedo } from '../propFluidos/aires';
import { DOMINIOS, getDominio, CLAVES_DOMINIO, DOMINIO_POR_DEFECTO } from './dominios';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

const entradasFluido = { in1Id: 'T', in1Val: 25, in2Id: 'P', in2Val: 101.325 };
const entradasAire = { in1Id: 'A', in1Val: 0, in2Id: 'T', in2Val: 25, in3Id: 'HR', in3Val: 50 };

describe('contrato del adaptador de dominio', () => {
  it('los dos dominios implementan las mismas operaciones', () => {
    expect(CLAVES_DOMINIO).toEqual(['fluido', 'aire']);
    CLAVES_DOMINIO.forEach((clave) => {
      const dominio = DOMINIOS[clave];
      expect(Array.isArray(dominio.magnitudes)).toBe(true);
      expect(Object.keys(dominio.cierre).length).toBeGreaterThan(0);
      ['identidad', 'construir', 'getProp', 'compatibles'].forEach((operacion) => {
        expect(typeof dominio[operacion]).toBe('function');
      });
    });
  });

  it('un dominio desconocido cae en el de por defecto, no revienta', () => {
    expect(getDominio('inventado')).toBe(DOMINIOS[DOMINIO_POR_DEFECTO]);
    expect(getDominio(undefined).clave).toBe('fluido');
  });
});

describe('dominio de fluidos', () => {
  const dominio = getDominio('fluido');
  const agua = { fluido: 'Agua', ...getObjetoFluido('Agua', 'T', 25, 'P', 101.325) };

  it('construye el mismo estado que la tabla', () => {
    expect(dominio.construir(entradasFluido, agua).H).toBeCloseTo(agua.H, 6);
  });

  it('la identidad que copia a un estado generado es el fluido', () => {
    expect(dominio.identidad(agua)).toEqual({ fluido: 'Agua' });
  });

  it('rechaza mezclar dos fluidos distintos', () => {
    const r134a = { fluido: 'R134a', ...getObjetoFluido('R134a', 'T', 25, 'P', 500) };
    expect(dominio.compatibles([agua, agua])).toBeNull();
    expect(dominio.compatibles([agua, r134a]).clave).toBe('error_fluidos_distintos');
  });
});

describe('dominio de aire húmedo', () => {
  const dominio = getDominio('aire');
  const aire = getObjetoAireHumedo('A', 0, 'T', 25, 'HR', 50);

  it('construye el estado a partir de la terna, no de una pareja', () => {
    const construido = dominio.construir(entradasAire, aire);
    expect(construido.W).toBeCloseTo(aire.W, 6);
    expect(construido.H).toBeCloseTo(aire.H, 6);
  });

  it('resuelve una magnitud suelta con la misma terna', () => {
    expect(dominio.getProp('W', entradasAire, aire)).toBeCloseTo(aire.W, 6);
  });

  it('no tiene sustancia que copiar: su identidad viaja en las entradas', () => {
    expect(dominio.identidad(aire)).toEqual({});
  });

  it('exige que los estados compartan la presión total', () => {
    const enAltura = getObjetoAireHumedo('A', 1000, 'T', 25, 'HR', 50);
    expect(dominio.compatibles([aire, aire])).toBeNull();
    expect(dominio.compatibles([aire, enAltura]).clave).toBe('error_presiones_distintas');
  });

  it('pide las magnitudes que necesita un proceso psicrométrico', () => {
    expect(dominio.magnitudes).toContain('W');
    dominio.magnitudes.forEach((magnitud) => {
      expect(Number.isFinite(aire[magnitud])).toBe(true);
    });
  });
});
