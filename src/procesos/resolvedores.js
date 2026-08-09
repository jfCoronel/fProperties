// Registro de resolvedores: aquí vive la FÍSICA de cada tipo de proceso.
// definiciones.json referencia cada entrada por su clave; el JSON declara el
// contrato (parámetros, unidades, tolerancias, columnas) y este fichero lo cumple.
// Ver PLAN-PROCESOS.md §1.2 y §2.3.
//
// Cada resolvedor puede implementar hasta cuatro operaciones, independientes entre sí:
//   verificar(origenes, destino, parametros, definicion) -> [avisos]   (F1, esta fase)
//   derivados(origenes, destino, parametros, definicion) -> { ... }    (F2)
//   trazar(origenes, destino, parametros, definicion)    -> [estados]  (F4)
//   destino(origen, parametros, definicion)              -> estado     (F6)
// De momento solo está implementada verificar(); el motor tolera la ausencia
// de las demás.
import { getPropFluido } from '../propFluidos/fluidos';

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
    }
  },

  isobarico: magnitudConstante('P'),
  isentalpico: magnitudConstante('H'),
  isotermo: magnitudConstante('T')
};
