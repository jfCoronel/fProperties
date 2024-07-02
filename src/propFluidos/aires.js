// versión 1.1 basada en coolprop 6.3.0
// La varible a sido cargada globalmente con un script
var Module = window.Module;
const P_ATM = 101.325;
const T0C = 273.15;

const UNIDADES_AIRES = {
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
