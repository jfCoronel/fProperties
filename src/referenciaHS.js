// Cambio del estado de referencia de h y s (ver propFluidos/fluidos.js).
//
// Un estado definido por h o s guarda ese número, que solo significa algo con
// su referencia. Al cambiarla se convierten esas entradas para que cada estado
// siga siendo el mismo estado físico; recalcular sin convertir lo movería.
// Los procesos y los ciclos solo usan diferencias y no les afecta.
import { configuracion } from './configuracion';
import { listaFluidos } from './listaFluidos';
import { propagarProcesos } from './procesos/propagacion';
import {
  getObjetoFluido, getReferenciaHS, setReferenciaHS, convertirReferencia
} from './propFluidos/fluidos';

export function cambiarReferenciaHS(nueva) {
  const anterior = getReferenciaHS();
  if (nueva === anterior) return;

  const convertidos = listaFluidos.get({ noproxy: true }).map((estado) => ({
    ...estado,
    in1Val: convertirReferencia(estado.fluido, estado.in1Id, estado.in1Val, anterior, nueva),
    in2Val: convertirReferencia(estado.fluido, estado.in2Id, estado.in2Val, anterior, nueva)
  }));

  setReferenciaHS(nueva);
  configuracion.referenciaHS.set(getReferenciaHS());

  listaFluidos.set(convertidos.map((estado) => ({
    ...estado,
    ...getObjetoFluido(estado.fluido, estado.in1Id, estado.in1Val, estado.in2Id, estado.in2Val)
  })));
  propagarProcesos();
}
