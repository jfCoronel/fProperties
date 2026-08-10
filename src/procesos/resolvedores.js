// Registro de resolvedores: aquí vive la FÍSICA de cada tipo de proceso.
// definiciones.json referencia cada entrada por su clave; el JSON declara el
// contrato (parámetros, unidades, tolerancias, columnas) y este fichero lo cumple.
// Ver PLAN-PROCESOS.md §1.2 y §2.3.
//
// Cada resolvedor puede implementar hasta cuatro operaciones, independientes entre sí:
//   verificar(origenes, destino, parametros, definicion) -> [avisos]   (F1)
//   derivados(origenes, destino, parametros, definicion) -> { ... }    (F2)
//   trazar(origenes, destino, parametros, definicion)    -> [estados]  (F4)
//   destino(origenes, parametros, definicion)            -> pareja     (F6, esta fase)
// El motor tolera la ausencia de cualquiera de ellas.
//
// destino() no construye el estado: devuelve la pareja de propiedades que lo
// define, { in1Id, in1Val, in2Id, in2Val }, en las mismas unidades y con las
// mismas claves que usa la tabla de estados. El motor la convierte en estado
// completo con getObjetoFluido, y así el punto generado queda idéntico a uno
// escrito a mano: editable, exportable y sin un camino de creación paralelo.
import { getPropFluido, getObjetoFluido } from '../propFluidos/fluidos';

const T0C = 273.15;

// Tolerancia mixta: absoluta más relativa. La parte absoluta evita que magnitudes
// que pasan por cero (h y s llevan desplazamiento de referencia, T en ºC) exijan
// una coincidencia imposible.
export function dentroDeTolerancia(a, b, tolerancia = {}) {
  const limite =
    (tolerancia.abs ?? 0) +
    (tolerancia.rel ?? 0) * Math.max(Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= limite;
}

// Rendimiento isentrópico real de una pareja de estados dada.
// Devuelve null si CoolProp no resuelve el estado isentrópico o si no hay salto.
export function getRendimientoIsentropico(origen, destino) {
  const hIsentropico = getPropFluido(origen.fluido, 'H', 'P', destino.P, 'S', origen.S);
  if (!Number.isFinite(hIsentropico)) return null;
  const saltoReal = destino.H - origen.H;
  if (Math.abs(saltoReal) < 1e-9) return null;
  return (hIsentropico - origen.H) / saltoReal;
}

// Saltos entre origen y destino, comunes a todos los tipos. T viene en ºC, así
// que dt es una diferencia de temperatura y por eso su unidad declarada es K.
function saltos(origen, destino) {
  return {
    dh: destino.H - origen.H,
    ds: destino.S - origen.S,
    dt: destino.T - origen.T
  };
}

// El caudal es opcional: sin él no hay potencia, y la columna se oculta.
// Un valor específico en kJ/kg por un caudal en kg/s da kW directamente.
function potencia(parametros, especifico) {
  const caudal = parametros?.m_punto;
  if (!Number.isFinite(caudal) || !Number.isFinite(especifico)) return null;
  return caudal * especifico;
}

// Valores intermedios del barrido, sin los extremos: el motor los añade tal cual
// para que la curva toque exactamente los dos puntos dibujados en el diagrama.
// El barrido logarítmico reparte los puntos de forma uniforme en el eje de
// presiones del p-h, que es logarítmico.
function interiores(valorInicial, valorFinal, nPuntos, escala = 'lineal') {
  const puntos = [];
  const logaritmico = escala === 'log' && valorInicial > 0 && valorFinal > 0;
  for (let i = 1; i < nPuntos - 1; i++) {
    const t = i / (nPuntos - 1);
    puntos.push(logaritmico
      ? valorInicial * Math.pow(valorFinal / valorInicial, t)
      : valorInicial + (valorFinal - valorInicial) * t);
  }
  return puntos;
}

// Barrido de presión entre los dos estados, con la segunda propiedad que fije
// cada tipo. Devuelve estados completos: la proyección a los ejes del diagrama
// se hace después, así que la misma curva sirve para el p-h, el T-s y el p-T.
function barridoPresion(origen, destino, definicion, segundaPropiedad) {
  const { nPuntos, escala } = definicion.trazado;
  return interiores(origen.P, destino.P, nPuntos, escala).map((p) => {
    const [propiedad, valor] = segundaPropiedad(p);
    return { fluido: origen.fluido, ...getObjetoFluido(origen.fluido, 'P', p, propiedad, valor) };
  });
}

// Fábrica para los tipos cuya restricción es "una magnitud no cambia".
const magnitudConstante = (magnitud) => ({
  verificar(origenes, destino, parametros, definicion) {
    const origen = origenes[0];
    const tolerancia = definicion.restriccion.tolerancia;
    if (dentroDeTolerancia(origen[magnitud], destino[magnitud], tolerancia)) {
      return [];
    }
    return [{
      clave: 'aviso_magnitud_no_constante',
      datos: {
        magnitud,
        valorOrigen: origen[magnitud],
        valorDestino: destino[magnitud]
      }
    }];
  }
});

export const RESOLVEDORES = {
  compresionEta: {
    verificar(origenes, destino, parametros, definicion) {
      const avisos = [];
      const origen = origenes[0];

      if (destino.P <= origen.P) {
        // Sin aumento de presión no hay compresión, y el rendimiento no significa nada.
        return [{
          clave: 'aviso_compresion_sin_aumento_presion',
          datos: { valorOrigen: origen.P, valorDestino: destino.P }
        }];
      }

      const tolerancia = definicion.restriccion.tolerancia;
      if (destino.S < origen.S && !dentroDeTolerancia(origen.S, destino.S, tolerancia)) {
        avisos.push({
          clave: 'aviso_entropia_decrece',
          datos: { valorOrigen: origen.S, valorDestino: destino.S }
        });
      }

      const rendimiento = getRendimientoIsentropico(origen, destino);
      if (rendimiento === null) {
        avisos.push({ clave: 'aviso_rendimiento_no_calculable', datos: {} });
      } else if (rendimiento <= 0 || rendimiento > 1) {
        avisos.push({ clave: 'aviso_rendimiento_fuera_rango', datos: { rendimiento } });
      }

      return avisos;
    },

    // Compresor adiabático en régimen estacionario: todo el salto de entalpía es
    // trabajo (w > 0 absorbido por el fluido), y el rendimiento es el real de la
    // pareja de estados, no el parámetro declarado.
    derivados(origenes, destino, parametros) {
      const origen = origenes[0];
      const { dh, ds } = saltos(origen, destino);
      return {
        dh,
        ds,
        w_esp: dh,
        rel_compresion: origen.P === 0 ? null : destino.P / origen.P,
        eta_real: getRendimientoIsentropico(origen, destino),
        potencia: potencia(parametros, dh)
      };
    },

    // La compresión real no tiene una trayectoria termodinámica definida: es
    // irreversible. Se dibuja suponiendo que el rendimiento actúa por igual a lo
    // largo de toda la compresión, h(p) = h1 + (h_s(p) − h1)/η, lo que da una
    // curva suave que pasa exactamente por los dos estados. Con η medido en la
    // propia pareja, no con el declarado, que en modo manual ni existe.
    trazar(origenes, destino, parametros, definicion) {
      const origen = origenes[0];
      const rendimiento = getRendimientoIsentropico(origen, destino);
      if (rendimiento === null) return [];

      return barridoPresion(origen, destino, definicion, (p) => {
        const hIsentropico = getPropFluido(origen.fluido, 'H', 'P', p, 'S', origen.S);
        return ['H', origen.H + (hIsentropico - origen.H) / rendimiento];
      });
    },

    // Definición del rendimiento isentrópico de un compresor, despejando h2.
    destino(origenes, parametros) {
      const origen = origenes[0];
      const hIsentropico = getPropFluido(origen.fluido, 'H', 'P', parametros.p_final, 'S', origen.S);
      if (!Number.isFinite(hIsentropico)) return null;
      return {
        in1Id: 'P', in1Val: parametros.p_final,
        in2Id: 'H', in2Val: origen.H + (hIsentropico - origen.H) / parametros.eta
      };
    }
  },

  isobarico: {
    ...magnitudConstante('P'),

    // Sin trabajo de eje, el primer principio en sistema abierto deja q = Δh.
    derivados(origenes, destino, parametros) {
      const { dh, ds } = saltos(origenes[0], destino);
      return { dh, ds, q_esp: dh, potencia: potencia(parametros, dh) };
    },

    // A presión constante el barrido natural es el de entalpía: recorre el
    // cambio de fase sin quedarse atascado en la meseta de temperatura.
    trazar(origenes, destino, parametros, definicion) {
      const origen = origenes[0];
      const { nPuntos, escala } = definicion.trazado;
      return interiores(origen.H, destino.H, nPuntos, escala).map((h) => ({
        fluido: origen.fluido,
        ...getObjetoFluido(origen.fluido, 'P', origen.P, 'H', h)
      }));
    },

    // El título manda sobre la temperatura: es la única forma de pedir "condensa
    // hasta líquido saturado", que es como se plantea medio ciclo frigorífico.
    destino(origenes, parametros) {
      const origen = origenes[0];
      if (Number.isFinite(parametros.x_final)) {
        return { in1Id: 'P', in1Val: origen.P, in2Id: 'X', in2Val: parametros.x_final };
      }
      return { in1Id: 'P', in1Val: origen.P, in2Id: 'T', in2Val: parametros.t_final };
    }
  },

  isentalpico: {
    ...magnitudConstante('H'),

    // La laminación no intercambia ni calor ni trabajo: lo que interesa es la
    // entropía generada y el enfriamiento (efecto Joule-Thomson).
    derivados(origenes, destino) {
      const origen = origenes[0];
      const { ds, dt } = saltos(origen, destino);
      return {
        ds,
        dt,
        rel_expansion: destino.P === 0 ? null : origen.P / destino.P
      };
    },

    // Recta vertical en el p-h, pero no en el T-s ni en el p-T: por eso el
    // trazado devuelve estados y no puntos del plano (PLAN-PROCESOS.md §1.3).
    trazar(origenes, destino, parametros, definicion) {
      const origen = origenes[0];
      return barridoPresion(origen, destino, definicion, () => ['H', origen.H]);
    },

    destino(origenes, parametros) {
      return {
        in1Id: 'P', in1Val: parametros.p_final,
        in2Id: 'H', in2Val: origenes[0].H
      };
    }
  },

  isotermo: {
    ...magnitudConstante('T'),

    // q = T·Δs supone el proceso internamente reversible; es la hipótesis
    // habitual del isotermo de libro de texto. T se toma como media de los dos
    // estados para que una desviación pequeña no sesgue el resultado.
    derivados(origenes, destino, parametros) {
      const origen = origenes[0];
      const { dh, ds } = saltos(origen, destino);
      const tMedia = (origen.T + destino.T) / 2 + T0C;
      const q = tMedia * ds;
      return { dh, ds, q_esp: q, potencia: potencia(parametros, q) };
    },

    // Dentro de la campana, p y T dejan de ser independientes y CoolProp no
    // resuelve la pareja: esos puntos salen NaN y el motor los descarta.
    trazar(origenes, destino, parametros, definicion) {
      const origen = origenes[0];
      return barridoPresion(origen, destino, definicion, () => ['T', origen.T]);
    },

    destino(origenes, parametros) {
      return {
        in1Id: 'P', in1Val: parametros.p_final,
        in2Id: 'T', in2Val: origenes[0].T
      };
    }
  }
};
