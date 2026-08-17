// Adaptador de dominio: lo único que el motor de procesos necesita saber sobre
// la sustancia con la que trabaja. Un dominio es "fluido puro" o "aire húmedo",
// y la diferencia entre ellos se reduce a estas cinco cosas.
// Ver DOCUMENTACION.md §3.4.
//
// Este fichero es PURO en dos sentidos, y los dos importan:
//
//  - No toca hookstate. Qué lista de estados corresponde a cada dominio vive en
//    listasDominio.js, aparte, para que el motor siga siendo testeable sin
//    montar el estado de la aplicación.
//  - No conoce la detección de tipos. deteccion.js ya importa proceso.js, y
//    proceso.js importa este fichero: meter aquí la detección cerraría el ciclo.
//
// Un estado se describe por sus ENTRADAS: una pareja { in1Id, in1Val, in2Id,
// in2Val } en los fluidos y una terna con in3 en el aire húmedo. El motor las
// trata como una bolsa opaca —las recibe de destino(), se las pasa a construir()
// y las guarda en el estado— y por eso la misma maquinaria vale para dos y para
// tres propiedades independientes.
import { getObjetoFluido, getPropFluido } from '../propFluidos/fluidos';
import { getObjetoAireHumedo, getPropAireHumedo } from '../propFluidos/aires';
import { dentroDeTolerancia } from './resolvedores';

export const DOMINIO_POR_DEFECTO = 'fluido';

// Dos estados de aire húmedo no se pueden conectar si no comparten la presión
// total: no es el mismo sistema. Es el análogo del "fluidos distintos", y con la
// misma consecuencia —error, no aviso—, porque no hay proceso que arreglarlo.
const TOLERANCIA_PRESION_AIRE = { rel: 0.001, abs: 0.01 };

export const DOMINIOS = {
  fluido: {
    clave: 'fluido',

    // Magnitudes que un estado debe tener resueltas para poder evaluar un
    // proceso. Si CoolProp no las da, el estado está fuera del rango de la EoS.
    magnitudes: ['T', 'P', 'H', 'S'],

    // Magnitudes que se comparan al verificar el cierre de un proceso calculado,
    // con su tolerancia. Floja en lo relativo a propósito: lo que interesa
    // señalar es una incoherencia del enunciado, no el ruido numérico.
    cierre: {
      H: { rel: 0.005, abs: 0.5 },
      P: { rel: 0.01, abs: 0.05 }
    },

    // Lo que identifica a la sustancia y hay que copiar en un estado generado.
    identidad: (referencia) => ({ fluido: referencia.fluido }),

    construir: (entradas, referencia) => getObjetoFluido(
      referencia.fluido, entradas.in1Id, entradas.in1Val, entradas.in2Id, entradas.in2Val
    ),

    getProp: (magnitud, entradas, referencia) => getPropFluido(
      referencia.fluido, magnitud,
      entradas.in1Id, entradas.in1Val, entradas.in2Id, entradas.in2Val
    ),

    compatibles(estados) {
      const fluidos = new Set(estados.map((estado) => estado.fluido));
      if (fluidos.size <= 1) return null;
      return {
        clave: 'error_fluidos_distintos',
        datos: { fluidos: [...fluidos].join(', ') }
      };
    }
  },

  aire: {
    clave: 'aire',

    // La presión total entra aquí porque un proceso psicrométrico la supone
    // constante y necesita compararla; w es la otra coordenada del diagrama.
    magnitudes: ['T', 'P', 'W', 'H'],

    // El cierre se comprueba sobre entalpía y humedad absoluta: la presión la
    // fija la propia terna de entrada, así que compararla no diría nada.
    cierre: {
      H: { rel: 0.005, abs: 0.5 },
      W: { rel: 0.005, abs: 0.01 }
    },

    // El aire húmedo no tiene nombre de sustancia que copiar: su identidad es la
    // presión, y esa ya viaja dentro de las entradas.
    identidad: () => ({}),

    construir: (entradas) => getObjetoAireHumedo(
      entradas.in1Id, entradas.in1Val,
      entradas.in2Id, entradas.in2Val,
      entradas.in3Id, entradas.in3Val
    ),

    getProp: (magnitud, entradas) => getPropAireHumedo(
      magnitud,
      entradas.in1Id, entradas.in1Val,
      entradas.in2Id, entradas.in2Val,
      entradas.in3Id, entradas.in3Val
    ),

    compatibles(estados) {
      const [primero, ...resto] = estados;
      const distinto = resto.find(
        (estado) => !dentroDeTolerancia(primero.P, estado.P, TOLERANCIA_PRESION_AIRE)
      );
      if (!distinto) return null;
      return {
        clave: 'error_presiones_distintas',
        datos: { valorOrigen: primero.P, valorDestino: distinto.P }
      };
    }
  }
};

export function getDominio(clave) {
  return DOMINIOS[clave] ?? DOMINIOS[DOMINIO_POR_DEFECTO];
}

export const CLAVES_DOMINIO = Object.keys(DOMINIOS);
