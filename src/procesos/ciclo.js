// Ciclos: un ciclo no es un objeto más, es un camino cerrado en el grafo
// que ya forman los procesos. Este módulo lo detecta y hace el balance global.
// Ver DOCUMENTACION.md §1.6.
import { evaluarProceso, derivadosProceso } from './proceso';

// Topes de seguridad: el grafo de un problema docente es diminuto, pero un
// enunciado raro no debe poder colgar la interfaz enumerando caminos.
const MAX_CICLOS = 20;
const MAX_LONGITUD = 24;

/**
 * Ciclos elementales del grafo de procesos (un estado por nodo, un proceso por
 * arista). Devuelve cada ciclo como la lista ordenada de sus procesos.
 *
 * Un mismo ciclo se puede recorrer empezando por cualquiera de sus aristas: se
 * deduplica por el conjunto de procesos, quedándose con el primer recorrido.
 */
export function detectarCiclos(procesos) {
  const salientes = new Map();
  procesos.forEach((proceso) => {
    const origen = (proceso.origenes ?? [])[0];
    if (!origen || !proceso.destino) return;
    if (!salientes.has(origen)) salientes.set(origen, []);
    salientes.get(origen).push(proceso);
  });

  const ciclos = [];
  const vistos = new Set();

  const recorrer = (estadoActual, inicio, camino, visitados) => {
    if (ciclos.length >= MAX_CICLOS || camino.length >= MAX_LONGITUD) return;

    (salientes.get(estadoActual) ?? []).forEach((proceso) => {
      if (proceso.destino === inicio) {
        const cerrado = [...camino, proceso];
        const firma = cerrado.map((p) => p.id).sort().join('|');
        if (!vistos.has(firma)) {
          vistos.add(firma);
          ciclos.push(cerrado);
        }
        return;
      }
      if (visitados.has(proceso.destino)) return;
      recorrer(proceso.destino, inicio, [...camino, proceso], new Set([...visitados, proceso.destino]));
    });
  };

  procesos.forEach((proceso) => {
    const origen = (proceso.origenes ?? [])[0];
    if (!origen) return;
    recorrer(origen, origen, [], new Set([origen]));
  });

  return ciclos;
}

const CASI_CERO = 1e-9;

/**
 * Balance global de un ciclo, por unidad de masa.
 *
 * El calor de cada proceso lo da su resolvedor (q = Δh en el isobárico,
 * q = T·Δs en el isotermo, cero en los adiabáticos). El trabajo se deduce del
 * primer principio en sistema abierto, w = Δh − q, en vez de pedírselo a cada
 * tipo: así el balance es coherente por construcción y ΣΔh = 0 alrededor del
 * ciclo, que es justamente lo que se quiere comprobar.
 *
 * Signos: positivo = absorbido por el fluido. Un ciclo frigorífico tiene w > 0;
 * uno de potencia, w < 0.
 */
export function balanceCiclo(procesos, estados) {
  let w = 0;
  let qAbsorbido = 0;
  let qCedido = 0;
  let hayAvisos = false;
  // Un tipo que no supone nada no dice cuánto de su Δh es calor y cuánto trabajo.
  // El reparto w = Δh − q daría entonces todo a trabajo, que es una respuesta
  // inventada: mejor declarar el balance indeterminado y no dar cifras.
  let indeterminado = false;
  const caudales = new Set();

  for (const proceso of procesos) {
    const evaluacion = evaluarProceso(proceso, estados);
    if (!evaluacion.valido) return null;
    if (evaluacion.avisos.length > 0) hayAvisos = true;
    if (evaluacion.definicion?.balance === 'indeterminado') indeterminado = true;

    const derivados = derivadosProceso(proceso, evaluacion);
    const dh = evaluacion.destino.H - evaluacion.origenes[0].H;
    const q = derivados.q_esp ?? 0;

    w += dh - q;
    if (q > 0) qAbsorbido += q; else qCedido += q;

    const caudal = proceso.parametros?.m_punto;
    caudales.add(Number.isFinite(caudal) ? caudal : null);
  }

  // Solo tiene sentido dar potencias si todo el ciclo lleva el mismo gasto.
  const caudal = caudales.size === 1 ? [...caudales][0] : null;

  const balance = {
    estados: [...procesos.map((proceso) => proceso.origenes[0]), procesos[0].origenes[0]],
    w_neto: w,
    q_absorbido: qAbsorbido,
    q_cedido: qCedido,
    caudal,
    hayAvisos,
    indeterminado,
    indicador: null
  };

  if (indeterminado) return balance;

  if (w > CASI_CERO && qAbsorbido > CASI_CERO) {
    // Consume trabajo: máquina frigorífica o bomba de calor
    balance.indicador = {
      cop_frigorifico: qAbsorbido / w,
      cop_bomba: Math.abs(qCedido) / w
    };
  } else if (w < -CASI_CERO && qAbsorbido > CASI_CERO) {
    balance.indicador = { eta_termico: Math.abs(w) / qAbsorbido };
  }

  return balance;
}

/**
 * Ciclos del problema con su balance, listos para presentar. Los que no cierran
 * numéricamente —porque alguno de sus procesos es inválido— se descartan.
 */
export function getCiclos(procesos, estados) {
  return detectarCiclos(procesos)
    .map((ciclo) => {
      const balance = balanceCiclo(ciclo, estados);
      return balance === null ? null : { procesos: ciclo, ...balance };
    })
    .filter((ciclo) => ciclo !== null);
}
