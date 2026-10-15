// Refinado de la curva de un proceso al cruzar la campana.
//
// En los diagramas planos los puntos del trazado no caen justo sobre la
// campana, y la curva recorta las esquinas: el isobárico no dobla sobre la línea
// de vapor saturado sino que llega en diagonal. Insertar el punto de cruce lo
// resuelve en todos los diagramas.
//
// Los resolvedores muestrean el proceso con unos 25 puntos, suficientes en los
// diagramas planos. En el 3D el volumen va en escala logarítmica y, al cruzar la
// campana, entre el último punto de líquido y el primero de mezcla v salta
// varias décadas: la recta entre ambos atraviesa la superficie y no pasa por el
// líquido saturado. Aquí se inserta el punto exacto de cruce con la campana y se
// subdivide todo tramo en que v salte demasiado.
//
// Entre dos puntos consecutivos se interpola en (p, h). Es exacto para los
// procesos isobáricos e isentálpicos y, con puntos tan próximos, una buena
// aproximación para el resto.
//
// La subdivisión por saltos de v solo la pide el 3D: en los planos no cambia el
// dibujo y cuesta llamadas a CoolProp.
import { getPropFluido } from '../propFluidos/fluidos';

// Salto máximo de log10(v) entre dos puntos dibujados
const SALTO_MAXIMO_LOG_V = 0.05;
const PROFUNDIDAD_MAXIMA = 12;
const ITERACIONES_CRUCE = 30;

const esMezcla = (estado) => estado.X >= 0 && estado.X <= 100;

const valido = (estado) => [estado.V, estado.T, estado.P].every(Number.isFinite);

// Solo lo que piden las proyecciones (p-h, T-s, h-s, p-T, p-v-T) y saber de qué
// lado de la campana cae: el estado completo (transporte incluido) multiplicaba
// por diez el coste.
const estadoLigero = (fluido, prop1, valor1, prop2, valor2) => {
    const leer = (propiedad) => getPropFluido(fluido, propiedad, prop1, valor1, prop2, valor2);
    return {
        fluido, P: leer('P'), H: leer('H'), T: leer('T'), S: leer('S'), V: leer('V'), X: leer('X')
    };
};

const parametro = (a, b, t) => [a.P + (b.P - a.P) * t, a.H + (b.H - a.H) * t];

const estadoEn = (a, b, t) => {
    const [p, h] = parametro(a, b, t);
    return estadoLigero(a.fluido, 'P', p, 'H', h);
};

const mezclaEn = (a, b, t) => {
    const [p, h] = parametro(a, b, t);
    return esMezcla({ X: getPropFluido(a.fluido, 'X', 'P', p, 'H', h) });
};

const saltoLogV = (a, b) => Math.abs(Math.log10(b.V / a.V));

// Subdivide [a, b] hasta que v no salte más de lo permitido. Devuelve los
// puntos interiores, en orden.
function subdividir(a, b, profundidad = 0) {
    if (profundidad >= PROFUNDIDAD_MAXIMA || !(saltoLogV(a, b) > SALTO_MAXIMO_LOG_V)) return [];
    const medio = estadoEn(a, b, 0.5);
    if (!valido(medio)) return [];
    return [...subdividir(a, medio, profundidad + 1), medio, ...subdividir(medio, b, profundidad + 1)];
}

// Punto de la campana entre a (de un lado) y b (del otro), por bisección sobre
// el parámetro del tramo. Se devuelve el estado saturado exacto a esa presión.
function cruceCampana(a, b) {
    const mezclaA = esMezcla(a);
    let t0 = 0, t1 = 1;
    for (let i = 0; i < ITERACIONES_CRUCE; i++) {
        const t = (t0 + t1) / 2;
        if (mezclaEn(a, b, t) === mezclaA) t0 = t; else t1 = t;
    }
    const [presion, entalpia] = parametro(a, b, (t0 + t1) / 2);
    // El cruce está sobre la campana: la línea saturada es la de h más próxima.
    // No vale comparar volúmenes: un compresor que sale de vapor saturado acaba
    // con menos v que la mezcla y se tomaría por líquido.
    const liquido = estadoLigero(a.fluido, 'P', presion, 'X', 0);
    const vapor = estadoLigero(a.fluido, 'P', presion, 'X', 100);
    const saturado = Math.abs(liquido.H - entalpia) < Math.abs(vapor.H - entalpia) ? liquido : vapor;
    return valido(saturado) ? saturado : null;
}

/**
 * @param estados      curva del proceso, estados completos con V, T, P, H, X
 * @param subdividir   true para añadir puntos donde v salta mucho (3D)
 * @returns la misma curva con el cruce de la campana y, si se pide, los puntos
 *          intermedios
 */
export function refinarTrazo(estados, { subdividir: conSubdivision = false } = {}) {
    const interiores = conSubdivision ? subdividir : () => [];
    if (estados.length < 2) return estados;
    const resultado = [estados[0]];
    for (let i = 1; i < estados.length; i++) {
        const a = estados[i - 1], b = estados[i];
        const fluidoComun = a.fluido && a.fluido === b.fluido;
        if (!fluidoComun || !valido(a) || !valido(b) || ![a.H, b.H].every(Number.isFinite)) {
            resultado.push(b);
            continue;
        }
        const cruce = esMezcla(a) !== esMezcla(b) ? cruceCampana(a, b) : null;
        if (cruce) {
            resultado.push(...interiores(a, cruce), cruce, ...interiores(cruce, b));
        } else {
            resultado.push(...interiores(a, b));
        }
        resultado.push(b);
    }
    return resultado;
}
