// versión 1.2 basada en coolprop 6.4.1
// La varible a sido cargada globalmente con un script
// var Module = window.Module;
import { Module } from './coolprop'

const T0C = 273.15;

export const NOMBRES_FLUIDOS = {
  "1-Buteno": "1-Butene",
  Acetona: "Acetone",
  "Ácido sulfhídrico": "HydrogenSulfide",
  "Agua pesada": "HeavyWater",
  Agua: "Water",
  Aire: "Air",
  Amoniaco: "Ammonia",
  Argón: "Argon",
  Benceno: "Benzene",
  Ciclohexano: "CycloHexane",
  Ciclopentano: "Cyclopentane",
  Ciclopropano: "CycloPropane",
  "Cis-2-buteno": "cis-2-Butene",
  "Cloruro de hidrógeno": "HydrogenChloride",
  D4: "D4",
  D5: "D5",
  D6: "D6",
  Deuterio: "Deuterium",
  Dicloroetano: "Dichloroethane",
  Dietiléter: "DiethylEther",
  "Dimetil carbonato": "DimethylCarbonate",
  Dimetiléter: "DimethylEther",
  "Dióxido de azufre": "SulfurDioxide",
  "Dióxido de carbono": "CarbonDioxide",
  "Estearato de metilo": "MethylStearate",
  Etano: "Ethane",
  Etanol: "Ethanol",
  Etilbenceno: "EthylBenzene",
  etileno: "Ethylene",
  Flúor: "Fluorine",
  Helio: "Helium",
  "Hexafluoruro de azufre": "SulfurHexafluoride",
  HFE143m: "HFE143m",
  Hidrógeno: "Hydrogen",
  Isobutano: "IsoButane",
  Isobutileno: "IsoButene",
  Isohexano: "Isohexane",
  Isopentano: "Isopentane",
  Krypton: "Krypton",
  "Linoleato de metilo": "MethylLinoleate",
  "M-xileno": "m-Xylene",
  MD2M: "MD2M",
  MD3M: "MD3M",
  MD4M: "MD4M",
  mdm: "MDM",
  Metano: "Methane",
  Metanol: "Methanol",
  MM: "MM",
  "Monóxido de carbono": "CarbonMonoxide",
  "n-Butano": "n-Butane",
  "n-Decano": "n-Decane",
  "n-Dodecano": "n-Dodecane",
  "n-Heptano": "n-Heptane",
  "n-Hexano": "n-Hexane",
  "n-Nonano": "n-Nonane",
  "n-Octano": "n-Octane",
  "n-Pentano": "n-Pentane",
  "n-Propano": "n-Propane",
  "n-Undecano": "n-Undecane",
  Neón: "Neon",
  Neopentano: "Neopentane",
  Nitrogeno: "Nitrogen",
  Novec649: "Novec649 ",
  "o-Xileno": "o-Xylene",
  "Oleato de metilo": "MethylOleate",
  Ortodeuterio: "OrthoDeuterium",
  Ortohidrogeno: "OrthoHydrogen",
  "Oxido de etileno": "EthyleneOxide",
  "Oxido de nitrogeno": "NitrousOxide",
  Oxígeno: "Oxygen",
  "p-Xileno": "p-Xylene",
  "Palmitato de metilo": "MethylPalmitate",
  Paradeuterio: "ParaDeuterium",
  Parahidrogeno: "ParaHydrogen",
  Propileno: "Propylene",
  Propino: "Propyne",
  R11: "R11",
  R113: "R113",
  R114: "R114",
  R115: "R115",
  R116: "R116",
  R12: "R12",
  R123: "R123",
  "R1233zd(E)": "R1233zd(E)",
  R1234yf: "R1234yf",
  "R1234ze(E)": "R1234ze(E)",
  "R1234ze(Z)": "R1234ze(Z)",
  R124: "R124",
  R125: "R125",
  R13: "R13",
  R134a: "R134a",
  R13I1: "R13I1",
  R14: "R14",
  R141b: "R141b",
  R142b: "R142b",
  R143a: "R143a",
  R152a: "R152A",
  R161: "R161",
  R21: "R21",
  R218: "R218",
  R22: "R22",
  R227EA: "R227EA",
  R23: "R23",
  R236EA: "R236EA",
  R236FA: "R236FA",
  R245ca: "R245ca",
  R245fa: "R245fa",
  R32: "R32",
  R365MFC: "R365MFC",
  R40: "R40",
  R404A: "R404A",
  R407C: "R407C",
  R41: "R41",
  R410A: "R410A",
  R507A: "R507A",
  RC318: "RC318",
  SES36: "SES36",
  "Sulfuro de carbonilo": "CarbonylSulfide",
  Tolueno: "Toluene",
  "trans-2-Buteno": "trans-2-Butene",
  Xenon: "Xenon",
};

export const UNIDADES_FLUIDOS = {
  T: 'ºC',
  P: 'kPa',
  X: '%',
  RO: 'kg/m³',
  V: 'm³/kg',
  H: 'kJ/kg',
  U: 'kJ/kg',
  CP: 'J/(kg·K)',
  S: 'kJ/(kg·K)',
  CV: 'J/(kg·K)',
  K: 'W/(m·K)',
  PR: '',
  MU: 'Pa·s',
  NU: 'm²/s',
  ALFA: 'm²/s',
  BETA: '1/K',
  M: 'kg/mol',
  TCRIT: 'ºC',
  PCRIT: 'kPa',
  TTRIPLE: 'ºC',
  PTRIPLE: 'kPa'
}

export const PROPIEDADES_FLUIDOS = {
  T: 'T',
  P: 'p',
  X: 'X',
  RO: 'ρ',
  V: 'v',
  H: 'h',
  U: 'u',
  CP: 'c<sub>p</sub>',
  S: 's',
  CV: 'c<sub>v</sub>',
  K: 'k',
  PR: 'Pr',
  MU: 'μ',
  NU: 'ν',
  ALFA: 'α',
  BETA: 'β',
  M: 'M',
  TCRIT: 'T<sub>crit</sub>',
  PCRIT: 'p<sub>crit</sub>',
  TTRIPLE: 'T<sub>trip</sub>',
  PTRIPLE: 'T<sub>trip</sub>'
}

export function getListaFluidos(idioma = "es") {
  if (idioma === "es") {
    return Object.keys(NOMBRES_FLUIDOS);
  } else {
    return Object.values(NOMBRES_FLUIDOS);
  }
}

export function getUnidadPropFluido(propiedad) {
  return UNIDADES_FLUIDOS[propiedad];
}

// Si se produce un error devuelve NaN
export function getPropFluido(fluidoSpain, propiedadPedida, propiedad1, valor1, propiedad2, valor2) {
  const fluido = cambiarNombreFluido(fluidoSpain);
  const propPedidaCP = cambiarNombrePropiedadFluido(propiedadPedida);
  const prop1CP = cambiarNombrePropiedadFluido(propiedad1);
  const prop2CP = cambiarNombrePropiedadFluido(propiedad2);
  const v1 = cambiarUnidadEntradaFluido(propiedad1, valor1, fluido);
  const v2 = cambiarUnidadEntradaFluido(propiedad2, valor2, fluido);

  let valor;

  // Parámetros que son operaciones
  if (propPedidaCP === "NU") {
    valor =
      Module.PropsSI("V", prop1CP, v1, prop2CP, v2, fluido) /
      Module.PropsSI("D", prop1CP, v1, prop2CP, v2, fluido);
  } else if (propPedidaCP === "ALFA") {
    valor =
      Module.PropsSI("L", prop1CP, v1, prop2CP, v2, fluido) /
      (Module.PropsSI("D", prop1CP, v1, prop2CP, v2, fluido) *
        Module.PropsSI("C", prop1CP, v1, prop2CP, v2, fluido));
  } else if (propPedidaCP === "VE") { // Volumen específico
    valor = 1 / Module.PropsSI("D", prop1CP, v1, prop2CP, v2, fluido);
  } else if (propPedidaCP === "U") { // Calcularlo con la entalpía
    const entalpia = getPropFluido(fluidoSpain, "H", propiedad1, valor1, propiedad2, valor2)
    valor = entalpia - Module.PropsSI("P", prop1CP, v1, prop2CP, v2, fluido) / 1000 / Module.PropsSI("D", prop1CP, v1, prop2CP, v2, fluido)
  } else {
    valor = Module.PropsSI(propPedidaCP, prop1CP, v1, prop2CP, v2, fluido);
  }
  if (isNaN(valor) || !isFinite(valor)) {
    return NaN;
  } else {
    return cambiarUnidadSalidaFluido(propiedadPedida, valor, fluido);
  }
}

export function getObjetoFluido(fluido, propiedad1, valor1, propiedad2, valor2) {
  const t = getPropFluido(fluido, "T", propiedad1, valor1, propiedad2, valor2);
  const p = getPropFluido(fluido, "P", propiedad1, valor1, propiedad2, valor2);
  const ro = getPropFluido(fluido, "D", propiedad1, valor1, propiedad2, valor2);
  const v = getPropFluido(fluido, "V", propiedad1, valor1, propiedad2, valor2);
  const x = getPropFluido(fluido, "X", propiedad1, valor1, propiedad2, valor2);
  const h = getPropFluido(fluido, "H", propiedad1, valor1, propiedad2, valor2);
  const u = getPropFluido(fluido, "U", propiedad1, valor1, propiedad2, valor2);
  const s = getPropFluido(fluido, "S", propiedad1, valor1, propiedad2, valor2);
  const cp = getPropFluido(fluido, "CP", propiedad1, valor1, propiedad2, valor2);
  const cv = getPropFluido(fluido, "CV", propiedad1, valor1, propiedad2, valor2);
  const k = getPropFluido(fluido, "K", propiedad1, valor1, propiedad2, valor2);
  const pr = getPropFluido(fluido, "PR", propiedad1, valor1, propiedad2, valor2);
  const mu = getPropFluido(fluido, "MU", propiedad1, valor1, propiedad2, valor2);
  const nu = getPropFluido(fluido, "NU", propiedad1, valor1, propiedad2, valor2);
  const alfa = getPropFluido(fluido, "ALFA", propiedad1, valor1, propiedad2, valor2);
  const beta = getPropFluido(fluido, "BETA", propiedad1, valor1, propiedad2, valor2);
  const estado = getPropFluido(fluido, "ESTADO", propiedad1, valor1, propiedad2, valor2);
  const m = getPropFluido(fluido, "M", propiedad1, valor1, propiedad2, valor2);
  const pcrit = getPropFluido(fluido, "PCRIT", propiedad1, valor1, propiedad2, valor2);
  const tcrit = getPropFluido(fluido, "TCRIT", propiedad1, valor1, propiedad2, valor2);
  const ptriple = getPropFluido(fluido, "PTRIPLE", propiedad1, valor1, propiedad2, valor2);
  const ttriple = getPropFluido(fluido, "TTRIPLE", propiedad1, valor1, propiedad2, valor2);

  return {
    T: t,
    P: p,
    RO: ro,
    V: v,
    X: x,
    H: h,
    U: u,
    S: s,
    CP: cp,
    CV: cv,
    K: k,
    PR: pr,
    MU: mu,
    NU: nu,
    ALFA: alfa,
    BETA: beta,
    ESTADO: estado,
    M: m,
    TCRIT: tcrit,
    PCRIT: pcrit,
    TTRIPLE: ttriple,
    PTRIPLE: ptriple
  };
}

export function cambiarNombreFluido(nombreSpain) {
  const fluidoIngles = NOMBRES_FLUIDOS[nombreSpain];
  if (typeof fluidoIngles === "undefined") {
    return nombreSpain;
  } else {
    return fluidoIngles;
  }
}

function cambiarNombrePropiedadFluido(propiedad) {
  switch (propiedad) {
    case "X":
      return "Q";
    case "RO":
      return "D";
    case "V":
      return "VE";
    case "CP":
      return "C";
    case "CV":
      return "CVMASS";
    case "K":
      return "L";
    case "PR":
      return "PRANDTL";
    case "MU":
      return "V";
    case "ESTADO":
      return "Phase";
    case "BETA":
      return "ISOBARIC_EXPANSION_COEFFICIENT";
    default:
      return propiedad;
  }
}

function cambiarUnidadEntradaFluido(propiedad, valor, fluido) {
  if (propiedad === "T") {
    //ºC a K
    return valor + T0C;
  } else if (propiedad === "P") {
    // kPa a Pa
    return valor * 1000;
  } else if (propiedad === "X") {
    // % a fraccion
    return valor / 100;
  } else if (propiedad === "H") {
    // kJ/kg a J/kg
    var hRef = Module.PropsSI("H", "T", T0C, "Q", 0, fluido);
    if (isFinite(hRef)) {
      return valor * 1000 + hRef - 200000;
    } else {
      return valor * 1000;
    }
  } else if (propiedad === "S") {
    // kJ/(kg·K) a J/(kg·K)
    var sRef = Module.PropsSI("S", "T", T0C, "Q", 0, fluido);
    if (isFinite(sRef)) {
      return valor * 1000 + sRef - 1000;
    } else {
      return valor * 1000;
    }
  } else {
    return valor;
  }
}

function cambiarUnidadSalidaFluido(propiedad, valor, fluido) {
  if (propiedad === "T" || propiedad === 'TCRIT' || propiedad === 'TTRIPLE') {
    // K a ºC
    return valor - T0C;
  } else if (propiedad === "P" || propiedad === "PCRIT" || propiedad === 'PTRIPLE') {
    // Pa a kPa
    return valor / 1000;
  } else if (propiedad === "X") {
    // fraccion a %
    if (valor > 1 || valor < 0) {
      return "-";
    } else {
      return valor * 100;
    }
  } else if (propiedad === "H") {
    // J/kg a kJ/kg
    var hRef = Module.PropsSI("H", "T", T0C, "Q", 0, fluido);
    if (isFinite(hRef)) {
      return valor / 1000 - hRef / 1000 + 200;
    } else {
      return valor / 1000;
    }
  } else if (propiedad === "S") {
    // J/(kg·K) a kJ/(kg·K)
    var sRef = Module.PropsSI("S", "T", T0C, "Q", 0, fluido);
    if (isFinite(sRef)) {
      return valor / 1000 - sRef / 1000 + 1;
    } else {
      return valor / 1000;
    }
  } else if (propiedad === "ESTADO") {
    // Estado
    let estado = "Desconocido";
    switch (valor) {
      case 0:
        estado = "Líquido";
        break;
      case 5:
        estado = "Vapor";
        break;
      case 6:
        estado = "Bifásico";
        break;
      default:
        estado = "Desconocido"
    }
    return estado;
  } else {
    return valor;
  }
}

export function existeFluido(nombre) {
  const nombreCoolprop = cambiarNombreFluido(nombre);
  // Comprobar la densidad a 25ºC y 1 atm 
  const valor = Module.PropsSI("D", "T", T0C + 25, "P", 101325, nombreCoolprop);
  return isFinite(valor);
}
