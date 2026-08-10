// El modo calculado sobre un ciclo frigorífico completo: es el caso que reúne
// todo lo delicado —cadena de dependencias, arista de cierre y ruptura del
// vínculo al editar a mano—.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { esperarCoolprop } from '../test/setupCoolprop';
import { Module } from '../propFluidos/coolprop';
import { listaFluidos } from '../listaFluidos';
import { listaProcesos } from './listaProcesos';
import { propagarProcesos, romperVinculo, esDerivado } from './propagacion';
import { getObjetoFluido } from '../propFluidos/fluidos';

beforeAll(async () => {
  await esperarCoolprop(Module);
});

const estadoVacio = (id) => ({
  id, nombre: id, fluido: 'R134a', in1Id: 'T', in1Val: 25, in2Id: 'P', in2Val: 101.325,
  ...getObjetoFluido('R134a', 'T', 25, 'P', 101.325)
});

const proceso = (id, tipo, origen, destino, parametros) => ({
  id, origenes: [origen], destino, tipo, modoDestino: 'calculado', parametros,
  estilo: { color: '#1890FF', grosor: 2, trazo: 'solid' }
});

// Evaporador a −10 ºC, condensador a 1000 kPa, compresor con η = 0,75
function montarCiclo() {
  listaFluidos.set([
    {
      id: 'f1', nombre: 'Aspiración', fluido: 'R134a',
      in1Id: 'T', in1Val: -10, in2Id: 'X', in2Val: 100,
      ...getObjetoFluido('R134a', 'T', -10, 'X', 100)
    },
    estadoVacio('f2'), estadoVacio('f3'), estadoVacio('f4')
  ]);
  listaProcesos.set([
    proceso('p1', 'compresion_isentropica', 'f1', 'f2', { p_final: 1000, eta: 0.75 }),
    proceso('p2', 'isobarico', 'f2', 'f3', { x_final: 0 }),
    proceso('p3', 'isentalpico', 'f3', 'f4', { p_final: 200.6 }),
    proceso('p4', 'isobarico', 'f4', 'f1', { x_final: 100 })
  ]);
}

const porId = (id) => listaFluidos.get({ noproxy: true }).find((estado) => estado.id === id);

beforeEach(() => {
  montarCiclo();
});

describe('propagación en modo calculado', () => {
  it('genera la cadena entera a partir del estado de partida', () => {
    expect(propagarProcesos()).toBe(3);

    expect(porId('f2').P).toBeCloseTo(1000, 6);
    expect(porId('f3').X).toBeCloseTo(0, 6);
    expect(porId('f3').P).toBeCloseTo(1000, 6);
    expect(porId('f4').P).toBeCloseTo(200.6, 6);
    expect(porId('f4').H).toBeCloseTo(porId('f3').H, 6); // la laminación es isentálpica
  });

  it('el ciclo se cierra solo: la última arista no regenera el estado de partida', () => {
    const antes = porId('f1');
    propagarProcesos();

    const despues = porId('f1');
    expect(despues.H).toBe(antes.H);
    expect(esDerivado(despues)).toBe(false);
    expect(['f2', 'f3', 'f4'].every((id) => esDerivado(porId(id)))).toBe(true);
  });

  it('propagar dos veces no cambia nada', () => {
    propagarProcesos();
    const instantanea = JSON.stringify(listaFluidos.get({ noproxy: true }));
    propagarProcesos();
    expect(JSON.stringify(listaFluidos.get({ noproxy: true }))).toBe(instantanea);
  });

  it('mover el estado de partida arrastra toda la cadena', () => {
    propagarProcesos();
    const h2Antes = porId('f2').H;

    const f1 = porId('f1');
    listaFluidos[0].set({
      ...f1, in1Val: 0, ...getObjetoFluido('R134a', 'T', 0, 'X', 100)
    });
    propagarProcesos();

    expect(porId('f2').H).not.toBeCloseTo(h2Antes, 3);
    expect(porId('f4').H).toBeCloseTo(porId('f3').H, 6);
  });

  it('un proceso sin sus parámetros no genera, pero no detiene a los demás', () => {
    listaProcesos[0].merge({ parametros: {} }); // compresión sin p_final ni eta
    expect(propagarProcesos()).toBe(2);
    expect(esDerivado(porId('f2'))).toBe(false);
    expect(esDerivado(porId('f3'))).toBe(true);
  });
});

describe('editar un estado calculado', () => {
  it('devuelve su proceso a modo manual y le quita la marca', () => {
    propagarProcesos();
    expect(esDerivado(porId('f3'))).toBe(true);

    const roto = romperVinculo('f3');
    expect(roto.id).toBe('p2');
    expect(listaProcesos.get({ noproxy: true })[1].modoDestino).toBe('manual');
    expect(esDerivado(porId('f3'))).toBe(false);
  });

  it('tras romper el vínculo, la propagación ya no pisa ese estado', () => {
    propagarProcesos();
    romperVinculo('f3');

    const f3 = porId('f3');
    listaFluidos[2].set({ ...f3, in1Val: 900, ...getObjetoFluido('R134a', 'P', 900, 'X', 0) });
    propagarProcesos();

    expect(porId('f3').P).toBeCloseTo(900, 6);
  });

  it('no hace nada si el estado no era derivado', () => {
    propagarProcesos();
    expect(romperVinculo('f1')).toBeNull();
  });
});
