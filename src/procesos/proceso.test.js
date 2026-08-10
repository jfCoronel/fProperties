import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getObjetoFluido, getPropFluido } from '../propFluidos/fluidos';
import {
  evaluarProceso,
  derivadosProceso,
  trazarProceso,
  parejaDestino,
  planificarPropagacion,
  getColumnasVisibles,
  getDefiniciones,
  getDefinicion,
  getParametrosVisibles,
  COLUMNAS_RESULTADO
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

describe('catálogo de columnas de resultado', () => {
  it('toda columna declarada por un tipo existe en el catálogo', () => {
    const claves = COLUMNAS_RESULTADO.map((columna) => columna.clave);
    getDefiniciones('fluido').forEach((tipo) => {
      tipo.columnas.forEach((clave) => expect(claves).toContain(clave));
    });
  });

  it('todos los tipos saben calcular sus derivados', () => {
    getDefiniciones('fluido').forEach((tipo) => {
      expect(typeof RESOLVEDORES[tipo.restriccion.resolvedor].derivados).toBe('function');
    });
  });

  it('ordena las columnas por el catálogo, no por el tipo que las pide', () => {
    const definiciones = [getDefinicion('isentalpico'), getDefinicion('compresion_isentropica')];
    const claves = getColumnasVisibles(definiciones, true).map((columna) => columna.clave);

    // dh y ds van antes que dt aunque el primer tipo de la lista solo pida ds y dt
    expect(claves).toEqual([
      'dh', 'ds', 'dt', 'w_esp', 'rel_compresion', 'rel_expansion', 'eta_real', 'potencia'
    ]);
  });

  it('oculta las columnas de potencia mientras no haya caudal', () => {
    const definiciones = [getDefinicion('compresion_isentropica')];
    const claves = getColumnasVisibles(definiciones, false).map((columna) => columna.clave);
    expect(claves).not.toContain('potencia');
  });
});

describe('magnitudes derivadas', () => {
  const derivados = (tipo, origen, destino, parametros = {}) => {
    const p = proceso(tipo, origen.id, destino.id, parametros);
    return derivadosProceso(p, evaluarProceso(p, [origen, destino]));
  };

  it('compresión: trabajo, relación de compresión y rendimiento real', () => {
    const origen = estado('f1', 'R134a', 'T', -10, 'X', 100);
    const hIsentropico = getPropFluido('R134a', 'H', 'P', 1000, 'S', origen.S);
    const destino = estado('f2', 'R134a', 'P', 1000, 'H', origen.H + (hIsentropico - origen.H) / 0.7);

    const d = derivados('compresion_isentropica', origen, destino);

    expect(d.dh).toBeCloseTo(destino.H - origen.H, 6);
    expect(d.w_esp).toBe(d.dh);
    expect(d.w_esp).toBeGreaterThan(0); // el compresor entrega trabajo al fluido
    expect(d.rel_compresion).toBeCloseTo(destino.P / origen.P, 6);
    expect(d.eta_real).toBeCloseTo(0.7, 4);
    expect(d.potencia).toBeUndefined(); // sin caudal no hay potencia
  });

  it('la potencia aparece al declarar caudal y es el trabajo por el gasto', () => {
    const origen = estado('f1', 'R134a', 'T', -10, 'X', 100);
    const hIsentropico = getPropFluido('R134a', 'H', 'P', 1000, 'S', origen.S);
    const destino = estado('f2', 'R134a', 'P', 1000, 'H', origen.H + (hIsentropico - origen.H) / 0.7);

    const d = derivados('compresion_isentropica', origen, destino, { m_punto: 0.05 });
    expect(d.potencia).toBeCloseTo(0.05 * d.w_esp, 6);
  });

  it('isobárico: el calor específico es el salto de entalpía', () => {
    const origen = estado('f1', 'R134a', 'P', 200, 'X', 0);
    const destino = estado('f2', 'R134a', 'P', 200, 'X', 100);

    const d = derivados('isobarico', origen, destino, { m_punto: 0.1 });
    expect(d.q_esp).toBeCloseTo(destino.H - origen.H, 6);
    expect(d.q_esp).toBeGreaterThan(0); // evaporación: absorbe calor
    expect(d.potencia).toBeCloseTo(0.1 * d.q_esp, 6);
  });

  it('laminación: enfría, genera entropía y solo trae sus columnas', () => {
    const origen = estado('f1', 'R134a', 'T', 40, 'X', 0);
    const destino = estado('f2', 'R134a', 'P', 200, 'H', origen.H);

    const d = derivados('isentalpico', origen, destino);
    expect(d.dt).toBeLessThan(0);
    expect(d.ds).toBeGreaterThan(0);
    expect(d.rel_expansion).toBeCloseTo(origen.P / destino.P, 6);
    // el tipo no declara dh: aunque valga cero, no ensucia la tabla
    expect(d.dh).toBeUndefined();
  });

  it('isotermo: el calor sale de T·Δs y es negativo al comprimir', () => {
    const origen = estado('f1', 'Agua', 'T', 200, 'P', 500);
    const destino = estado('f2', 'Agua', 'T', 200, 'P', 900);

    const d = derivados('isotermo', origen, destino);
    expect(d.q_esp).toBeCloseTo((200 + 273.15) * d.ds, 6);
    expect(d.q_esp).toBeLessThan(0);
  });

  it('un proceso inválido no produce derivados', () => {
    const origen = estado('f1', 'R134a', 'T', 40, 'X', 0);
    const p = proceso('isentalpico', 'f1', 'f9');
    expect(derivadosProceso(p, evaluarProceso(p, [origen]))).toEqual({});
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

describe('trazado de la curva', () => {
  const trazar = (tipo, origen, destino, parametros = {}) => {
    const p = proceso(tipo, origen.id, destino.id, parametros);
    return trazarProceso(p, evaluarProceso(p, [origen, destino]));
  };

  it('empieza y acaba exactamente en los estados de la tabla', () => {
    const origen = estado('f1', 'R134a', 'T', 40, 'X', 0);
    const destino = estado('f2', 'R134a', 'P', 200, 'H', origen.H);

    const curva = trazar('isentalpico', origen, destino);
    expect(curva[0]).toBe(origen);
    expect(curva[curva.length - 1]).toBe(destino);
    expect(curva).toHaveLength(getDefinicion('isentalpico').trazado.nPuntos);
  });

  it('laminación: mantiene la entalpía y baja la presión monótonamente', () => {
    const origen = estado('f1', 'R134a', 'T', 40, 'X', 0);
    const destino = estado('f2', 'R134a', 'P', 200, 'H', origen.H);

    const curva = trazar('isentalpico', origen, destino);
    curva.forEach((punto) => expect(punto.H).toBeCloseTo(origen.H, 6));
    for (let i = 1; i < curva.length; i++) {
      expect(curva[i].P).toBeLessThan(curva[i - 1].P);
    }
  });

  it('compresión: la curva sube en presión y no retrocede en entropía', () => {
    const origen = estado('f1', 'R134a', 'T', -10, 'X', 100);
    const hIsentropico = getPropFluido('R134a', 'H', 'P', 1000, 'S', origen.S);
    const destino = estado('f2', 'R134a', 'P', 1000, 'H', origen.H + (hIsentropico - origen.H) / 0.7);

    const curva = trazar('compresion_isentropica', origen, destino);
    expect(curva).toHaveLength(25);
    for (let i = 1; i < curva.length; i++) {
      expect(curva[i].P).toBeGreaterThan(curva[i - 1].P);
      expect(curva[i].S).toBeGreaterThan(curva[i - 1].S - 1e-9);
    }
  });

  it('isobárico: todos los puntos comparten presión y cruzan la campana', () => {
    const origen = estado('f1', 'R134a', 'P', 200, 'X', 0);
    const destino = estado('f2', 'R134a', 'P', 200, 'X', 100);

    const curva = trazar('isobarico', origen, destino);
    curva.forEach((punto) => expect(punto.P).toBeCloseTo(200, 6));
    expect(curva.some((punto) => punto.X > 20 && punto.X < 80)).toBe(true);
  });

  it('descarta los puntos que CoolProp no resuelve', () => {
    // Isotermo dentro de la campana: p y T dejan de ser independientes
    const origen = estado('f1', 'R134a', 'P', 300, 'X', 20);
    const destino = estado('f2', 'R134a', 'P', 300, 'X', 80);

    const curva = trazar('isotermo', origen, destino);
    expect(curva).toHaveLength(2); // solo sobreviven los extremos
    curva.forEach((punto) => expect(Number.isFinite(punto.H)).toBe(true));
  });

  it('un proceso inválido no traza nada', () => {
    const origen = estado('f1', 'R134a', 'T', 40, 'X', 0);
    const p = proceso('isentalpico', 'f1', 'f9');
    expect(trazarProceso(p, evaluarProceso(p, [origen]))).toEqual([]);
  });
});

describe('modo calculado: estado destino', () => {
  const calculado = (tipo, origen, destino, parametros) => ({
    id: 'p1', tipo, origenes: [origen], destino, modoDestino: 'calculado', parametros
  });

  it('compresión: el estado generado tiene el rendimiento pedido', () => {
    const origen = estado('f1', 'R134a', 'T', -10, 'X', 100);
    const pareja = parejaDestino(calculado('compresion_isentropica', 'f1', 'f2', {
      p_final: 1000, eta: 0.75
    }), [origen]);

    const generado = estado('f2', 'R134a', pareja.in1Id, pareja.in1Val, pareja.in2Id, pareja.in2Val);
    expect(generado.P).toBeCloseTo(1000, 6);
    expect(getRendimientoIsentropico(origen, generado)).toBeCloseTo(0.75, 4);
  });

  it('isobárico: el título permite pedir líquido saturado, que la temperatura no distingue', () => {
    const origen = estado('f1', 'R134a', 'P', 1000, 'T', 60);
    const pareja = parejaDestino(calculado('isobarico', 'f1', 'f2', { x_final: 0 }), [origen]);

    const generado = estado('f2', 'R134a', pareja.in1Id, pareja.in1Val, pareja.in2Id, pareja.in2Val);
    expect(generado.P).toBeCloseTo(1000, 6);
    expect(generado.X).toBeCloseTo(0, 6);
  });

  it('laminación e isotermo conservan su magnitud al generar', () => {
    const origen = estado('f1', 'R134a', 'P', 1000, 'X', 0);

    const laminado = parejaDestino(calculado('isentalpico', 'f1', 'f2', { p_final: 200 }), [origen]);
    expect(laminado).toEqual({ in1Id: 'P', in1Val: 200, in2Id: 'H', in2Val: origen.H });

    const isotermo = parejaDestino(calculado('isotermo', 'f1', 'f2', { p_final: 200 }), [origen]);
    expect(isotermo).toEqual({ in1Id: 'P', in1Val: 200, in2Id: 'T', in2Val: origen.T });
  });

  it('sin los parámetros que pide el tipo, ni calcula ni deja pasar el proceso', () => {
    const origen = estado('f1', 'R134a', 'T', -10, 'X', 100);
    const destino = estado('f2', 'R134a', 'P', 1000, 'T', 60);

    const sinParametros = calculado('compresion_isentropica', 'f1', 'f2', {});
    expect(parejaDestino(sinParametros, [origen])).toBeNull();

    const r = evaluarProceso(sinParametros, [origen, destino]);
    expect(r.valido).toBe(false);
    expect(r.errores.map((e) => e.clave)).toContain('error_parametro_requerido');
  });

  it('el isobárico exige temperatura o título, indistintamente', () => {
    const origen = estado('f1', 'R134a', 'P', 1000, 'T', 60);
    const destino = estado('f2', 'R134a', 'P', 1000, 'X', 0);

    const sinNada = evaluarProceso(calculado('isobarico', 'f1', 'f2', {}), [origen, destino]);
    expect(sinNada.errores.map((e) => e.clave)).toContain('error_parametro_alguno');

    const conTitulo = evaluarProceso(calculado('isobarico', 'f1', 'f2', { x_final: 0 }), [origen, destino]);
    expect(conTitulo.valido).toBe(true);
  });

  it('avisa cuando el estado destino no es el que sale del cálculo', () => {
    const origen = estado('f1', 'R134a', 'P', 1000, 'X', 0);
    const destino = estado('f2', 'R134a', 'P', 200, 'H', origen.H + 30); // no es la laminación

    const r = evaluarProceso(calculado('isentalpico', 'f1', 'f2', { p_final: 200 }), [origen, destino]);
    expect(r.avisos.map((a) => a.clave)).toContain('aviso_cierre_discrepancia');
  });
});

describe('orden de propagación', () => {
  const p = (id, origen, destino, modoDestino = 'calculado') => ({
    id, origenes: [origen], destino, modoDestino, tipo: 'isentalpico', parametros: {}
  });

  it('ordena una cadena aunque venga desordenada en la lista', () => {
    const { orden, cierres } = planificarPropagacion([
      p('p3', 'f3', 'f4'), p('p1', 'f1', 'f2'), p('p2', 'f2', 'f3')
    ]);
    expect(orden.map((proceso) => proceso.id)).toEqual(['p1', 'p2', 'p3']);
    expect(cierres).toEqual([]);
  });

  it('un ciclo cerrado deja de generar en su última arista, sin bucle infinito', () => {
    const { orden, cierres } = planificarPropagacion([
      p('p1', 'f1', 'f2'), p('p2', 'f2', 'f3'), p('p3', 'f3', 'f4'), p('p4', 'f4', 'f1')
    ]);
    expect(orden.map((proceso) => proceso.id)).toEqual(['p1', 'p2', 'p3']);
    expect(cierres.map((proceso) => proceso.id)).toEqual(['p4']);
  });

  it('ignora los procesos manuales y los incompletos', () => {
    const { orden } = planificarPropagacion([
      p('p1', 'f1', 'f2', 'manual'), p('p2', null, 'f3'), p('p3', 'f3', null)
    ]);
    expect(orden).toEqual([]);
  });

  it('dos procesos que generan el mismo estado: gana el primero', () => {
    const { orden, cierres } = planificarPropagacion([p('p1', 'f1', 'f3'), p('p2', 'f2', 'f3')]);
    expect(orden.map((proceso) => proceso.id)).toEqual(['p1']);
    expect(cierres.map((proceso) => proceso.id)).toEqual(['p2']);
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
