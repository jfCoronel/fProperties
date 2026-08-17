// La física psicrométrica: los seis tipos del dominio del aire húmedo.
//
// Lo que se fija aquí son los balances, que es donde un signo cambiado o un
// millar de más no se ve a ojo: el reparto sensible/latente que debe sumar Δh, el
// agua condensada, la eficacia de saturación y —sobre todo— el balance de masa y
// energía de la mezcla, que es el único tipo con dos corrientes de entrada.
import { describe, it, expect, beforeAll } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { getObjetoAireHumedo, getPropAireHumedo } from '../propFluidos/aires';
import {
  evaluarProceso, derivadosProceso, trazarProceso, parejaDestino,
  getDefiniciones, getDefinicion, getParametrosVisibles
} from './proceso';
import { detectarTipo } from './deteccion';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

// Estados a nivel del mar, que es la presión por defecto de la aplicación.
function aire(id, prop2, val2, prop3, val3, presion = 101.325) {
  return {
    id,
    nombre: id,
    ...getObjetoAireHumedo('P', presion, prop2, val2, prop3, val3)
  };
}

function proceso(tipo, origenes, destino, parametros = {}, modoDestino = 'manual') {
  return {
    id: 'p1',
    tipo,
    origenes: Array.isArray(origenes) ? origenes : [origenes],
    destino,
    modoDestino,
    parametros
  };
}

const evaluar = (p, estados) => evaluarProceso(p, estados);
const claves = (evaluacion) => [...evaluacion.errores, ...evaluacion.avisos].map((m) => m.clave);

describe('catálogo del dominio del aire', () => {
  it('declara los seis tipos y todos tienen resolvedor y columnas del catálogo', () => {
    const tipos = getDefiniciones('aire');
    expect(tipos.map((t) => t.clave)).toEqual([
      'sensible', 'enfriamiento_deshumidificacion', 'humectacion_adiabatica',
      'humectacion_vapor', 'mezcla_adiabatica', 'generico_aire'
    ]);
    tipos.forEach((tipo) => {
      expect(tipo.dominio).toBe('aire');
      expect(tipo.columnas.length).toBeGreaterThan(0);
    });
  });

  it('la mezcla es el único con dos orígenes, y no pide el caudal común', () => {
    const mezcla = getDefinicion('mezcla_adiabatica');
    expect(mezcla.aridad.origenes).toBe(2);

    // El caudal total es resultado, no entrada: pedirlo sería pedir dos veces lo
    // mismo y permitir que se contradigan.
    const parametros = getParametrosVisibles(mezcla, 'calculado').map((p) => p.clave);
    expect(parametros).toEqual(['m_1', 'm_2']);
    expect(getParametrosVisibles(getDefinicion('sensible'), 'calculado').map((p) => p.clave))
      .toContain('m_punto');
  });
});

describe('calentamiento y enfriamiento sensible', () => {
  const entrada = aire('a1', 'T', 15, 'HR', 60);
  const salida = aire('a2', 'T', 30, 'W', entrada.W);
  const estados = [entrada, salida];

  it('no avisa si la humedad absoluta se mantiene, y da q = Δh', () => {
    const p = proceso('sensible', 'a1', 'a2', { m_punto: 2 });
    const evaluacion = evaluar(p, estados);
    const derivados = derivadosProceso(p, evaluacion);

    expect(evaluacion.avisos).toEqual([]);
    expect(derivados.q_esp).toBeCloseTo(salida.H - entrada.H, 6);
    expect(derivados.dt).toBeCloseTo(15, 6);
    expect(derivados.potencia).toBeCloseTo(2 * (salida.H - entrada.H), 6);
  });

  it('avisa si la humedad absoluta cambia', () => {
    const humedo = aire('a2', 'T', 30, 'HR', 80);
    const p = proceso('sensible', 'a1', 'a2');
    expect(claves(evaluar(p, [entrada, humedo]))).toContain('aviso_magnitud_no_constante');
  });

  it('avisa si se enfría por debajo del rocío, donde ya no es sensible', () => {
    const frio = aire('a2', 'T', entrada.TR - 5, 'W', entrada.W);
    const p = proceso('sensible', 'a1', 'a2');
    expect(claves(evaluar(p, [entrada, frio]))).toContain('aviso_enfriamiento_bajo_rocio');
  });

  it('genera el destino a la temperatura pedida y con la humedad del origen', () => {
    const p = proceso('sensible', 'a1', 'a2', { t_final: 30 }, 'calculado');
    const entradas = parejaDestino(p, [entrada]);
    const generado = getObjetoAireHumedo(
      entradas.in1Id, entradas.in1Val, entradas.in2Id, entradas.in2Val,
      entradas.in3Id, entradas.in3Val
    );

    expect(generado.T).toBeCloseTo(30, 6);
    expect(generado.W).toBeCloseTo(entrada.W, 6);
    expect(generado.P).toBeCloseTo(entrada.P, 6);
  });
});

describe('enfriamiento con deshumidificación', () => {
  const entrada = aire('a1', 'T', 27, 'HR', 55);
  const salida = aire('a2', 'T', 13, 'HR', 95);
  const estados = [entrada, salida];
  const p = proceso('enfriamiento_deshumidificacion', 'a1', 'a2', { m_punto: 1.5 });

  it('reparte el calor en sensible y latente, y los dos suman el total', () => {
    const derivados = derivadosProceso(p, evaluar(p, estados));

    expect(derivados.q_sensible).toBeLessThan(0);
    expect(derivados.q_latente).toBeLessThan(0);
    // Es la comprobación que da sentido al reparto: pasar por el estado
    // intermedio no puede inventar ni perder energía.
    expect(derivados.q_sensible + derivados.q_latente).toBeCloseTo(derivados.q_esp, 6);
    expect(derivados.shr).toBeCloseTo(derivados.q_sensible / derivados.q_esp, 6);
    expect(derivados.shr).toBeGreaterThan(0);
    expect(derivados.shr).toBeLessThan(1);
  });

  it('el condensado sale de la corriente, así que su caudal es negativo', () => {
    const derivados = derivadosProceso(p, evaluar(p, estados));
    expect(derivados.dw).toBeLessThan(0);
    expect(derivados.m_agua).toBeCloseTo(1.5 * (salida.W - entrada.W) / 1000, 9);
    expect(derivados.m_agua).toBeLessThan(0);
  });

  it('avisa si la humedad sube, que es lo contrario de deshumidificar', () => {
    const masHumedo = aire('a2', 'T', 20, 'W', entrada.W + 2);
    const q = proceso('enfriamiento_deshumidificacion', 'a1', 'a2');
    expect(claves(evaluar(q, [entrada, masHumedo])))
      .toContain('aviso_humedad_sube_deshumidificando');
  });

  it('genera el destino con la temperatura y la humedad relativa pedidas', () => {
    const q = proceso(
      'enfriamiento_deshumidificacion', 'a1', 'a2', { t_final: 13, hr_final: 95 }, 'calculado'
    );
    const entradas = parejaDestino(q, [entrada]);
    const generado = getObjetoAireHumedo(
      entradas.in1Id, entradas.in1Val, entradas.in2Id, entradas.in2Val,
      entradas.in3Id, entradas.in3Val
    );

    expect(generado.T).toBeCloseTo(13, 6);
    expect(generado.HR).toBeCloseTo(95, 4);
  });
});

describe('humectación adiabática', () => {
  const entrada = aire('a1', 'T', 35, 'HR', 20);
  const salida = aire('a2', 'TH', entrada.TH, 'HR', 90);
  const estados = [entrada, salida];

  it('mantiene el bulbo húmedo, enfría y humedece a la vez', () => {
    const p = proceso('humectacion_adiabatica', 'a1', 'a2', { m_punto: 1 });
    const evaluacion = evaluar(p, estados);
    const derivados = derivadosProceso(p, evaluacion);

    expect(evaluacion.avisos).toEqual([]);
    expect(derivados.dt).toBeLessThan(0);
    expect(derivados.dw).toBeGreaterThan(0);
    // El agua entra en la corriente: caudal positivo, al revés que el condensado.
    expect(derivados.m_agua).toBeGreaterThan(0);
  });

  it('la eficacia de saturación es 1 cuando sale saturado', () => {
    const saturado = aire('a2', 'TH', entrada.TH, 'HR', 100);
    const p = proceso('humectacion_adiabatica', 'a1', 'a2');
    const derivados = derivadosProceso(p, evaluar(p, [entrada, saturado]));

    expect(derivados.eficacia).toBeCloseTo(1, 3);
  });

  it('la eficacia queda entre 0 y 1 en un caso real', () => {
    const p = proceso('humectacion_adiabatica', 'a1', 'a2');
    const derivados = derivadosProceso(p, evaluar(p, estados));

    expect(derivados.eficacia).toBeGreaterThan(0);
    expect(derivados.eficacia).toBeLessThan(1);
  });

  it('es el único tipo del aire que no es una recta: traza puntos intermedios', () => {
    const p = proceso('humectacion_adiabatica', 'a1', 'a2');
    const curva = trazarProceso(p, evaluar(p, estados));

    expect(curva.length).toBe(getDefinicion('humectacion_adiabatica').trazado.nPuntos);
    curva.forEach((punto) => expect(punto.TH).toBeCloseTo(entrada.TH, 2));
    // La curva avanza monótonamente de la seca de entrada a la de salida
    for (let i = 1; i < curva.length; i++) {
      expect(curva[i].T).toBeLessThan(curva[i - 1].T + 1e-9);
    }
  });
});

describe('humectación con vapor', () => {
  const entrada = aire('a1', 'T', 20, 'HR', 30);
  const H_VAPOR = 2676;
  const wFinal = entrada.W + 4;
  const salida = aire('a2', 'W', wFinal, 'H', entrada.H + 4 * H_VAPOR / 1000);

  it('recupera la entalpía del agua con la que se construyó el estado', () => {
    const p = proceso('humectacion_vapor', 'a1', 'a2', { m_punto: 1 });
    const derivados = derivadosProceso(p, evaluar(p, [entrada, salida]));

    expect(derivados.dw).toBeCloseTo(4, 4);
    expect(derivados.h_agua_real).toBeCloseTo(H_VAPOR, 0);
    expect(derivados.m_agua).toBeCloseTo(0.004, 9);
  });

  it('genera el destino cerrando el balance de energía', () => {
    const p = proceso(
      'humectacion_vapor', 'a1', 'a2', { w_final: wFinal, h_agua: H_VAPOR }, 'calculado'
    );
    const entradas = parejaDestino(p, [entrada]);

    expect(entradas.in2Val).toBeCloseTo(wFinal, 6);
    expect(entradas.in3Val).toBeCloseTo(entrada.H + 4 * H_VAPOR / 1000, 6);
  });

  it('avisa si la humedad baja, que es lo contrario de humectar', () => {
    const seco = aire('a2', 'T', 20, 'W', entrada.W - 1);
    const p = proceso('humectacion_vapor', 'a1', 'a2');
    expect(claves(evaluar(p, [entrada, seco]))).toContain('aviso_humedad_baja_humectando');
  });
});

describe('mezcla adiabática de dos corrientes', () => {
  // Caso de manual: aire exterior caluroso y húmedo con aire de retorno.
  const exterior = aire('a1', 'T', 34, 'HR', 60);
  const retorno = aire('a2', 'T', 24, 'HR', 50);
  const parametros = { m_1: 1, m_2: 3 };

  const wMezcla = (1 * exterior.W + 3 * retorno.W) / 4;
  const hMezcla = (1 * exterior.H + 3 * retorno.H) / 4;
  const mezcla = aire('a3', 'W', wMezcla, 'H', hMezcla);
  const estados = [exterior, retorno, mezcla];
  const p = proceso('mezcla_adiabatica', ['a1', 'a2'], 'a3', parametros);

  it('el estado de mezcla cumple los balances de masa y de energía', () => {
    const evaluacion = evaluar(p, estados);
    expect(evaluacion.valido).toBe(true);
    expect(evaluacion.avisos).toEqual([]);
  });

  it('cae entre los dos estados de entrada, más cerca del de mayor caudal', () => {
    // Con tres partes de retorno por una de exterior, la mezcla se parece al
    // retorno: es la regla de la palanca sobre la recta de mezcla.
    expect(mezcla.W).toBeGreaterThan(retorno.W);
    expect(mezcla.W).toBeLessThan(exterior.W);
    expect(Math.abs(mezcla.W - retorno.W)).toBeLessThan(Math.abs(mezcla.W - exterior.W));
  });

  it('da el caudal total y la fracción de la primera corriente', () => {
    const derivados = derivadosProceso(p, evaluar(p, estados));
    expect(derivados.m_total).toBeCloseTo(4, 9);
    expect(derivados.fraccion_mezcla).toBeCloseTo(0.25, 9);
  });

  it('avisa cuando el estado declarado no cierra el balance', () => {
    const inventado = aire('a3', 'T', 20, 'HR', 40);
    const evaluacion = evaluar(p, [exterior, retorno, inventado]);

    expect(claves(evaluacion)).toContain('aviso_mezcla_no_cuadra');
    expect(claves(evaluacion)).toContain('aviso_mezcla_energia_no_cuadra');
  });

  it('genera el estado de mezcla a partir de los dos caudales', () => {
    const q = proceso('mezcla_adiabatica', ['a1', 'a2'], 'a3', parametros, 'calculado');
    const entradas = parejaDestino(q, [exterior, retorno]);

    expect(entradas.in2Val).toBeCloseTo(wMezcla, 6);
    expect(entradas.in3Val).toBeCloseTo(hMezcla, 6);
  });

  it('es inválido si no se le dan los dos orígenes', () => {
    const manco = proceso('mezcla_adiabatica', ['a1'], 'a3', parametros);
    expect(evaluar(manco, estados).valido).toBe(false);
  });

  it('traza la recta de mezcla completa, pasando por el segundo origen', () => {
    const curva = trazarProceso(p, evaluar(p, estados));
    expect(curva.map((punto) => punto.W)).toEqual([exterior.W, retorno.W, mezcla.W]);
  });
});

describe('estados incompatibles', () => {
  it('dos presiones totales distintas no se pueden conectar', () => {
    const nivelMar = aire('a1', 'T', 20, 'HR', 50);
    const enAltura = aire('a2', 'T', 25, 'HR', 50, 90);
    const p = proceso('sensible', 'a1', 'a2');

    const evaluacion = evaluar(p, [nivelMar, enAltura]);
    expect(evaluacion.valido).toBe(false);
    expect(claves(evaluacion)).toContain('error_presiones_distintas');
  });
});

describe('detección del tipo en el aire húmedo', () => {
  const entrada = aire('a1', 'T', 30, 'HR', 40);

  it('humedad constante: sensible', () => {
    const salida = aire('a2', 'T', 40, 'W', entrada.W);
    expect(detectarTipo(entrada, salida, 'aire')).toBe('sensible');
  });

  it('bulbo húmedo constante y humedad que sube: humectación adiabática', () => {
    const salida = aire('a2', 'TH', entrada.TH, 'HR', 95);
    expect(detectarTipo(entrada, salida, 'aire')).toBe('humectacion_adiabatica');
  });

  it('baja la seca y baja la humedad: batería de frío', () => {
    const salida = aire('a2', 'T', 12, 'HR', 95);
    expect(detectarTipo(entrada, salida, 'aire')).toBe('enfriamiento_deshumidificacion');
  });

  it('sube la humedad sin mantener el bulbo húmedo: humectación con vapor', () => {
    const salida = aire('a2', 'T', 32, 'W', entrada.W + 5);
    expect(detectarTipo(entrada, salida, 'aire')).toBe('humectacion_vapor');
  });

  it('no confunde los dominios: un estado de aire no se juzga como fluido', () => {
    const salida = aire('a2', 'T', 40, 'W', entrada.W);
    expect(detectarTipo(entrada, salida, 'fluido')).toBeNull();
  });
});

describe('el comodín del aire', () => {
  const entrada = aire('a1', 'T', 20, 'HR', 50);
  const salida = aire('a2', 'T', 26, 'HR', 70);

  it('nunca es incoherente y solo mide los saltos', () => {
    const p = proceso('generico_aire', 'a1', 'a2');
    const evaluacion = evaluar(p, [entrada, salida]);
    const derivados = derivadosProceso(p, evaluacion);

    expect(evaluacion.valido).toBe(true);
    expect(evaluacion.avisos).toEqual([]);
    expect(derivados.dw).toBeCloseTo(salida.W - entrada.W, 6);
    expect(derivados.q_esp).toBeUndefined();
  });

  it('no genera estado destino', () => {
    const p = proceso('generico_aire', 'a1', 'a2', {}, 'calculado');
    expect(parejaDestino(p, [entrada])).toBeNull();
  });
});

describe('coherencia con CoolProp', () => {
  it('la humedad absoluta que da el estado es la que devuelve una consulta suelta', () => {
    const estado = aire('a1', 'T', 25, 'HR', 50);
    expect(getPropAireHumedo('W', 'P', 101.325, 'T', 25, 'HR', 50)).toBeCloseTo(estado.W, 9);
  });
});
