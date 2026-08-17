// Registro de resolvedores del aire húmedo: aquí vive la FÍSICA psicrométrica.
// Mismo contrato que resolvedores.js —verificar, derivados, trazar, destino— y
// misma división de trabajo: definiciones.json declara qué pide cada tipo y este
// fichero lo cumple. Va aparte solo por tamaño.
// Ver DOCUMENTACION.md §3.4.
//
// Convenios que se repiten en todo el fichero:
//
//  - Todo proceso psicrométrico ocurre a PRESIÓN TOTAL CONSTANTE, la del origen.
//    Que dos estados no la compartan es un error, y lo detecta el dominio
//    (procesos/dominios.js) antes de llegar aquí.
//  - h y w son POR KILO DE AIRE SECO, y el caudal también: es lo que hace que los
//    balances sean sumas y no promedios ponderados por la humedad.
//  - Signos, como en los fluidos: positivo lo que ENTRA en la corriente de aire.
//    Un condensado sale, así que su caudal de agua es negativo.
//  - El estado destino se emite siempre por presión ('P'), aunque el origen se
//    diera por altitud: es la misma presión total y evita arrastrar la altitud
//    por una cadena de procesos.
import { getPropAireHumedo, getObjetoAireHumedo } from '../propFluidos/aires';
import { dentroDeTolerancia } from './resolvedores';

// Estado completo del aire a partir de presión y otras dos propiedades.
const estadoAire = (p, id2, val2, id3, val3) => getObjetoAireHumedo('P', p, id2, val2, id3, val3);

// Saltos entre origen y destino, comunes a todos los tipos.
function saltos(origen, destino) {
  return {
    dh: destino.H - origen.H,
    dw: destino.W - origen.W,
    dt: destino.T - origen.T
  };
}

// El caudal es opcional: sin él no hay potencia, y la columna se oculta.
function potencia(parametros, especifico) {
  const caudal = parametros?.m_punto;
  if (!Number.isFinite(caudal) || !Number.isFinite(especifico)) return null;
  return caudal * especifico;
}

// Agua que entra en la corriente, en kg/s. Negativa cuando condensa y sale, que
// es el caso de la batería de frío. w va en g/kg, de ahí el millar.
function caudalAgua(parametros, dw) {
  const caudal = parametros?.m_punto;
  if (!Number.isFinite(caudal) || !Number.isFinite(dw)) return null;
  return caudal * dw / 1000;
}

// Puntos intermedios de un barrido lineal, sin los extremos: el motor los añade.
function interiores(valorInicial, valorFinal, nPuntos) {
  const puntos = [];
  for (let i = 1; i < nPuntos - 1; i++) {
    puntos.push(valorInicial + (valorFinal - valorInicial) * (i / (nPuntos - 1)));
  }
  return puntos;
}

// Fábrica para los tipos cuya restricción es "una magnitud no cambia". Gemela de
// la de los fluidos, pero con los nombres de magnitud del aire húmedo.
const magnitudConstante = (magnitud) => ({
  verificar(origenes, destino, parametros, definicion) {
    const origen = origenes[0];
    if (dentroDeTolerancia(origen[magnitud], destino[magnitud], definicion.restriccion.tolerancia)) {
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

export const RESOLVEDORES_AIRE = {
  // Batería de calor o de frío seca: la humedad absoluta no cambia, así que en el
  // psicrométrico es un segmento horizontal. Sirve en los dos sentidos; lo que no
  // puede es enfriar por debajo del rocío, y de eso avisa.
  sensible: {
    verificar(origenes, destino, parametros, definicion) {
      const origen = origenes[0];
      const avisos = [
        ...magnitudConstante('W').verificar(origenes, destino, parametros, definicion)
      ];

      // Por debajo de la temperatura de rocío el vapor empieza a condensar: el
      // proceso deja de ser sensible por mucho que se declare.
      if (destino.T < origen.TR - 1e-6) {
        avisos.push({
          clave: 'aviso_enfriamiento_bajo_rocio',
          datos: { valorDestino: destino.T, valorRocio: origen.TR }
        });
      }
      return avisos;
    },

    // Sin trabajo de eje y sin agua añadida, el primer principio deja q = Δh.
    derivados(origenes, destino, parametros) {
      const { dh, dt } = saltos(origenes[0], destino);
      return { dh, dt, q_esp: dh, potencia: potencia(parametros, dh) };
    },

    // A w constante es una recta horizontal en los ejes del psicrométrico: los
    // dos extremos que pone el motor ya la describen entera.
    trazar() {
      return [];
    },

    destino(origenes, parametros) {
      const origen = origenes[0];
      return {
        in1Id: 'P', in1Val: origen.P,
        in2Id: 'T', in2Val: parametros.t_final,
        in3Id: 'W', in3Val: origen.W
      };
    }
  },

  // Batería de frío que baja del rocío: enfría y deshumidifica a la vez. Es el
  // proceso que justifica las columnas de calor sensible y latente, porque lo
  // que se dimensiona es precisamente ese reparto.
  enfriamientoDeshumidificacion: {
    verificar(origenes, destino) {
      const origen = origenes[0];
      const avisos = [];

      if (destino.W > origen.W + 1e-9) {
        // Deshumidificar es quitar agua: si entra, el tipo está mal elegido.
        avisos.push({
          clave: 'aviso_humedad_sube_deshumidificando',
          datos: { valorOrigen: origen.W, valorDestino: destino.W }
        });
      }
      if (destino.T > origen.T + 1e-9) {
        avisos.push({
          clave: 'aviso_temperatura_sube_enfriando',
          datos: { valorOrigen: origen.T, valorDestino: destino.T }
        });
      }
      return avisos;
    },

    // El reparto sensible/latente es el de libro: se pasa por el estado
    // intermedio (T del destino, w del origen), de modo que el primer tramo
    // cambia solo temperatura y el segundo solo humedad. La suma es Δh exacta,
    // así que el SHR que sale de aquí es coherente con el calor total.
    derivados(origenes, destino, parametros) {
      const origen = origenes[0];
      const { dh, dt, dw } = saltos(origen, destino);

      const hIntermedio = getPropAireHumedo(
        'H', 'P', origen.P, 'T', destino.T, 'W', origen.W
      );
      const qSensible = Number.isFinite(hIntermedio) ? hIntermedio - origen.H : null;
      const qLatente = Number.isFinite(hIntermedio) ? destino.H - hIntermedio : null;

      return {
        dh,
        dt,
        dw,
        q_esp: dh,
        q_sensible: qSensible,
        q_latente: qLatente,
        shr: (qSensible !== null && Math.abs(dh) > 1e-9) ? qSensible / dh : null,
        m_agua: caudalAgua(parametros, dw),
        potencia: potencia(parametros, dh)
      };
    },

    // El camino real depende de la batería (temperatura de superficie, factor de
    // by-pass) y no se conoce con los datos del enunciado. La recta entre los dos
    // estados es lo único afirmable, y es además como se dibuja en clase.
    trazar() {
      return [];
    },

    destino(origenes, parametros) {
      const origen = origenes[0];
      return {
        in1Id: 'P', in1Val: origen.P,
        in2Id: 'T', in2Val: parametros.t_final,
        in3Id: 'HR', in3Val: parametros.hr_final
      };
    }
  },

  // Enfriamiento evaporativo: el agua que se evapora toma su calor del propio
  // aire, así que el proceso recorre una línea de temperatura de bulbo húmedo
  // constante. Baja la seca y sube la humedad sin aportar calor.
  humectacionAdiabatica: {
    verificar(origenes, destino, parametros, definicion) {
      const origen = origenes[0];
      const avisos = [
        ...magnitudConstante('TH').verificar(origenes, destino, parametros, definicion)
      ];

      if (destino.W < origen.W - 1e-9) {
        avisos.push({
          clave: 'aviso_humedad_baja_humectando',
          datos: { valorOrigen: origen.W, valorDestino: destino.W }
        });
      }
      return avisos;
    },

    // La eficacia de saturación mide cuánto se acerca el aire a la saturación,
    // que es el límite del proceso: vale 1 cuando sale saturado a la temperatura
    // de bulbo húmedo de entrada.
    derivados(origenes, destino, parametros) {
      const origen = origenes[0];
      const { dt, dw } = saltos(origen, destino);
      const recorridoMaximo = origen.T - origen.TH;

      return {
        dt,
        dw,
        eficacia: Math.abs(recorridoMaximo) > 1e-9 ? (origen.T - destino.T) / recorridoMaximo : null,
        m_agua: caudalAgua(parametros, dw),
        potencia: potencia(parametros, 0)
      };
    },

    // A diferencia de los otros tipos del aire, este NO es una recta en los ejes
    // del psicrométrico: la línea de bulbo húmedo constante se curva. Por eso
    // barre de verdad, con la temperatura seca como variable.
    //
    // El rodeo por la humedad no es un capricho: resolver el estado directamente
    // con la pareja (T, T_bh) obliga a CoolProp a iterar en CADA una de las doce
    // propiedades, y el trazado pasaba de milisegundos a segundos. Se itera una
    // sola vez para obtener w y el estado se construye ya con (T, w), que es
    // directo.
    trazar(origenes, destino, parametros, definicion) {
      const origen = origenes[0];
      return interiores(origen.T, destino.T, definicion.trazado.nPuntos).map((t) => {
        const w = getPropAireHumedo('W', 'P', origen.P, 'T', t, 'TH', origen.TH);
        return estadoAire(origen.P, 'T', t, 'W', w);
      });
    },

    destino(origenes, parametros) {
      const origen = origenes[0];
      return {
        in1Id: 'P', in1Val: origen.P,
        in2Id: 'TH', in2Val: origen.TH,
        in3Id: 'HR', in3Val: parametros.hr_final
      };
    }
  },

  // Humectación con vapor de agua. A diferencia de la adiabática, el agua llega
  // con su propia entalpía, y esa es toda la diferencia: el balance de energía
  // reparte h2 = h1 + Δw·h_agua. Con vapor recalentado la temperatura seca sube.
  humectacionVapor: {
    verificar(origenes, destino) {
      const origen = origenes[0];
      if (destino.W < origen.W - 1e-9) {
        return [{
          clave: 'aviso_humedad_baja_humectando',
          datos: { valorOrigen: origen.W, valorDestino: destino.W }
        }];
      }
      return [];
    },

    // La entalpía del agua aportada se deduce del propio par de estados, que es
    // el dato que el enunciado suele pedir comprobar. Δw va en g/kg y h_agua en
    // kJ/kg de agua, de ahí el millar.
    derivados(origenes, destino, parametros) {
      const origen = origenes[0];
      const { dh, dt, dw } = saltos(origen, destino);
      return {
        dh,
        dt,
        dw,
        h_agua_real: Math.abs(dw) > 1e-9 ? dh * 1000 / dw : null,
        m_agua: caudalAgua(parametros, dw),
        potencia: potencia(parametros, dh)
      };
    },

    trazar() {
      return [];
    },

    destino(origenes, parametros) {
      const origen = origenes[0];
      const hFinal = origen.H + (parametros.w_final - origen.W) * parametros.h_agua / 1000;
      return {
        in1Id: 'P', in1Val: origen.P,
        in2Id: 'W', in2Val: parametros.w_final,
        in3Id: 'H', in3Val: hFinal
      };
    }
  },

  // Mezcla adiabática de dos corrientes: el único tipo con DOS estados de origen,
  // y la razón de que el modelo guarde 'origenes' como array desde el primer día.
  // Balance de masa de aire seco y de agua, más balance de energía, todo por kilo
  // de aire seco: el estado de mezcla cae sobre el segmento que une los dos de
  // entrada, dividiéndolo en razón inversa a los caudales.
  mezclaAdiabatica: {
    verificar(origenes, destino, parametros) {
      const [uno, dos] = origenes;
      const avisos = [];

      const total = parametros.m_1 + parametros.m_2;
      if (Number.isFinite(total) && total > 0) {
        const wMezcla = (parametros.m_1 * uno.W + parametros.m_2 * dos.W) / total;
        const hMezcla = (parametros.m_1 * uno.H + parametros.m_2 * dos.H) / total;

        if (!dentroDeTolerancia(wMezcla, destino.W, { rel: 0.005, abs: 0.02 })) {
          avisos.push({
            clave: 'aviso_mezcla_no_cuadra',
            datos: { valorCalculado: wMezcla, valorActual: destino.W }
          });
        }
        if (!dentroDeTolerancia(hMezcla, destino.H, { rel: 0.005, abs: 0.5 })) {
          avisos.push({
            clave: 'aviso_mezcla_energia_no_cuadra',
            datos: { valorCalculado: hMezcla, valorActual: destino.H }
          });
        }
      }

      // Mezclar dos corrientes saturadas puede dar un punto por encima de la
      // curva de saturación: hay niebla, y parte del agua condensa.
      if (destino.HR > 100.5) {
        avisos.push({ clave: 'aviso_mezcla_con_niebla', datos: { valorDestino: destino.HR } });
      }
      return avisos;
    },

    derivados(origenes, destino, parametros) {
      const total = parametros.m_1 + parametros.m_2;
      return {
        m_total: Number.isFinite(total) ? total : null,
        fraccion_mezcla: (Number.isFinite(total) && total > 0) ? parametros.m_1 / total : null
      };
    },

    // Se dibuja la recta de mezcla completa, pasando por el segundo origen: el
    // punto de mezcla cae sobre ella, así que el tramo de vuelta se superpone y no
    // se ve. Cuando el enunciado NO cuadra, ese tramo deja de solaparse y la
    // incoherencia se ve en el diagrama antes que en la tabla.
    trazar(origenes) {
      return [origenes[1]];
    },

    destino(origenes, parametros) {
      const [uno, dos] = origenes;
      const total = parametros.m_1 + parametros.m_2;
      if (!Number.isFinite(total) || total <= 0) return null;

      return {
        in1Id: 'P', in1Val: uno.P,
        in2Id: 'W', in2Val: (parametros.m_1 * uno.W + parametros.m_2 * dos.W) / total,
        in3Id: 'H', in3Val: (parametros.m_1 * uno.H + parametros.m_2 * dos.H) / total
      };
    }
  },

  // El comodín del aire, gemelo del de fluidos: no supone nada, luego no puede
  // contradecir nada. Sin hipótesis no se sabe cuánto de su Δh es calor, y por eso
  // un ciclo que lo contenga no se puede balancear.
  genericoAire: {
    verificar() {
      return [];
    },

    derivados(origenes, destino) {
      const { dh, dw, dt } = saltos(origenes[0], destino);
      return { dh, dw, dt };
    },

    trazar() {
      return [];
    }

    // Sin destino(): no hay hipótesis con la que calcularlo.
  }
};
