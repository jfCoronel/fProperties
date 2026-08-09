import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getObjetoFluido, getPropFluido } from '../propFluidos/fluidos';
import {
  evaluarProceso,
  getDefiniciones,
  getDefinicion,
  getParametrosVisibles
} from './proceso';
import { RESOLVEDORES, getRendimientoIsentropico, dentroDeTolerancia } from './resolvedores';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

// Construye un estado con la misma forma que los de listaFluidos
function estado(id, fluido, prop1, val1, prop2, val2) {
  return { id, nombre: id, fluido, ...getObjetoFluido(fluido, prop1, val1, prop2, val2) };
}

function proceso(tipo, origen, destino, parametros = {}) {
  return { id: 'p1', tipo, origenes: [origen], destino, modoDestino: 'manual', parametros };
}

describe('tabla de definiciones', () => {
  it('declara los cuatro tipos p-h y todos tienen resolvedor', () => {
    const tipos = getDefiniciones('fluido');
    expect(tipos.map((t) => t.clave)).toEqual([
      'compresion_isentropica', 'isobarico', 'isentalpico', 'isotermo'
    ]);
    tipos.forEach((tipo) => {
      expect(RESOLVEDORES[tipo.restriccion.resolvedor]).toBeDefined();
      expect(typeof RESOLVEDORES[tipo.restriccion.resolvedor].verificar).toBe('function');
    });
  });

  it('oculta en modo manual los parámetros que solo sirven para calcular el destino', () => {
    const definicion = getDefinicion('compresion_isentropica');
    const manual = getParametrosVisibles(definicion, 'manual').map((p) => p.clave);
    const calculado = getParametrosVisibles(definicion, 'calculado').map((p) => p.clave);

    expect(manual).toEqual(['m_punto']);
    expect(calculado).toEqual(['p_final', 'eta', 'm_punto']);
  });
});

describe('dentroDeTolerancia', () => {
  it('combina parte absoluta y relativa', () => {
    expect(dentroDeTolerancia(100, 100.4, { abs: 0.5, rel: 0 })).toBe(true);
    expect(dentroDeTolerancia(100, 100.6, { abs: 0.5, rel: 0 })).toBe(false);
    expect(dentroDeTolerancia(1000, 1005, { abs: 0, rel: 0.01 })).toBe(true);
  });

  it('la parte absoluta salva a las magnitudes que pasan por cero', () => {
    // h y s llevan desplazamiento de referencia, así que pueden valer casi cero
    expect(dentroDeTolerancia(0.01, 0.2, { abs: 0.5, rel: 0.005 })).toBe(true);
  });
});

describe('laminación (isentálpico)', () => {
  it('no avisa cuando la pareja conserva la entalpía', () => {
    const origen = estado('f1', 'R134a', 'T', 30, 'X', 0);
    const destino = estado('f2', 'R134a', 'P', 200, 'H', origen.H);

    const r = evaluarProceso(proceso('isentalpico', 'f1', 'f2'), [origen, destino]);
    expect(r.valido).toBe(true);
    expect(r.avisos).toEqual([]);
  });

  it('avisa cuando la entalpía no se conserva, sin invalidar el proceso', () => {
    const origen = estado('f1', 'R134a', 'T', 30, 'X', 0);
    const destino = estado('f2', 'R134a', 'P', 200, 'H', origen.H + 25);

    const r = evaluarProceso(proceso('isentalpico', 'f1', 'f2'), [origen, destino]);
    expect(r.valido).toBe(true);
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0].clave).toBe('aviso_magnitud_no_constante');
    expect(r.avisos[0].datos.magnitud).toBe('H');
  });
});

describe('compresión con rendimiento isentrópico', () => {
  // Aspiración de vapor saturado a -10 ºC, descarga a 1000 kPa
  const origen = estado('f1', 'R134a', 'T', -10, 'X', 100);
  const destinoCon = (rendimiento) => {
    const hIsentropico = getPropFluido('R134a', 'H', 'P', 1000, 'S', origen.S);
    const h2 = origen.H + (hIsentropico - origen.H) / rendimiento;
    return estado('f2', 'R134a', 'P', 1000, 'H', h2);
  };

  it('recupera el rendimiento con el que se construyó el estado destino', () => {
    const rendimiento = getRendimientoIsentropico(origen, destinoCon(0.7));
    expect(rendimiento).toBeCloseTo(0.7, 4);
  });

  it('no avisa de una compresión física razonable', () => {
    const r = evaluarProceso(proceso('compresion_isentropica', 'f1', 'f2'), [origen, destinoCon(0.7)]);
    expect(r.valido).toBe(true);
    expect(r.avisos).toEqual([]);
  });

  it('avisa si el destino no está a mayor presión', () => {
    const destino = estado('f2', 'R134a', 'P', 100, 'X', 100);
    const r = evaluarProceso(proceso('compresion_isentropica', 'f1', 'f2'), [origen, destino]);
    expect(r.avisos.map((a) => a.clave)).toEqual(['aviso_compresion_sin_aumento_presion']);
  });

  it('avisa si el rendimiento sale fuera de (0, 1] — compresión mejor que la isentrópica', () => {
    const r = evaluarProceso(proceso('compresion_isentropica', 'f1', 'f2'), [origen, destinoCon(1.3)]);
    const claves = r.avisos.map((a) => a.clave);
    expect(claves).toContain('aviso_entropia_decrece');
    expect(claves).toContain('aviso_rendimiento_fuera_rango');
  });
});

describe('isobárico e isotermo', () => {
  it('acepta un recalentamiento a presión constante', () => {
    const origen = estado('f1', 'R134a', 'P', 200, 'X', 100);
    const destino = estado('f2', 'R134a', 'P', 200, 'T', origen.T + 8);

    const r = evaluarProceso(proceso('isobarico', 'f1', 'f2'), [origen, destino]);
    expect(r.avisos).toEqual([]);
  });

  it('avisa si la presión cambia', () => {
    const origen = estado('f1', 'R134a', 'P', 200, 'X', 100);
    const destino = estado('f2', 'R134a', 'P', 260, 'X', 100);

    const r = evaluarProceso(proceso('isobarico', 'f1', 'f2'), [origen, destino]);
    expect(r.avisos[0].datos.magnitud).toBe('P');
  });

  it('acepta una compresión isoterma', () => {
    const origen = estado('f1', 'Agua', 'T', 200, 'P', 500);
    const destino = estado('f2', 'Agua', 'T', 200, 'P', 900);

    const r = evaluarProceso(proceso('isotermo', 'f1', 'f2'), [origen, destino]);
    expect(r.avisos).toEqual([]);
  });
});

describe('errores estructurales', () => {
  const origen = estado('f1', 'R134a', 'T', 30, 'X', 0);

  it('marca el proceso como inválido si el destino ya no existe, sin romperse', () => {
    const r = evaluarProceso(proceso('isentalpico', 'f1', 'f9'), [origen]);
    expect(r.valido).toBe(false);
    expect(r.errores.map((e) => e.clave)).toEqual(['error_destino_inexistente']);
    expect(r.avisos).toEqual([]);
  });

  it('rechaza conectar estados de fluidos distintos', () => {
    const otroFluido = estado('f2', 'Agua', 'T', 30, 'X', 0);
    const r = evaluarProceso(proceso('isentalpico', 'f1', 'f2'), [origen, otroFluido]);
    expect(r.valido).toBe(false);
    expect(r.errores.map((e) => e.clave)).toContain('error_fluidos_distintos');
  });

  it('rechaza un tipo desconocido', () => {
    const r = evaluarProceso(proceso('inexistente', 'f1', 'f1'), [origen]);
    expect(r.valido).toBe(false);
    expect(r.errores[0].clave).toBe('error_tipo_desconocido');
  });

  it('rechaza un estado que CoolProp no resuelve', () => {
    const roto = { id: 'f2', nombre: 'roto', fluido: 'R134a', T: NaN, P: NaN, H: NaN, S: NaN };
    const r = evaluarProceso(proceso('isentalpico', 'f1', 'f2'), [origen, roto]);
    expect(r.valido).toBe(false);
    expect(r.errores.map((e) => e.clave)).toContain('error_estado_no_resoluble');
  });
});
