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

  it('reconstruye también los procesos del aire húmedo', () => {
    // Una mezcla adiabática: es la que más cosas tiene que sobrevivir al viaje
    // —dos orígenes, dos caudales y un tipo de otro dominio—.
    nuevoAire();
    nuevoAire();
    nuevoAire();
    const [a1, a2, a3] = listaAires.get({ noproxy: true });
    nuevoProceso(a1.id, a3.id, 'aire');
    const [creado] = listaProcesos.get({ noproxy: true });
    listaProcesos[0].set({
      ...creado, tipo: 'mezcla_adiabatica', origenes: [a1.id, a2.id],
      parametros: { m_1: 1, m_2: 3 }
    });

    const problema = serializarProblema();
    listaAires.set([]);
    listaProcesos.set([]);
    aplicarProblema(problema);

    const proceso = listaProcesos.get({ noproxy: true })[0];
    expect(proceso.tipo).toBe('mezcla_adiabatica');
    expect(proceso.origenes).toEqual([a1.id, a2.id]);
    expect(proceso.parametros).toEqual({ m_1: 1, m_2: 3 });
    expect(listaAires.get({ noproxy: true })).toHaveLength(3);
  });

  it('conserva qué estados de aire se dibujan', () => {
    nuevoAire();
    nuevoAire();
    listaAires[1].merge({ enDiagrama: false });

    aplicarProblema(serializarProblema());

    const [uno, dos] = listaAires.get({ noproxy: true });
    expect(uno.enDiagrama).toBe(true);
    expect(dos.enDiagrama).toBe(false);
  });

  it('abre un enlace de la 2.2.1, con claves de configuración ya retiradas', () => {
    // El panel del psicrométrico desapareció al unificar los diagramas. Un enlace
    // anterior sigue trayendo sus claves, y tiene que abrirse igual: por eso
    // quitarlas de la lista blanca no obliga a subir la versión del esquema.
    const antiguo = {
      v: 1,
      estados: [],
      aires: [{
        id: 'a1', nombre: 'Ambiente',
        in1Id: 'A', in1Val: 0, in2Id: 'T', in2Val: 22, in3Id: 'HR', in3Val: 55
      }],
      procesos: [],
      configuracion: {
        nCifras: 5,
        verPsicrometrico: true,
        ejeXmaxPsicrometrico: 50,
        colorDatos: '#FF0000'
      }
    };

    expect(() => aplicarProblema(antiguo)).not.toThrow();

    const [estado] = listaAires.get({ noproxy: true });
    expect(estado.T).toBeCloseTo(22, 6);
    // Sin enDiagrama declarado se lee como visible, no como oculto.
    expect(estado.enDiagrama).toBe(true);
    expect(configuracion.nCifras.get()).toBe(5);
    // Y las claves retiradas ni se aplican ni dejan rastro. Se mira el estado
    // crudo porque hookstate devuelve un proxy hasta para una clave inexistente.
    const ajustes = configuracion.get({ noproxy: true });
    expect(ajustes.verPsicrometrico).toBeUndefined();
    expect(ajustes.colorDatos).toBeUndefined();
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
