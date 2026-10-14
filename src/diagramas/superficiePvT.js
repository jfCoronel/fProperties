// Superficie p-v-T de un fluido puro, para el diagrama 3D.
//
// La malla es paramétrica: cada fila es una isoterma y sus columnas recorren
// tres tramos fijos —líquido comprimido, mezcla y vapor—, de modo que las
// fronteras de la campana caen siempre en las mismas columnas y la superficie
// se pliega justo por la saturación. Con una rejilla regular en (v, T) el
// líquido, casi incompresible, quedaría en una o dos columnas y la campana se
// vería dentada.
//
// Por encima de la crítica el tramo de mezcla se reduce a un punto (el volumen
// crítico), así que la malla es continua al cruzar la isoterma crítica.
//
// Se usa siempre (T, densidad) como pareja de entrada salvo para el extremo de
// alta presión del líquido: cerca del punto crítico (T, p) no es buena pareja.
//
// CoolProp no modela el sólido: la superficie empieza en la temperatura triple.
import { getPropFluido } from '../propFluidos/fluidos';
import { contextoFluido } from './lineasFondo';

const FILAS_SUBCRITICAS = 30;
const FILAS_SUPERCRITICAS = 15;
const COLUMNAS_LIQUIDO = 15;
const COLUMNAS_MEZCLA = 12;
const COLUMNAS_VAPOR = 25;
const PUNTOS_CAMPANA = 100;

// Un estado como lo pide la proyección: { V, T, P } en las unidades de la tabla.
const presionTV = (fluido, t, v) => getPropFluido(fluido, "P", "T", t, "RO", 1 / v);

const espaciadoLog = (a, b, n) => {
    if (n === 1) return [a];
    const la = Math.log(a), lb = Math.log(b);
    return Array.from({ length: n }, (_, i) => Math.exp(la + (lb - la) * i / (n - 1)));
};

const espaciadoLineal = (a, b, n) =>
    Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

// Plotly deja un hueco donde hay null; NaN lo rompe.
const limpiar = (valor) => (Number.isFinite(valor) ? valor : null);

/**
 * Isoterma de la malla: los v y p de sus columnas.
 */
function filaIsoterma(fluido, t, ctx) {
    const { tCrit, vCrit, vMax, pMax } = ctx;
    const vLiquidoMin = getPropFluido(fluido, "V", "T", t, "P", pMax);

    let vf, vg, pSat;
    if (t < tCrit) {
        vf = getPropFluido(fluido, "V", "T", t, "X", 0);
        vg = getPropFluido(fluido, "V", "T", t, "X", 100);
        pSat = getPropFluido(fluido, "P", "T", t, "X", 0);
    } else {
        // Muy por encima de la crítica, la isobara de pMax ya está a la derecha
        // del volumen crítico: el tramo de líquido se queda en un punto.
        vf = vg = Math.max(vCrit, vLiquidoMin);
        pSat = presionTV(fluido, t, vf);
    }

    const v = [], p = [];
    for (const vi of espaciadoLog(vLiquidoMin, vf, COLUMNAS_LIQUIDO)) {
        v.push(vi); p.push(presionTV(fluido, t, vi));
    }
    // En la mezcla la presión es la de saturación: no hace falta CoolProp
    for (const vi of espaciadoLog(vf, vg, COLUMNAS_MEZCLA)) {
        v.push(vi); p.push(pSat);
    }
    for (const vi of espaciadoLog(vg, Math.max(vg, vMax), COLUMNAS_VAPOR)) {
        v.push(vi); p.push(presionTV(fluido, t, vi));
    }
    return { v, p };
}

/**
 * Contexto del diagrama 3D: el de los diagramas planos (punto triple, crítico,
 * ventana de T y p) más los volúmenes que acotan la superficie.
 */
export function contextoPvT(fluido) {
    const ctx = contextoFluido(fluido);
    return {
        ...ctx,
        vCrit: 1 / getPropFluido(fluido, "RHOCRIT", "T", 0, "X", 50),
        // El vapor saturado en el punto triple es el volumen más grande de la
        // campana: la superficie llega hasta él y no más.
        vMax: getPropFluido(fluido, "V", "T", ctx.tTriple, "X", 100)
    };
}

/**
 * Malla de la superficie: matrices x (v), y (T), z (p), una fila por isoterma.
 */
export function superficiePvT(fluido, ctx = contextoPvT(fluido)) {
    const { tTriple, tCrit, tMax } = ctx;
    const temperaturas = [
        ...espaciadoLineal(tTriple, tCrit, FILAS_SUBCRITICAS),
        ...espaciadoLineal(tCrit, tMax, FILAS_SUPERCRITICAS + 1).slice(1)
    ];
    const x = [], y = [], z = [];
    for (const t of temperaturas) {
        const { v, p } = filaIsoterma(fluido, t, ctx);
        x.push(v.map(limpiar));
        y.push(v.map(() => t));
        z.push(p.map(limpiar));
    }
    return { x, y, z };
}

/**
 * Campana de saturación: líquido saturado del triple al crítico y vapor de
 * vuelta, como lista de estados { V, T, P }.
 */
export function campanaPvT(fluido, ctx = contextoPvT(fluido)) {
    const { tTriple, tCrit, pCrit, vCrit } = ctx;
    // Sin llegar a la crítica: (T, X) no se resuelve justo en ella
    const temperaturas = espaciadoLineal(tTriple, tCrit, PUNTOS_CAMPANA + 1).slice(0, -1);
    const rama = (x) => temperaturas.map((t) => ({
        V: getPropFluido(fluido, "V", "T", t, "X", x),
        T: t,
        P: getPropFluido(fluido, "P", "T", t, "X", x)
    }));
    const critico = { V: vCrit, T: tCrit, P: pCrit };
    return [...rama(0), critico, ...rama(100).reverse()]
        .filter((estado) => Object.values(estado).every(Number.isFinite));
}
