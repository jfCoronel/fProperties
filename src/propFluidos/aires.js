// versión 1.2 basada en coolprop 6.4.1
// La varible a sido cargada globalmente con un script
//var Module = window.Module;
import { Module } from './coolprop'

const P_ATM = 101.325;
const T0C = 273.15;

// Símbolos con los que el usuario ve cada propiedad del aire húmedo. Es el
// gemelo de PROPIEDADES_FLUIDOS, y lo usan los mensajes del motor de procesos
// para hablar en los términos de la tabla y no en claves internas.
export const PROPIEDADES_AIRES = {
  A: 'z',
  P: 'p',
  T: 'T',
  TH: 'T<sub>h</sub>',
  TR: 'T<sub>r</sub>',
  HR: 'ϕ',
  W: 'w',
  V: 'v',
  RO: 'ρ',
  H: 'h',
  S: 's',
  CP: 'c<sub>p</sub>'
}

export const UNIDADES_AIRES = {
  A: 'm',
  P: 'kPa',
  T: 'ºC',
  TH: 'ºC',
  TR: 'ºC',
  HR: '%',
  W: 'g/kg',
  V: 'm³/kg',
  RO: 'kg/m³',
  H: 'kJ/kg',
  S: 'kJ/(kg·K)',
  CP: 'J/(kg·K)'
}

export function getUnidadPropAire(propiedad) {
  return UNIDADES_AIRES[propiedad];
}

export function getPropAireHumedo(propiedadPedida, propiedad1, valor1, propiedad2, valor2, propiedad3, valor3) {
  const propPedidaCP = cambiarNombrePropiedadAireHumedo(propiedadPedida);
  const presion = calcularPresion(propiedad1, valor1);
  const prop2CP = cambiarNombrePropiedadAireHumedo(propiedad2);
  const prop3CP = cambiarNombrePropiedadAireHumedo(propiedad3);
  const v2 = cambiarUnidadEntradaAireHumedo(propiedad2, valor2);
  const v3 = cambiarUnidadEntradaAireHumedo(propiedad3, valor3);

  if (presion) {
    if (propiedadPedida === "A") {
      return (1 - Math.pow(presion / (P_ATM * 1000), 0.19026237)) / 2.25577e-5;
    } else if (propiedadPedida === "P") {
      return presion / 1000;
    } else {
      const valor = Module.HAPropsSI(propPedidaCP, "P", presion, prop2CP, v2, prop3CP, v3);
      if (isNaN(valor) || !isFinite(valor)) {
        return NaN; // Error en la llamada a Coolprop
      } else {
        return cambiarUnidadSalidaAireHumedo(propiedadPedida, valor);
      }
    }
  } else {
    return NaN; // Error en el cálculo de presiones
  }
}


export function getObjetoAireHumedo(key1, val1, key2, val2, key3, val3) {
  const a = getPropAireHumedo("A", key1, val1, key2, val2, key3, val3);
  const p = getPropAireHumedo("P", key1, val1, key2, val2, key3, val3);
  const t = getPropAireHumedo("T", key1, val1, key2, val2, key3, val3);
  const th = getPropAireHumedo("TH", key1, val1, key2, val2, key3, val3);
  const tr = getPropAireHumedo("TR", key1, val1, key2, val2, key3, val3);
  const hr = getPropAireHumedo("HR", key1, val1, key2, val2, key3, val3);
  const w = getPropAireHumedo("W", key1, val1, key2, val2, key3, val3);
  const v = getPropAireHumedo("V", key1, val1, key2, val2, key3, val3);
  const ro = getPropAireHumedo("RO", key1, val1, key2, val2, key3, val3);
  const h = getPropAireHumedo("H", key1, val1, key2, val2, key3, val3);
  const s = getPropAireHumedo("S", key1, val1, key2, val2, key3, val3);
  const cp = getPropAireHumedo("CP", key1, val1, key2, val2, key3, val3);

  return {
    A: a,
    P: p,
    T: t,
    TH: th,
    TR: tr,
    HR: hr,
    W: w,
    V: v,
    RO: ro,
    H: h,
    S: s,
    CP: cp,
  };
}


// Isolínea del psicrométrico para una propiedad fija (TH o H) como lista de
// puntos { T, W }, recortada a [tMin, tMax]. Va de la saturación (ϕ = 100 %) al
// aire seco (w = 0), con esos dos extremos exactos y PUNTOS_ISOLINEA tramos entre
// ellos.
//
// No se pide a CoolProp "w dados T y T_h" punto a punto: es una inversión que
// itera por dentro y cuesta ~85 ms, varios segundos por diagrama. Se aprovecha
// que en las dos familias la entalpía es LINEAL en w a lo largo de la línea:
//   - entalpía constante: h = cte, pendiente nula;
//   - bulbo húmedo: CoolProp lo define como temperatura de saturación adiabática,
//     h + (w_sat − w)·h_agua(T_h) = h_sat, y con T_h fija h_agua es constante.
// La recta h(w) sale de los dos extremos, y cada punto interior se resuelve con
// una secante sobre (T, w) → h, la llamada más barata de CoolProp (~0,1 ms).
const PUNTOS_ISOLINEA = 10;

export function getIsolineaAire(propiedad1, valor1, propiedadFija, valorFijo, tMin, tMax) {
  const prop = (pedida, p2, v2, p3, v3) => getPropAireHumedo(pedida, propiedad1, valor1, p2, v2, p3, v3);
  const entalpia = (t, w) => prop("H", "T", t, "W", w);

  // En saturación la temperatura húmeda es la seca: se ahorra una inversión lenta
  const tSaturacion = propiedadFija === "TH"
    ? valorFijo : prop("T", propiedadFija, valorFijo, "HR", 100);
  if (!Number.isFinite(tSaturacion) || tSaturacion >= tMax) return [];
  const wSaturacion = prop("W", "T", tSaturacion, "HR", 100);
  const hSaturacion = entalpia(tSaturacion, wSaturacion);

  // Extremo seco: con w = 0 la propiedad solo depende de T. Se calcula aunque
  // caiga más allá de tMax, porque es el que fija la pendiente de la recta h(w).
  // Puede no existir: el bulbo húmedo de CoolProp salta al cruzar 0 ºC (agua
  // líquida o hielo), y T_h ≈ 0 no se alcanza con w = 0. Sin extremo, sin línea.
  const tSeco = secante(
    (t) => prop(propiedadFija, "T", t, "W", 0) - valorFijo, tSaturacion, tSaturacion + 10
  );
  if (!Number.isFinite(tSeco)) return [];
  const pendiente = (hSaturacion - entalpia(tSeco, 0)) / wSaturacion;
  const hLinea = (w) => hSaturacion + pendiente * (w - wSaturacion);

  const inicio = Math.max(tSaturacion, tMin);
  const fin = Math.min(tSeco, tMax);
  if (inicio >= fin) return [];

  const puntos = [];
  for (let i = 0; i <= PUNTOS_ISOLINEA; i++) {
    // Los extremos, exactos: interpolados podrían no coincidir con tSeco por redondeo
    const t = i === PUNTOS_ISOLINEA ? fin : inicio + (fin - inicio) * i / PUNTOS_ISOLINEA;
    let w;
    if (t === tSaturacion) w = wSaturacion;
    else if (t === tSeco) w = 0;
    else {
      // Primera aproximación: la recta T-w entre los extremos
      const w0 = wSaturacion * (tSeco - t) / (tSeco - tSaturacion);
      w = secante((wi) => entalpia(t, wi) - hLinea(wi), w0, w0 * 1.02 + 0.01);
    }
    // Junto al extremo seco la secante puede dar w = -1e-12: se fija a 0 para
    // que la línea toque el eje y no lo cruce.
    if (Number.isFinite(w)) puntos.push({ T: t, W: Math.max(w, 0) });
  }
  return puntos;
}

// Raíz de f por el método de la secante desde x0 y x1. NaN si no converge.
function secante(f, x0, x1, tolerancia = 1e-9, iteraciones = 30) {
  let f0 = f(x0);
  let f1 = f(x1);
  for (let i = 0; i < iteraciones; i++) {
    if (!Number.isFinite(f0) || !Number.isFinite(f1) || f1 === f0) break;
    const x2 = x1 - f1 * (x1 - x0) / (f1 - f0);
    if (Math.abs(x2 - x1) <= tolerancia * Math.max(1, Math.abs(x2))) return x2;
    [x0, f0, x1, f1] = [x1, f1, x2, f(x2)];
  }
  return Math.abs(f1) < 1e-6 ? x1 : NaN;
}

function cambiarNombrePropiedadAireHumedo(propiedad) {
  switch (propiedad) {
    case "TH": return "B";
    case "TR": return "D";
    case "HR": return "R";
    case "RO": return "V";
    case "CP": return "C";
    default: return propiedad;
  }
}

function cambiarUnidadEntradaAireHumedo(propiedad, valor) {
  if (propiedad === "T" || propiedad === "TH" || propiedad === "TR") { //ºC a K
    return valor + T0C;
  } else if (propiedad === "W") { // g a kg
    return valor / 1000;
  } else if (propiedad === "HR") { // % a fraccion
    return valor / 100;
  } else if (propiedad === "RO") { // es en realidad V
    return 1 / valor;
  } else if (propiedad === "H") { // kJ/kg a J/kg
    return valor * 1000;
  } else if (propiedad === "S") { // kJ/(kg·K) a J/(kg·K)
    return valor * 1000;
  } else {
    return valor;
  }
}

function cambiarUnidadSalidaAireHumedo(propiedad, valor) {
  if (propiedad === "T" || propiedad === "TH" || propiedad === "TR") { //K a ºC
    return valor - T0C;
  } else if (propiedad === "W") { // kg a g
    return valor * 1000;
  } else if (propiedad === "HR") { // fraccion a %
    return valor * 100;
  } else if (propiedad === "RO") { // es en realidad V
    return 1 / valor;
  } else if (propiedad === "H") { // J/kg a kJ/kg
    return valor / 1000;
  } else if (propiedad === "S") { // J/(kg·K) a kJ/(kg·K)
    return valor / 1000;
  } else {
    return valor;
  }
}

// Devuel la presión en Pa
function calcularPresion(propiedad, valor) {
  if (propiedad === "A") { // Altura de la localidad en m
    return P_ATM * 1000 * Math.pow(1 - 2.25577e-5 * valor, 5.2559);
  } else if (propiedad === "P") { // Presión total en kPa
    return valor * 1000;
  } else {
    return NaN;
  }
}
