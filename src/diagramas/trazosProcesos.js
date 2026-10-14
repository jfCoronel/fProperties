// Trazos de los procesos que caen en un diagrama, como listas de estados
// completos. Lo comparten el diagrama plano (GraficaEstados) y el 3D: cada uno
// los proyecta a sus ejes y les da su forma de dibujo.
import { evaluarProceso, trazarProceso, trazosAuxiliares } from '../procesos/proceso';

/**
 * @param procesos  procesos del dominio del diagrama
 * @param estados   todos los estados del dominio (hacen falta para evaluar)
 * @param visible   (estado) => bool, si ese estado cae en este diagrama
 * @returns [{ idProceso, estilo, estados, auxiliar, rotuloFinal? }], cada
 *          proceso seguido de sus trazos auxiliares
 */
export function trazosProcesos(procesos, estados, visible) {
    return procesos.flatMap((proceso) => {
        if (proceso.enDiagrama === false) return [];
        const evaluacion = evaluarProceso(proceso, estados);
        // Un proceso de otra sustancia (u otra presión) no pinta nada aquí
        if (!evaluacion.valido || !visible(evaluacion.destino)) return [];

        const camino = trazarProceso(proceso, evaluacion);
        if (camino.length < 2) return [];

        const base = { idProceso: proceso.id, estilo: proceso.estilo };
        return [
            { ...base, estados: camino, auxiliar: false },
            ...trazosAuxiliares(proceso, evaluacion).map((trazo) => ({
                ...base, estados: trazo.estados, auxiliar: true, rotuloFinal: trazo.rotuloFinal
            }))
        ];
    });
}
