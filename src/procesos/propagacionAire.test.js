// El modo calculado sobre una climatizadora completa: mezcla de aire exterior con
// el de retorno, batería de frío y recalentamiento. Es el caso que junta todo lo
// del aire húmedo —los tres tipos, la cadena de dependencias y el único proceso
// con dos orígenes— y además comprueba que la propagación escribe en la lista de
// aires y no en la de fluidos, que es lo que estrena el registro de dominios.
import { describe, it, expect, beforeEach } from 'vitest';
import { listaAires } from '../listaAires';
import { listaFluidos } from '../listaFluidos';
import { listaProcesos } from './listaProcesos';
import { propagarProcesos, romperVinculo, esDerivado } from './propagacion';
import { getObjetoAireHumedo } from '../propFluidos/aires';

const P = 101.325;

const punto = (id, prop2, val2, prop3, val3) => ({
  id,
  nombre: id,
  in1Id: 'P', in1Val: P,
  in2Id: prop2, in2Val: val2,
  in3Id: prop3, in3Val: val3,
  enDiagrama: true,
  ...getObjetoAireHumedo('P', P, prop2, val2, prop3, val3)
});

// Un estado vacío: lo que hay antes de que el proceso lo genere.
const vacio = (id) => punto(id, 'T', 25, 'HR', 50);

const proceso = (id, tipo, origenes, destino, parametros) => ({
  id,
  origenes,
  destino,
  tipo,
  modoDestino: 'calculado',
  parametros,
  enDiagrama: true,
  estilo: { color: '#1890FF', grosor: 2, trazo: 'solid' }
});

// Exterior 34 ºC / 60 %, retorno 24 ºC / 50 %, un tercio de aire exterior;
// batería que deja el aire a 12 ºC y 95 %, y recalentamiento hasta 18 ºC.
function montarClimatizadora() {
  listaAires.set([
    punto('a1', 'T', 34, 'HR', 60),   // exterior
    punto('a2', 'T', 24, 'HR', 50),   // retorno
    vacio('a3'),                      // mezcla
    vacio('a4'),                      // salida de la batería
    vacio('a5')                       // impulsión
  ]);
  listaProcesos.set([
    proceso('p1', 'mezcla_adiabatica', ['a1', 'a2'], 'a3', { m_1: 1, m_2: 2 }),
    proceso('p2', 'enfriamiento_deshumidificacion', ['a3'], 'a4',
      { t_final: 12, hr_final: 95, m_punto: 3 }),
    proceso('p3', 'sensible', ['a4'], 'a5', { t_final: 18, m_punto: 3 })
  ]);
}

const buscar = (id) => listaAires.get({ noproxy: true }).find((estado) => estado.id === id);

beforeEach(() => {
  listaFluidos.set([]);
  montarClimatizadora();
});

describe('propagación en el dominio del aire', () => {
  it('genera la cadena entera de una vez, en orden', () => {
    expect(propagarProcesos()).toBe(3);

    const exterior = buscar('a1');
    const retorno = buscar('a2');
    const mezcla = buscar('a3');

    // La mezcla cae entre las dos corrientes, más cerca del retorno porque hay
    // el doble de caudal.
    expect(mezcla.W).toBeCloseTo((exterior.W + 2 * retorno.W) / 3, 6);
    expect(mezcla.H).toBeCloseTo((exterior.H + 2 * retorno.H) / 3, 6);

    expect(buscar('a4').T).toBeCloseTo(12, 6);
    expect(buscar('a4').HR).toBeCloseTo(95, 4);

    // El recalentamiento es sensible: sube la seca sin tocar la humedad.
    expect(buscar('a5').T).toBeCloseTo(18, 6);
    expect(buscar('a5').W).toBeCloseTo(buscar('a4').W, 6);
  });

  it('escribe en la lista de aires y deja intacta la de fluidos', () => {
    propagarProcesos();
    expect(listaFluidos.get({ noproxy: true })).toEqual([]);
    ['a3', 'a4', 'a5'].forEach((id) => expect(esDerivado(buscar(id))).toBe(true));
    // Los dos estados de partida los pone el usuario: no los genera nadie.
    ['a1', 'a2'].forEach((id) => expect(esDerivado(buscar(id))).toBe(false));
  });

  it('todos los estados generados quedan a la presión total del problema', () => {
    propagarProcesos();
    listaAires.get({ noproxy: true }).forEach((estado) => {
      expect(estado.P).toBeCloseTo(P, 6);
    });
  });

  it('propagar dos veces no cambia nada', () => {
    propagarProcesos();
    const primera = JSON.stringify(listaAires.get({ noproxy: true }));
    propagarProcesos();
    expect(JSON.stringify(listaAires.get({ noproxy: true }))).toBe(primera);
  });

  it('mover el aire exterior arrastra toda la cadena', () => {
    propagarProcesos();
    const humedadAntes = buscar('a3').W;

    // Un día más húmedo fuera: cambia la mezcla y, con ella, todo lo que sigue.
    listaAires[0].set(punto('a1', 'T', 34, 'HR', 80));
    propagarProcesos();

    expect(buscar('a3').W).toBeGreaterThan(humedadAntes);
    // La batería sigue dejando el aire donde se le pide, pero con más agua que
    // quitar: la impulsión sale más húmeda que antes.
    expect(buscar('a4').T).toBeCloseTo(12, 6);
    expect(buscar('a5').W).toBeCloseTo(buscar('a4').W, 6);
  });

  it('cambiar un caudal de la mezcla mueve el punto de mezcla', () => {
    propagarProcesos();
    const conUnTercio = buscar('a3').W;

    // Todo aire exterior: la mezcla deja de serlo y coincide con el exterior.
    listaProcesos[0].parametros.set({ m_1: 1, m_2: 0 });
    propagarProcesos();

    expect(buscar('a3').W).toBeGreaterThan(conUnTercio);
    expect(buscar('a3').W).toBeCloseTo(buscar('a1').W, 6);
  });

  it('editar a mano un estado calculado rompe su vínculo y devuelve el proceso a manual', () => {
    propagarProcesos();
    expect(esDerivado(buscar('a4'))).toBe(true);

    const roto = romperVinculo('a4');
    expect(roto.id).toBe('p2');
    expect(esDerivado(buscar('a4'))).toBe(false);
    expect(listaProcesos.get({ noproxy: true })[1].modoDestino).toBe('manual');

    // Y a partir de ahí ese estado ya no se regenera: solo quedan la mezcla y el
    // recalentamiento.
    expect(propagarProcesos()).toBe(2);
  });
});
