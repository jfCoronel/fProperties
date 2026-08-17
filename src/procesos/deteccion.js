// Detección del tipo de proceso que encaja con una pareja de estados.
//
// Es una SUGERENCIA, nunca una imposición, y la distinción es de fondo: el tipo
// lo declara el usuario, y de esa declaración vive la columna de diagnóstico
// ("has dicho isobárico y la presión cae un 4 %"). Si el tipo se dedujera, nada
// podría discrepar nunca y el aviso —lo más didáctico de la tabla— desaparecería.
// Además la deducción no siempre tiene respuesta única: una evaporación dentro de
// la campana es isobárica e isoterma a la vez, y cualquier pareja con p₂ > p₁
// tiene un rendimiento isentrópico.
//
// Por eso esto solo se usa para tres cosas: proponer el tipo al crear un proceso
// desde dos estados, mostrar "detectado: X" junto al desplegable, y ofrecer el
// cambio de un clic cuando lo declarado no se cumple.
// Ver DOCUMENTACION.md §3.4.
import { getDefinicion } from './proceso';
import {
  dentroDeTolerancia, getRendimientoIsentropico, getRendimientoExpansion
} from './resolvedores';

// El orden importa donde dos tipos encajan a la vez, y va del criterio más
// estricto al más flojo para que gane el que menos se equivoca. Una evaporación a
// presión constante también es isoterma: gana el isobárico, que es como se
// enuncia. Y la tolerancia del isentálpico es relativa sobre valores de h que
// rondan los miles, así que va la última: un isotermo de vapor pasaría su prueba
// sin ser una laminación.
const CONSTANTES = [
  ['isobarico', 'P'],
  ['isotermo', 'T'],
  ['isentalpico', 'H']
];

/**
 * Clave del tipo que mejor encaja con la pareja, o null si no se puede juzgar.
 *
 * Cada tipo se comprueba con SU tolerancia declarada en definiciones.json, no
 * con una constante de aquí: si un día se afina la tolerancia del isobárico, la
 * detección se afina con ella.
 */
export function detectarTipo(origen, destino) {
  if (!origen || !destino) return null;
  if (origen.fluido !== destino.fluido) return null;
  if (![origen, destino].every((estado) => ['P', 'T', 'H', 'S'].every(
    (magnitud) => Number.isFinite(estado[magnitud])
  ))) return null;

  for (const [clave, magnitud] of CONSTANTES) {
    const definicion = getDefinicion(clave);
    if (definicion && dentroDeTolerancia(
      origen[magnitud], destino[magnitud], definicion.restriccion.tolerancia
    )) {
      return clave;
    }
  }

  if (destino.P > origen.P) {
    // Subir la presión pide trabajo; si el rendimiento sale del rango físico, no
    // es una compresión y no hay tipo que lo describa.
    const rendimiento = getRendimientoIsentropico(origen, destino);
    return (rendimiento !== null && rendimiento > 0 && rendimiento <= 1)
      ? 'compresion_isentropica'
      : 'generico';
  }

  // Perder presión puede ser una turbina o un conducto, y el rendimiento de
  // expansión los separa por sí solo: que caiga en (0, 1] equivale a que el estado
  // final quede entre el isentrópico y la isentálpica, que es exactamente la franja
  // de la expansión adiabática irreversible. Un enfriamiento con pérdida de carga
  // se pasa de largo (h₂ < h_2s, η > 1), un calentamiento sale con η < 0, y una
  // laminación da η = 0 —además de haberse detectado ya como isentálpica—.
  const rendimiento = getRendimientoExpansion(origen, destino);
  if (rendimiento !== null && rendimiento > 0 && rendimiento <= 1) {
    return 'expansion_isentropica';
  }

  // Pierde presión y no mantiene nada constante: el caso del conducto o el
  // intercambiador con pérdida de carga. Es una hipótesis (no hay trabajo de
  // eje), y por eso se propone en vez de aplicarse sola.
  return 'sin_trabajo';
}

/**
 * Tipo que encajaría mejor que el declarado, o null si no hay nada que sugerir.
 *
 * Solo habla cuando el proceso es válido pero lleva avisos: mientras la pareja
 * cumpla lo declarado, no hay motivo para proponer otra cosa.
 */
export function sugerirTipo(proceso, evaluacion) {
  if (!evaluacion?.valido || evaluacion.avisos.length === 0) return null;
  const clave = detectarTipo(evaluacion.origenes[0], evaluacion.destino);
  return (clave === null || clave === proceso.tipo) ? null : clave;
}
