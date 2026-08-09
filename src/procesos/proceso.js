// Motor de procesos: lee la tabla de definiciones, resuelve las referencias a
// estados y evalúa la coherencia de cada proceso. Sin dependencias de React,
// para que sea testeable y reutilizable.
// Ver PLAN-PROCESOS.md §2.
import definiciones from './definiciones.json';
import { RESOLVEDORES } from './resolvedores';

export const ESQUEMA_PROCESOS = definiciones.esquema;
export const PARAMETROS_COMUNES = definiciones.parametrosComunes;

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
// únicamente hacen falta cuando el proceso genera el estado destino (F6).
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

function buscarEstado(estados, id) {
  return estados.find((estado) => estado.id === id) ?? null;
}

function estadoResoluble(estado) {
  return MAGNITUDES_REQUERIDAS.every((magnitud) => Number.isFinite(estado[magnitud]));
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

  const avisos = resolvedor.verificar(origenes, destino, proceso.parametros ?? {}, definicion);
  return { definicion, origenes, destino, errores: [], avisos, valido: true };
}
