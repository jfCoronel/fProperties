// Cálculo de las líneas de fondo de los diagramas: valores automáticos, trazado
// de cada isolínea y recorte a la ventana del diagrama. El catálogo de familias
// está en familiasFondo.js. Ver DOCUMENTACION.md §1.3.
//
// Las isolíneas de fluido se construyen como las curvas de los procesos: una
// lista de estados (parejas de entrada para CoolProp) que se proyecta después a
// los ejes del diagrama. Así una misma isoterma sale bien en el p-h y en el h-s.
import { getPropFluido } from '../propFluidos/fluidos';
import { getPropAireHumedo, getIsolineaAire } from '../propFluidos/aires';
import { configuracionFamilias, TRAZOS } from './familiasFondo';

// Puntos por línea. Una isolínea de fluido son ~40 llamadas a CoolProp de
// ~0,5 ms, y un diagrama con tres familias de 8 líneas ronda el medio segundo:
// se recalcula solo al cambiar de fluido, de diagrama o de configuración.
const PUNTOS_LINEA = 40;

// Magnitudes de los ejes de cada diagrama de fluido, [x, y]
export const EJES_FLUIDO = { 'p-h': ['H', 'P'], 'T-s': ['S', 'T'], 'p-T': ['T', 'P'], 'h-s': ['S', 'H'] };
const Y_LOGARITMICO = new Set(['p-h']);

// ---------------------------------------------------------------------------
// Valores automáticos

// Paso "redondo" (1, 2, 2,5 o 5 por una potencia de diez) que cubre el
// intervalo con unas `objetivo` líneas.
function pasoRedondo(bruto) {
    const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
    const mantisa = [1, 2, 2.5, 5, 10].find((m) => m * potencia >= bruto * (1 - 1e-9));
    return mantisa * potencia;
}

const limpiar = (valor) => Number(valor.toPrecision(12));

export function valoresLineales(minimo, maximo, objetivo = 8) {
    if (!(maximo > minimo)) return [];
    const paso = pasoRedondo((maximo - minimo) / objetivo);
    const valores = [];
    for (let k = Math.ceil(minimo / paso - 1e-9); k * paso <= maximo * (1 + 1e-12) + 1e-12; k++) {
        valores.push(limpiar(k * paso));
    }
    return valores;
}

// 1, 2 y 5 por década; si salen demasiados, uno por década, y si aun así son
// muchos (fluidos con presiones triples minúsculas), una década sí y otra no.
export function valoresLogaritmicos(minimo, maximo) {
    if (!(minimo > 0 && maximo > minimo)) return [];
    const desde = Math.floor(Math.log10(minimo));
    const hasta = Math.ceil(Math.log10(maximo));
    const serie = (mantisas, saltoDecada = 1) => {
        const valores = [];
        for (let d = desde; d <= hasta; d += saltoDecada) {
            mantisas.forEach((m) => {
                const valor = limpiar(m * Math.pow(10, d));
                if (valor >= minimo && valor <= maximo) valores.push(valor);
            });
        }
        return valores;
    };
    const finos = serie([1, 2, 5]);
    if (finos.length <= 10) return finos;
    const decadas = serie([1]);
    return decadas.length <= 10 ? decadas : serie([1], 2);
}

// Datos del fluido que fijan la ventana del diagrama y los valores automáticos.
// La ventana va del punto triple a algo más allá del crítico: T hasta un 60 %
// del rango triple-crítico por encima del crítico, y p hasta el doble de la
// crítica. Es donde se trabaja con cada fluido sin perderse en extremos.
export function contextoFluido(fluido) {
    const tTriple = getPropFluido(fluido, "TTRIPLE", "T", 0, "X", 50);
    const tCrit = getPropFluido(fluido, "TCRIT", "T", 0, "X", 50);
    const pTriple = getPropFluido(fluido, "PTRIPLE", "T", 0, "X", 50);
    const pCrit = getPropFluido(fluido, "PCRIT", "T", 0, "X", 50);
    return {
        fluido, tTriple, tCrit, pTriple, pCrit,
        tMin: tTriple,
        tMax: tCrit + 0.6 * (tCrit - tTriple),
        pMin: pTriple,
        pMax: 2 * pCrit
    };
}

export function valoresAutomaticosFluido(familia, ctx) {
    const { fluido, tMin, tMax, pMin, pMax, tCrit } = ctx;
    switch (familia.propiedad) {
        case 'T':
            return valoresLineales(tMin, tMax);
        case 'P':
            return valoresLogaritmicos(pMin, pMax);
        case 'S':
            // La campana a la temperatura triple es la más ancha en s
            return valoresLineales(
                getPropFluido(fluido, "S", "T", tMin, "X", 0),
                getPropFluido(fluido, "S", "T", tMin, "X", 100),
                10
            );
        case 'H': {
            // El máximo de h del vapor saturado no está en ningún extremo
            const hVapor = Array.from({ length: 11 }, (_, i) =>
                getPropFluido(fluido, "H", "T", tMin + (tCrit - tMin) * i / 10, "X", 100))
                .filter(Number.isFinite);
            return valoresLineales(getPropFluido(fluido, "H", "T", tMin, "X", 0), Math.max(...hVapor));
        }
        case 'X':
            return [10, 20, 30, 40, 50, 60, 70, 80, 90];
        case 'V':
            return valoresLogaritmicos(
                getPropFluido(fluido, "V", "T", tCrit, "X", 0),
                getPropFluido(fluido, "V", "T", tMin, "X", 100)
            );
        default:
            return [];
    }
}

// ---------------------------------------------------------------------------
// Isolíneas de fluido como listas de parejas de entrada

const barridoLineal = (desde, hasta, n) =>
    Array.from({ length: n }, (_, i) => desde + (hasta - desde) * i / (n - 1));
const barridoLog = (desde, hasta, n) =>
    barridoLineal(Math.log(desde), Math.log(hasta), n).map(Math.exp);

// Un poco por dentro de la saturación: justo en ella (T, p) no fija el estado, y
// CoolProp devuelve NaN hasta una distancia relativa de ~1e-6 en presión. Más
// cerca de lo que se ve, más lejos de lo que CoolProp resuelve: 1e-4 en p
// (relativo) y 1e-3 K en T, que en h se quedan en centésimas de kJ/kg.
const DENTRO_P = 1e-4;
const DENTRO_T = 1e-3;

function parejasIsolinea(propiedad, valor, ctx) {
    const { fluido, tMin, tMax, pMin, pMax, tCrit, pCrit } = ctx;
    const mitad = PUNTOS_LINEA / 2;

    switch (propiedad) {
        // Isoterma: barre p. Por debajo del crítico cruza la campana a presión
        // constante, entre el vapor y el líquido saturados, que se ponen a mano.
        case 'T': {
            if (valor >= tCrit) return barridoLog(pMin, pMax, PUNTOS_LINEA).map((p) => ['T', valor, 'P', p]);
            const pSat = getPropFluido(fluido, "P", "T", valor, "X", 0);
            if (!Number.isFinite(pSat)) return [];
            return [
                ...barridoLog(pMin, pSat * (1 - DENTRO_P), mitad).filter((p) => p < pSat).map((p) => ['T', valor, 'P', p]),
                ['T', valor, 'X', 100],
                ['T', valor, 'X', 0],
                ...barridoLog(pSat * (1 + DENTRO_P), pMax, mitad).map((p) => ['T', valor, 'P', p])
            ];
        }
        // Isobara: barre T, y cruza la campana a temperatura constante.
        case 'P': {
            if (valor >= pCrit) return barridoLineal(tMin, tMax, PUNTOS_LINEA).map((t) => ['P', valor, 'T', t]);
            const tSat = getPropFluido(fluido, "T", "P", valor, "X", 0);
            if (!Number.isFinite(tSat)) return [];
            return [
                ...barridoLineal(tMin, tSat - DENTRO_T, mitad).filter((t) => t < tSat).map((t) => ['P', valor, 'T', t]),
                ['P', valor, 'X', 0],
                ['P', valor, 'X', 100],
                ...barridoLineal(tSat + DENTRO_T, tMax, mitad).map((t) => ['P', valor, 'T', t])
            ];
        }
        // (p, s) y (p, h) atraviesan la campana sin ayuda
        case 'S':
        case 'H':
            return barridoLog(pMin, pMax, PUNTOS_LINEA).map((p) => [propiedad, valor, 'P', p]);
        // Título constante: de la temperatura triple al punto crítico, donde se
        // juntan todas. Justo en el crítico CoolProp no resuelve; se para antes.
        case 'X':
            return barridoLineal(tMin, tCrit - 1e-3 * (tCrit - tMin), PUNTOS_LINEA)
                .map((t) => ['T', t, 'X', valor]);
        // Isócora: (ρ, T) también cruza la campana. El usuario da v; CoolProp, ρ.
        case 'V':
            return barridoLineal(tMin, tMax, PUNTOS_LINEA).map((t) => ['RO', 1 / valor, 'T', t]);
        default:
            return [];
    }
}

// Pareja de entrada → punto en los ejes, sin llamar a CoolProp para el eje que
// ya es una de las entradas.
function proyectarPareja(fluido, [a, va, b, vb], [ejeX, ejeY]) {
    const valorEje = (eje) => {
        if (eje === a) return va;
        if (eje === b) return vb;
        return getPropFluido(fluido, eje, a, va, b, vb);
    };
    return { x: valorEje(ejeX), y: valorEje(ejeY) };
}

// Ventana del diagrama en sus ejes: la caja que encierra la campana y los cuatro
// estados extremos de la ventana de (T, p). Es lo que acota las isolíneas, que
// si no se estirarían hasta donde CoolProp llegue y arrastrarían los ejes.
export function ventanaFluido(diagrama, ctx) {
    const ejes = EJES_FLUIDO[diagrama];
    const { fluido, tMin, tMax, pMin, pMax, tCrit } = ctx;
    const puntos = [
        ['T', tMin, 'P', pMin], ['T', tMin, 'P', pMax], ['T', tMax, 'P', pMin], ['T', tMax, 'P', pMax],
        ...barridoLineal(tMin, tCrit - 1e-3 * (tCrit - tMin), 12).flatMap((t) => [['T', t, 'X', 0], ['T', t, 'X', 100]])
    ].map((pareja) => proyectarPareja(fluido, pareja, ejes))
        .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y));
    return cajaDe(puntos);
}

const cajaDe = (puntos) => ({
    xMin: Math.min(...puntos.map((p) => p.x)),
    xMax: Math.max(...puntos.map((p) => p.x)),
    yMin: Math.min(...puntos.map((p) => p.y)),
    yMax: Math.max(...puntos.map((p) => p.y))
});

// ---------------------------------------------------------------------------
// Recorte de polilíneas a una caja

// Liang-Barsky: el tramo [t0, t1] del segmento p→q que cae dentro de la caja,
// o null si no la toca.
function recortarSegmento(p, q, caja) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    let t0 = 0;
    let t1 = 1;
    const bordes = [
        [-dx, p.x - caja.xMin], [dx, caja.xMax - p.x],
        [-dy, p.y - caja.yMin], [dy, caja.yMax - p.y]
    ];
    for (const [pp, qq] of bordes) {
        if (pp === 0) {
            if (qq < 0) return null;
        } else {
            const r = qq / pp;
            if (pp < 0) t0 = Math.max(t0, r);
            else t1 = Math.min(t1, r);
            if (t0 > t1) return null;
        }
    }
    return [t0, t1];
}

/**
 * Recorta una polilínea a la caja y devuelve los trozos que quedan dentro, cada
 * uno con al menos dos puntos. Con `logY` el recorte se hace en log10(y), que es
 * como se ve en un eje logarítmico: interpolar en y lineal haría que el corte
 * no cayera en el borde. Los puntos no finitos parten la línea.
 */
export function recortarPolilinea(puntos, caja, logY = false) {
    const aEspacio = (p) => ({ ...p, y: logY ? Math.log10(p.y) : p.y });
    const deEspacio = (p) => ({ ...p, y: logY ? Math.pow(10, p.y) : p.y });
    const cajaEspacio = logY
        ? { ...caja, yMin: Math.log10(caja.yMin), yMax: Math.log10(caja.yMax) }
        : caja;

    const trozos = [];
    let actual = [];
    const cerrar = () => {
        if (actual.length >= 2) trozos.push(actual.map(deEspacio));
        actual = [];
    };

    for (let i = 0; i + 1 < puntos.length; i++) {
        const p = aEspacio(puntos[i]);
        const q = aEspacio(puntos[i + 1]);
        if (![p.x, p.y, q.x, q.y].every(Number.isFinite)) { cerrar(); continue; }
        const tramo = recortarSegmento(p, q, cajaEspacio);
        if (tramo === null) { cerrar(); continue; }
        const [t0, t1] = tramo;
        const enTramo = (t) => (t === 0 ? p : t === 1 ? q
            : { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
        if (actual.length === 0 || t0 > 0) { cerrar(); actual.push(enTramo(t0)); }
        actual.push(enTramo(t1));
        if (t1 < 1) cerrar();
    }
    cerrar();
    return trozos;
}

// ---------------------------------------------------------------------------
// Datasets para el diagrama

const textoValor = (valor, idioma) => {
    const texto = String(Number(valor.toPrecision(4)));
    return idioma === 'es' ? texto.replace('.', ',') : texto;
};

// Rótulo de cada línea: el valor con lo justo para saber de qué familia es.
const ROTULOS = {
    T: (v, i) => `${textoValor(v, i)} ºC`,
    P: (v, i) => `${textoValor(v, i)} kPa`,
    S: (v, i) => `s=${textoValor(v, i)}`,
    H: (v, i) => `h=${textoValor(v, i)}`,
    X: (v, i) => `x=${textoValor(v, i)}%`,
    V: (v, i) => `v=${textoValor(v, i)}`
};

const ROTULO_FONDO = { font: '11px Arial', color: '#8c8c8c', align: 'left', dx: 3, dy: -6 };

// Los barridos van de menos a más (p o T), así que el rótulo va por defecto en
// el extremo alto de la línea. Las de título constante, no: todas acaban en el
// punto crítico y sus rótulos se apilarían allí.
const ROTULO_EN_INICIO = new Set(['X']);

// Un rótulo alineado a la izquierda de un punto pegado al borde derecho se sale
// del diagrama (las isócoras del agua acaban todas ahí): en el último 15 % de la
// ventana el texto pasa al otro lado del punto.
const BORDE_DERECHO = 0.85;
const posicionRotulo = (punto, caja) =>
    (punto.x - caja.xMin) / (caja.xMax - caja.xMin) > BORDE_DERECHO
        ? { ...ROTULO_FONDO, align: 'right', dx: -3 }
        : ROTULO_FONDO;

// Estilo de una familia como propiedades de dataset de Chart.js
const estiloFamilia = (familia) => ({
    showLine: true,
    pointRadius: 0,
    borderWidth: 1,
    borderColor: familia.color,
    borderDash: TRAZOS[familia.trazo] ?? []
});

/**
 * Datasets de fondo de un diagrama de fluido con la configuración guardada.
 * Devuelve también la ventana, por si quien llama quiere recortar con ella lo
 * suyo (la campana no hace falta: la ventana la contiene).
 */
export function curvasFondoFluido(fluido, diagrama, guardada, idioma = 'es') {
    const ejes = EJES_FLUIDO[diagrama];
    if (!ejes) return [];
    const familias = configuracionFamilias(diagrama, guardada).filter((familia) => familia.activa);
    if (familias.length === 0) return [];

    const ctx = contextoFluido(fluido);
    if (![ctx.tTriple, ctx.tCrit, ctx.pTriple, ctx.pCrit].every(Number.isFinite)) return [];
    const caja = ventanaFluido(diagrama, ctx);
    const logY = Y_LOGARITMICO.has(diagrama);

    return familias.flatMap((familia) => {
        const valores = familia.valores ?? valoresAutomaticosFluido(familia, ctx);
        return valores.flatMap((valor) => {
            // Un punto que CoolProp no resuelve se salta en vez de partir la línea:
            // el tramo une sus vecinos, y no queda un hueco donde no hay nada
            // físico que lo justifique.
            const puntos = parejasIsolinea(familia.propiedad, valor, ctx)
                .map((pareja) => proyectarPareja(fluido, pareja, ejes))
                .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y));
            const trozos = recortarPolilinea(puntos, caja, logY);
            const enInicio = ROTULO_EN_INICIO.has(familia.propiedad);
            return trozos.map((trozo, i) => {
                if (i === (enInicio ? 0 : trozos.length - 1)) {
                    const k = enInicio ? 0 : trozo.length - 1;
                    trozo[k] = {
                        ...trozo[k],
                        nombre: ROTULOS[familia.propiedad](valor, idioma),
                        posicionNombre: posicionRotulo(trozo[k], caja)
                    };
                }
                return { ...estiloFamilia(familia), data: trozo, familia: familia.clave, valor };
            });
        });
    });
}

// ---------------------------------------------------------------------------
// Psicrométrico

// Ventana fija del psicrométrico, como en los diagramas de papel. La humedad
// máxima evita que la saturación, que a 55 ºC pasa de 100 g/kg, aplaste la zona
// útil contra el eje T.
export const VENTANA_PSICROMETRICO = { xMin: -10, xMax: 55, yMin: 0, yMax: 30 };

export function valoresAutomaticosAire(familia, opcion, valorOpcion) {
    switch (familia.propiedad) {
        case 'HR':
            return [25, 50, 75];
        // Empiezan en 5 ºC: CoolProp salta al cruzar 0 ºC (agua o hielo) y la de
        // T_h = 0 no tiene extremo seco (ver getIsolineaAire).
        case 'TH':
            return [5, 10, 15, 20, 25, 30];
        case 'H':
            return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        // El volumen depende mucho de la presión total: se reparte entre el aire
        // seco más frío y el más caliente y húmedo de la ventana.
        case 'V': {
            const { xMin, xMax, yMax } = VENTANA_PSICROMETRICO;
            return valoresLineales(
                getPropAireHumedo("V", opcion, valorOpcion, "T", xMin, "W", 0),
                getPropAireHumedo("V", opcion, valorOpcion, "T", xMax, "W", yMax),
                8
            );
        }
        default:
            return [];
    }
}

// Dónde va el rótulo de cada familia del psicrométrico. Las de bulbo húmedo y
// las de volumen, en la campana (por fuera y por dentro, para no pisarse); las
// de entalpía y humedad relativa, en su extremo final, el eje w = 0 o el borde.
const ROTULO_AIRE = {
    HR: { extremo: 'fin', posicion: { align: 'right', dx: -3, dy: -6 }, texto: (v, i) => `${textoValor(v, i)} %` },
    TH: { extremo: 'inicio', posicion: { align: 'right', dx: -4, dy: -6 }, texto: textoValor },
    // Si la línea llega al eje, el rótulo a su derecha; si acaba en el borde
    // derecho de la ventana, a su izquierda, para que no se salga.
    H: {
        extremo: 'fin',
        posicion: (punto) => punto.y === 0
            ? { align: 'left', dx: 2, dy: -8 } : { align: 'right', dx: -3, dy: -6 },
        texto: textoValor
    },
    V: { extremo: 'inicio', posicion: { align: 'left', dx: 4, dy: 10 }, texto: textoValor }
};

function puntosIsolineaAire(familia, valor, opcion, valorOpcion) {
    const { xMin, xMax } = VENTANA_PSICROMETRICO;
    if (familia.propiedad === 'HR') {
        const puntos = [];
        for (let t = xMin; t <= xMax; t++) {
            puntos.push({ x: t, y: getPropAireHumedo("W", opcion, valorOpcion, 'T', t, 'HR', valor) });
        }
        return puntos;
    }
    return getIsolineaAire(opcion, valorOpcion, familia.propiedad, valor, xMin, xMax)
        .map(({ T, W }) => ({ x: T, y: W }));
}

export function curvasFondoAire(opcion, valorOpcion, guardada, idioma = 'es') {
    return configuracionFamilias('psicrometrico', guardada)
        .filter((familia) => familia.activa)
        .flatMap((familia) => {
            const valores = familia.valores ?? valoresAutomaticosAire(familia, opcion, valorOpcion);
            const rotulo = ROTULO_AIRE[familia.propiedad];
            return valores.flatMap((valor) => {
                const trozos = recortarPolilinea(
                    puntosIsolineaAire(familia, valor, opcion, valorOpcion), VENTANA_PSICROMETRICO
                );
                return trozos.map((trozo, i) => {
                    const esElDelRotulo = rotulo.extremo === 'inicio' ? i === 0 : i === trozos.length - 1;
                    if (esElDelRotulo) {
                        const k = rotulo.extremo === 'inicio' ? 0 : trozo.length - 1;
                        trozo[k] = {
                            ...trozo[k],
                            nombre: rotulo.texto(valor, idioma),
                            posicionNombre: {
                                ...ROTULO_FONDO,
                                ...(typeof rotulo.posicion === 'function' ? rotulo.posicion(trozo[k]) : rotulo.posicion)
                            }
                        };
                    }
                    return { ...estiloFamilia(familia), data: trozo, familia: familia.clave, valor };
                });
            });
        });
}
