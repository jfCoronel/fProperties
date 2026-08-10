// Ida y vuelta contra el estado vivo: comprueba que lo que se serializa basta
// para reconstruir el problema. Es el riesgo real del permalink: un campo de
// entrada que se olvide aquí no rompe nada hasta que alguien abre el enlace.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { configuracion } from '../configuracion';
import { listaFluidos, nuevoFluido, actualizarFluido } from '../listaFluidos';
import { listaAires, nuevoAire } from '../listaAires';
import { listaProcesos, nuevoProceso } from '../procesos/listaProcesos';
import { serializarProblema, aplicarProblema } from './problema';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

beforeEach(() => {
  listaFluidos.set([]);
  listaAires.set([]);
  listaProcesos.set([]);
});

function montarProblema() {
  nuevoFluido();
  nuevoFluido();
  const [f1, f2] = listaFluidos.get({ noproxy: true });
  // El nombre se pone a mano: sin textos i18n cargados, el automático no es útil.
  actualizarFluido(f1.id, {
    ...f1, nombre: 'Aspiración', fluido: 'R134a', in1Id: 'T', in1Val: -10, in2Id: 'X', in2Val: 100
  });
  actualizarFluido(f2.id, {
    ...f2, nombre: 'Descarga', fluido: 'R134a', in1Id: 'P', in1Val: 1000, in2Id: 'T', in2Val: 60
  });
  nuevoAire();
  nuevoProceso(f1.id, f2.id);
  return [f1.id, f2.id];
}

describe('serializar y aplicar', () => {
  it('reconstruye los estados con sus propiedades recalculadas', () => {
    montarProblema();
    const antes = listaFluidos.get({ noproxy: true });
    const problema = serializarProblema();

    listaFluidos.set([]);
    listaAires.set([]);
    listaProcesos.set([]);
    aplicarProblema(problema);

    const despues = listaFluidos.get({ noproxy: true });
    expect(despues).toHaveLength(2);
    despues.forEach((estado, i) => {
      expect(estado.id).toBe(antes[i].id);
      expect(estado.nombre).toBe(antes[i].nombre);
      expect(estado.H).toBeCloseTo(antes[i].H, 8);
      expect(estado.S).toBeCloseTo(antes[i].S, 8);
      expect(estado.ESTADO).toBe(antes[i].ESTADO);
    });
    expect(listaAires.get({ noproxy: true })[0].HR).toBeCloseTo(50, 6);
  });

  it('mantiene los procesos apuntando a sus estados', () => {
    const [id1, id2] = montarProblema();
    const problema = serializarProblema();

    listaProcesos.set([]);
    aplicarProblema(problema);

    const proceso = listaProcesos.get({ noproxy: true })[0];
    expect(proceso.origenes).toEqual([id1]);
    expect(proceso.destino).toBe(id2);
  });

  it('sustituye el contenido anterior en vez de acumularlo', () => {
    montarProblema();
    const problema = serializarProblema();

    nuevoFluido(); // el navegador de quien recibe el enlace tenía algo abierto
    aplicarProblema(problema);

    expect(listaFluidos.get({ noproxy: true })).toHaveLength(2);
  });

  it('lleva la configuración del enunciado y no el estado de sesión', () => {
    montarProblema();
    configuracion.merge({ tipoDiagrama: 'T-s', nCifras: 6, verDialogoFluido: true });
    const problema = serializarProblema();

    expect(problema.configuracion.tipoDiagrama).toBe('T-s');
    expect(problema.configuracion.verDialogoFluido).toBeUndefined();

    configuracion.merge({ tipoDiagrama: 'p-h', nCifras: 4 });
    aplicarProblema(problema);

    expect(configuracion.tipoDiagrama.get()).toBe('T-s');
    expect(configuracion.nCifras.get()).toBe(6);
    expect(configuracion.fluidosSeleccionados.get({ noproxy: true })).toEqual([]);
  });
});
