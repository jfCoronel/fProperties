import { hookstate } from '@hookstate/core';

const configuracionInicial = {
  menuActual: "fluidos",
  version: 0.9,
  year: 2022,
  iActual: -1,
  columnasTablaFluidos: ["X", "RO", "H", "S", "CP", "NO", "NO"],
  columnasTablaAires: ["RO", "HR", "TH", "TR", "H", "NO", "NO"],
  verConfiguracion: false,
  nCifras: 4,
  verBarraLateral: true
}

export const configuracion = hookstate(configuracionInicial);






