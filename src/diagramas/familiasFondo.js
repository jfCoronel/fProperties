// Catálogo de las líneas de fondo de cada diagrama: qué familias hay, cuáles se
// ven por defecto y cómo se dibujan. Son datos puros, sin CoolProp, porque los
// usa también la normalización del permalink (permalink/formato.js), que no debe
// arrastrar el módulo WebAssembly. El cálculo de las líneas está en
// lineasFondo.js. Ver DOCUMENTACION.md §1.3.
//
// La configuración que elige el usuario se guarda por TIPO de diagrama, no por
// fluido, en configuracion.lineasFondo:
//
//   { 'p-h': { isotermas: { activa: true, valores: null }, … }, … }
//
// con `valores: null` para "automáticos" (los elige la aplicación según el
// fluido o la presión) o una lista de números propia. Un diagrama o una familia
// que no aparezcan ahí usan su valor por defecto, así que el permalink solo
// lleva lo que el usuario ha tocado.

// Todo el fondo va en grises, como en el psicrométrico: lo que se mira son los
// estados y los procesos. Las familias se distinguen por el trazo, no por el
// color, y cada trazo tiene su nombre para la leyenda.
const GRIS = "#a6a6a6";
const GRIS_CLARO = "#c4c4c4";
const GRIS_HUMEDAD = "#999999";

export const TRAZOS = {
    continuo: [],
    discontinuo: [6, 4],
    punteado: [2, 3],
    trazoPunto: [8, 3, 2, 3]
};

// propiedad: la magnitud que se mantiene constante, con el nombre que usan
// getPropFluido o getPropAireHumedo. unidad: la de los valores propios que
// escribe el usuario, que es la de la tabla de estados.
export const FAMILIAS_FONDO = {
    'p-h': [
        { clave: 'isotermas', propiedad: 'T', unidad: 'ºC', activa: true, color: GRIS, trazo: 'continuo' },
        { clave: 'isentropicas', propiedad: 'S', unidad: 'kJ/(kg·K)', activa: true, color: GRIS, trazo: 'discontinuo' },
        { clave: 'titulo', propiedad: 'X', unidad: '%', activa: true, color: GRIS, trazo: 'punteado' },
        { clave: 'isocoras', propiedad: 'V', unidad: 'm³/kg', activa: false, color: GRIS_CLARO, trazo: 'trazoPunto' }
    ],
    'T-s': [
        { clave: 'isobaras', propiedad: 'P', unidad: 'kPa', activa: true, color: GRIS, trazo: 'continuo' },
        { clave: 'titulo', propiedad: 'X', unidad: '%', activa: true, color: GRIS, trazo: 'punteado' },
        { clave: 'isentalpicas', propiedad: 'H', unidad: 'kJ/kg', activa: false, color: GRIS, trazo: 'discontinuo' },
        { clave: 'isocoras', propiedad: 'V', unidad: 'm³/kg', activa: false, color: GRIS_CLARO, trazo: 'trazoPunto' }
    ],
    'p-T': [
        { clave: 'isocoras', propiedad: 'V', unidad: 'm³/kg', activa: false, color: GRIS, trazo: 'trazoPunto' }
    ],
    psicrometrico: [
        { clave: 'humedadRelativa', propiedad: 'HR', unidad: '%', activa: true, color: GRIS_HUMEDAD, trazo: 'continuo' },
        { clave: 'bulboHumedo', propiedad: 'TH', unidad: 'ºC', activa: true, color: GRIS, trazo: 'discontinuo' },
        // Continua como las de humedad relativa, pero más clara: la leyenda lo dice
        { clave: 'entalpia', propiedad: 'H', unidad: 'kJ/kg', activa: true, color: GRIS_CLARO, trazo: 'continuo', clara: true },
        { clave: 'volumen', propiedad: 'V', unidad: 'm³/kg', activa: false, color: GRIS, trazo: 'punteado' }
    ]
};

export const DIAGRAMAS_CON_FONDO = Object.keys(FAMILIAS_FONDO);

// Más líneas que esto en una familia no se leen, y acotarlo protege al cálculo
// (cada línea son decenas de llamadas a CoolProp) de un enlace manipulado.
export const MAX_VALORES_FAMILIA = 30;

export function getFamiliasFondo(diagrama) {
    return FAMILIAS_FONDO[diagrama] ?? [];
}

// Configuración efectiva de cada familia del diagrama: la guardada encima de la
// de por defecto.
export function configuracionFamilias(diagrama, guardada) {
    const delDiagrama = guardada?.[diagrama] ?? {};
    return getFamiliasFondo(diagrama).map((familia) => {
        const propia = delDiagrama[familia.clave] ?? {};
        return {
            ...familia,
            activa: typeof propia.activa === 'boolean' ? propia.activa : familia.activa,
            valores: Array.isArray(propia.valores) ? propia.valores : null
        };
    });
}

const valoresValidos = (valores) => Array.isArray(valores)
    && valores.length <= MAX_VALORES_FAMILIA
    && valores.every((valor) => typeof valor === 'number' && Number.isFinite(valor));

// Lo que llega de un enlace se filtra campo a campo: solo diagramas y familias
// conocidos, `activa` booleano y `valores` null o una lista corta de números.
// Lo demás se descarta en silencio, como hace el resto de la normalización.
export function normalizarLineasFondo(datos) {
    const limpia = {};
    if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) return limpia;

    DIAGRAMAS_CON_FONDO.forEach((diagrama) => {
        const delDiagrama = datos[diagrama];
        if (delDiagrama === null || typeof delDiagrama !== 'object') return;
        const familias = {};
        getFamiliasFondo(diagrama).forEach(({ clave }) => {
            const familia = delDiagrama[clave];
            if (familia === null || typeof familia !== 'object') return;
            const limpiaFamilia = {};
            if (typeof familia.activa === 'boolean') limpiaFamilia.activa = familia.activa;
            if (familia.valores === null || valoresValidos(familia.valores)) {
                limpiaFamilia.valores = familia.valores ?? null;
            }
            if (Object.keys(limpiaFamilia).length > 0) familias[clave] = limpiaFamilia;
        });
        if (Object.keys(familias).length > 0) limpia[diagrama] = familias;
    });
    return limpia;
}

// Texto que escribe el usuario → lista de valores. Se separan con punto y coma
// o espacios, y el decimal puede ir con punto o con coma: "0,5; 1; 2,5" y
// "0.5 1 2.5" dan lo mismo. Lo que no sea un número se ignora. Ordenada y sin
// repetidos, que es como se dibujan y como se rotulan.
export function parsearValores(texto) {
    const valores = String(texto ?? '')
        .split(/[;\s]+/)
        .filter((trozo) => trozo !== '')
        .map((trozo) => Number(trozo.replace(',', '.')))
        .filter(Number.isFinite);
    return [...new Set(valores)].sort((a, b) => a - b).slice(0, MAX_VALORES_FAMILIA);
}

// Lista de valores → texto para el campo del diálogo, con el decimal del idioma.
export function formatearValores(valores, idioma = 'es') {
    return (valores ?? [])
        .map((valor) => {
            const texto = String(Number(valor.toPrecision(6)));
            return idioma === 'es' ? texto.replace('.', ',') : texto;
        })
        .join('; ');
}
