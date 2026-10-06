import { getTextoUI } from '../configuracion';
import { configuracionFamilias } from './familiasFondo';

// Leyenda del fondo para el pie del diagrama: las familias encendidas, con su
// unidad y su trazo ("isotermas [ºC] (continuas), …").
export function leyendaFondo(diagrama, guardada) {
    const activas = configuracionFamilias(diagrama, guardada).filter((familia) => familia.activa);
    if (activas.length === 0) return null;
    const partes = activas.map((familia) => `${getTextoUI(`fondo_${familia.clave}`).toLowerCase()} `
        + `[${familia.unidad}] (${getTextoUI(`trazo_${familia.trazo}`)}`
        + `${familia.clara ? ` ${getTextoUI("trazo_claras")}` : ''})`);
    return `${getTextoUI("leyenda_fondo")}: ${partes.join(', ')}.`;
}
