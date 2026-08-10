// Motor de procesos: lee la tabla de definiciones, resuelve las referencias a
// estados y evalúa la coherencia de cada proceso. Sin dependencias de React,
// para que sea testeable y reutilizable.
// Ver DOCUMENTACION.md §3.4.
import definiciones from './definiciones.json';
import { RESOLVEDORES, dentroDeTolerancia } from './resolvedores';
import { getPropFluido } from '../propFluidos/fluidos';

export const ESQUEMA_PROCESOS = definiciones.esquema;
export const PARAMETROS_COMUNES = definiciones.parametrosComunes;
export const COLUMNAS_RESULTADO = definiciones.columnasResultado;

// Magnitudes que todo estado debe tener resueltas para poder evaluar un proceso.
const MAGNITUDES_REQUERIDAS = ['T', 'P', 'H', 'S'];

export function getDefiniciones(dominio = 'fluido') {
  return definiciones.tipos.filter((tipo) => tipo.dominio === dominio);
}

export function getDefinicion(clave) {
  return definiciones.tipos.find((tipo) => tipo.clave === clave) ?? null;
}

// En modo manual el usuario crea los dos estados y el proceso deduce las
// magnitudes: los parámetros marcados como soloCalculado son entradas que
// únicamente hacen falta cuando el proceso genera el estado destino (modo calculado).
export function getParametrosVisibles(definicion, modoDestino = 'manual') {
  if (!definicion) return [];
  const propios = modoDestino === 'calculado'
    ? definicion.parametros
    : definicion.parametros.filter((parametro) => !parametro.soloCalculado);
  return [...propios, ...PARAMETROS_COMUNES];
}

export function getParametrosPorDefecto(definicion, modoDestino = 'manual') {
  const valores = {};
  getParametrosVisibles(definicion, modoDestino).forEach((parametro) => {
    if (parametro.defecto !== undefined) {
      valores[parametro.clave] = parametro.defecto;
    }
  });
  return valores;
}

export function getColumnaResultado(clave) {
  return COLUMNAS_RESULTADO.find((columna) => columna.clave === clave) ?? null;
}

// Columnas que muestra un conjunto de procesos, en el orden del catálogo (no en
// el de cada tipo) para que una columna compartida no salte de sitio según qué
// proceso encabece la tabla.
export function getColumnasVisibles(definicionesProcesos, hayCaudal = true) {
  const declaradas = new Set();
  definicionesProcesos.forEach((definicion) => {
    (definicion?.columnas ?? []).forEach((clave) => declaradas.add(clave));
  });
  return COLUMNAS_RESULTADO.filter(
    (columna) => declaradas.has(columna.clave) && (hayCaudal || !columna.requiereCaudal)
  );
}

export function tieneCaudal(proceso) {
  return Number.isFinite(proceso?.parametros?.m_punto);
}

/**
 * Magnitudes derivadas de un proceso ya evaluado (Δh, Δs, w, η real, potencia…).
 *
 * Solo devuelve las claves que el tipo declara en `columnas` y cuyo valor es
 * finito: el JSON sigue siendo el contrato, y un resolvedor que calcule de más
 * no ensucia la tabla. Un proceso inválido no produce derivados.
 */
export function derivadosProceso(proceso, evaluacion) {
  if (!evaluacion?.valido) return {};

  const definicion = evaluacion.definicion;
  const resolvedor = RESOLVEDORES[definicion.restriccion.resolvedor];
  if (!resolvedor || typeof resolvedor.derivados !== 'function') return {};

  const calculados = resolvedor.derivados(
    evaluacion.origenes, evaluacion.destino, proceso.parametros ?? {}, definicion
  );

  const valores = {};
  (definicion.columnas ?? []).forEach((clave) => {
    if (Number.isFinite(calculados[clave])) {
      valores[clave] = calculados[clave];
    }
  });
  return valores;
}

function buscarEstado(estados, id) {
  return estados.find((estado) => estado.id === id) ?? null;
}

function estadoResoluble(estado) {
  return MAGNITUDES_REQUERIDAS.every((magnitud) => Number.isFinite(estado[magnitud]));
}

// En modo manual los parámetros del tipo no hacen falta: el usuario ya ha creado
// los dos estados. En modo calculado son la entrada del cálculo, y sin ellos no
// hay nada que generar.
function erroresParametros(definicion, proceso) {
  if (proceso.modoDestino !== 'calculado') return [];

  const parametros = proceso.parametros ?? {};
  const errores = [];

  definicion.parametros.forEach((parametro) => {
    if (parametro.requerido && !Number.isFinite(parametros[parametro.clave])) {
      errores.push({ clave: 'error_parametro_requerido', datos: { parametro: parametro.i18n } });
    }
  });

  const alternativas = definicion.requiereAlguno ?? [];
  if (alternativas.length > 0 && !alternativas.some((clave) => Number.isFinite(parametros[clave]))) {
    errores.push({
      clave: 'error_parametro_alguno',
      datos: {
        parametros: alternativas.map(
          (clave) => definicion.parametros.find((p) => p.clave === clave)?.i18n ?? clave
        )
      }
    });
  }

  return errores;
}

/**
 * Pareja de propiedades que define el estado destino, o null si no se puede
 * calcular. Es la operación que hace posible el modo calculado.
 */
export function parejaDestino(proceso, origenes) {
  const definicion = getDefinicion(proceso.tipo);
  if (!definicion) return null;

  const resolvedor = RESOLVEDORES[definicion.restriccion.resolvedor];
  if (!resolvedor || typeof resolvedor.destino !== 'function') return null;
  if (origenes.some((origen) => !origen || !estadoResoluble(origen))) return null;
  if (erroresParametros(definicion, proceso).length > 0) return null;

  const pareja = resolvedor.destino(origenes, proceso.parametros ?? {}, definicion);
  if (!pareja || !Number.isFinite(pareja.in1Val) || !Number.isFinite(pareja.in2Val)) return null;
  return pareja;
}

// Tolerancia del cierre de un ciclo: floja en términos relativos, porque lo que
// interesa señalar es una incoherencia del enunciado, no el ruido numérico.
const TOLERANCIA_CIERRE = { H: { rel: 0.005, abs: 0.5 }, P: { rel: 0.01, abs: 0.05 } };

/**
 * Comprobación de cierre (DOCUMENTACION.md §3.4, regla d).
 *
 * Un proceso calculado cuyo destino generó otro proceso —o él mismo antes de
 * que la propagación cerrara el ciclo— no puede volver a generarlo sin entrar en
 * bucle. En vez de generar, compara: si el estado al que llega no es el que dice
 * el enunciado, lo marca. Cuando el proceso sí ha generado su destino, los dos
 * coinciden por construcción y esto no dice nada.
 */
function avisosCierre(proceso, origenes, destino) {
  if (proceso.modoDestino !== 'calculado') return [];

  const pareja = parejaDestino(proceso, origenes);
  if (pareja === null) {
    return [{ clave: 'aviso_destino_no_calculable', datos: {} }];
  }

  const propiedad = (magnitud) => getPropFluido(
    destino.fluido, magnitud, pareja.in1Id, pareja.in1Val, pareja.in2Id, pareja.in2Val
  );
  const h = propiedad('H');
  const p = propiedad('P');
  if (!Number.isFinite(h) || !Number.isFinite(p)) {
    return [{ clave: 'aviso_destino_no_calculable', datos: {} }];
  }

  if (dentroDeTolerancia(h, destino.H, TOLERANCIA_CIERRE.H)
    && dentroDeTolerancia(p, destino.P, TOLERANCIA_CIERRE.P)) {
    return [];
  }
  return [{
    clave: 'aviso_cierre_discrepancia',
    datos: { valorCalculado: h, valorActual: destino.H }
  }];
}

/**
 * Orden en que hay que recalcular los estados generados.
 *
 * Devuelve los procesos que sí generan su destino, en orden topológico, y los
 * que quedan como aristas de cierre. Un ciclo cerrado no necesita detección
 * especial: cuando ningún generador puede avanzar, se descarta el último de la
 * lista —el que vuelve al estado de partida— y se reintenta. Así el
 * bucle infinito no llega a existir en vez de tener que romperse.
 */
export function planificarPropagacion(procesos) {
  const candidatos = procesos.filter((proceso) =>
    proceso.modoDestino === 'calculado'
    && proceso.destino
    && (proceso.origenes ?? []).length > 0
    && proceso.origenes.every((id) => id)
  );

  // Dos procesos no pueden generar el mismo estado: gana el primero de la lista
  // y el otro se queda en verificador.
  const generadores = [];
  const yaGenerados = new Set();
  candidatos.forEach((proceso) => {
    if (yaGenerados.has(proceso.destino)) return;
    yaGenerados.add(proceso.destino);
    generadores.push(proceso);
  });

  let pendientes = [...generadores];
  const orden = [];
  while (pendientes.length > 0) {
    const esperados = new Set(pendientes.map((proceso) => proceso.destino));
    const listos = pendientes.filter(
      (proceso) => !proceso.origenes.some((id) => esperados.has(id))
    );
    if (listos.length === 0) {
      pendientes = pendientes.slice(0, -1); // arista de cierre
      continue;
    }
    orden.push(...listos);
    pendientes = pendientes.filter((proceso) => !listos.includes(proceso));
  }

  const generan = new Set(orden);
  return { orden, cierres: candidatos.filter((proceso) => !generan.has(proceso)) };
}

/**
 * Estados intermedios que recorre el proceso, extremos incluidos.
 *
 * Devuelve estados termodinámicos completos, no puntos (x, y): la proyección a
 * los ejes la hace el diagrama, así que la misma curva vale para el p-h, el T-s
 * y el p-T y sale correcta en los tres (DOCUMENTACION.md §3.4).
 *
 * Los extremos son los propios estados de la tabla, de modo que la curva toque
 * exactamente los dos puntos dibujados aunque el modelo intermedio sea
 * aproximado. Los puntos que CoolProp no resuelva se descartan.
 */
export function trazarProceso(proceso, evaluacion) {
  if (!evaluacion?.valido) return [];

  const definicion = evaluacion.definicion;
  const resolvedor = RESOLVEDORES[definicion.restriccion.resolvedor];
  if (!resolvedor || typeof resolvedor.trazar !== 'function') return [];

  const intermedios = resolvedor
    .trazar(evaluacion.origenes, evaluacion.destino, proceso.parametros ?? {}, definicion)
    .filter(estadoResoluble);

  return [evaluacion.origenes[0], ...intermedios, evaluacion.destino];
}

/**
 * Evalúa un proceso contra la lista de estados actual.
 *
 * Distingue dos niveles, como pide la especificación:
 *  - errores: fallos estructurales (referencia rota, fluidos distintos, estado
 *    fuera del rango de la EoS). El proceso es inválido pero NO se borra: la
 *    fila se marca y el usuario puede recrear el punto.
 *  - avisos: la pareja de estados no encaja con el tipo declarado. No bloquea.
 */
export function evaluarProceso(proceso, estados) {
  const errores = [];
  const definicion = getDefinicion(proceso.tipo);

  if (!definicion) {
    return {
      definicion: null,
      origenes: [],
      destino: null,
      errores: [{ clave: 'error_tipo_desconocido', datos: { tipo: proceso.tipo } }],
      avisos: [],
      valido: false
    };
  }

  const idsOrigen = proceso.origenes ?? [];
  if (idsOrigen.length !== definicion.aridad.origenes) {
    errores.push({
      clave: 'error_aridad',
      datos: { esperados: definicion.aridad.origenes, recibidos: idsOrigen.length }
    });
  }

  const origenes = idsOrigen.map((id) => buscarEstado(estados, id));
  const destino = buscarEstado(estados, proceso.destino);

  origenes.forEach((estado, i) => {
    if (estado === null) {
      errores.push({ clave: 'error_origen_inexistente', datos: { posicion: i + 1 } });
    }
  });
  if (destino === null) {
    errores.push({ clave: 'error_destino_inexistente', datos: {} });
  }

  const implicados = [...origenes, destino].filter((estado) => estado !== null);

  if (definicion.dominio === 'fluido' && implicados.length > 1) {
    const fluidos = new Set(implicados.map((estado) => estado.fluido));
    if (fluidos.size > 1) {
      errores.push({
        clave: 'error_fluidos_distintos',
        datos: { fluidos: [...fluidos].join(', ') }
      });
    }
  }

  implicados.forEach((estado) => {
    if (!estadoResoluble(estado)) {
      errores.push({ clave: 'error_estado_no_resoluble', datos: { nombre: estado.nombre } });
    }
  });

  errores.push(...erroresParametros(definicion, proceso));

  if (errores.length > 0) {
    return { definicion, origenes, destino, errores, avisos: [], valido: false };
  }

  const resolvedor = RESOLVEDORES[definicion.restriccion.resolvedor];
  if (!resolvedor || typeof resolvedor.verificar !== 'function') {
    return {
      definicion,
      origenes,
      destino,
      errores: [{
        clave: 'error_resolvedor_ausente',
        datos: { resolvedor: definicion.restriccion.resolvedor }
      }],
      avisos: [],
      valido: false
    };
  }

  const avisos = [
    ...resolvedor.verificar(origenes, destino, proceso.parametros ?? {}, definicion),
    ...avisosCierre(proceso, origenes, destino)
  ];
  return { definicion, origenes, destino, errores: [], avisos, valido: true };
}
