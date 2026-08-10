import { useHookstate } from '@hookstate/core';
import { Descriptions, Tag, Tooltip } from 'antd';
import { WarningTwoTone } from '@ant-design/icons';

import { configuracion, getTextoUI } from '../configuracion';
import { listaFluidos } from '../listaFluidos';
import { listaProcesos } from '../procesos/listaProcesos';
import { getCiclos } from '../procesos/ciclo';
import formatear from '../util/formatear';

// El balance de un ciclo no necesita un objeto nuevo: sale de los procesos que
// ya hay, en cuanto forman un camino cerrado (PLAN-PROCESOS.md §F7). El panel
// solo aparece cuando existe ese camino.
const Ciclos = () => {
    const { nCifras, procesosSeleccionados } = useHookstate(configuracion);
    const procesos = useHookstate(listaProcesos);
    const estados = useHookstate(listaFluidos);

    const cifras = nCifras.get();
    const listaEstados = estados.get({ noproxy: true });
    const ciclos = getCiclos(procesos.get({ noproxy: true }), listaEstados);

    if (ciclos.length === 0) return (<></>);

    const nombreEstado = (id) => listaEstados.find((estado) => estado.id === id)?.nombre ?? id;

    const magnitud = (valor, unidad) => `${formatear(valor, cifras)} ${unidad}`;

    // Con un caudal común para todo el ciclo, las magnitudes específicas se
    // acompañan de la potencia; sin él, se dan solo por unidad de masa.
    const conPotencia = (valor, caudal) => caudal === null
        ? magnitud(valor, 'kJ/kg')
        : `${magnitud(valor, 'kJ/kg')} (${magnitud(valor * caudal, 'kW')})`;

    const indicadores = (ciclo) => {
        if (ciclo.indicador === null) return [];
        if (ciclo.indicador.eta_termico !== undefined) {
            return [{
                key: 'eta',
                label: getTextoUI("ciclo_rendimiento_termico"),
                children: formatear(ciclo.indicador.eta_termico, cifras)
            }];
        }
        return [
            {
                key: 'copf',
                label: getTextoUI("ciclo_cop_frigorifico"),
                children: formatear(ciclo.indicador.cop_frigorifico, cifras)
            },
            {
                key: 'copb',
                label: getTextoUI("ciclo_cop_bomba"),
                children: formatear(ciclo.indicador.cop_bomba, cifras)
            }
        ];
    };

    return (
        <div style={{ marginTop: 24 }}>
            <h3>{getTextoUI("titulo_ciclos")}</h3>

            {ciclos.map((ciclo, i) => (
                <Descriptions
                    key={ciclo.procesos.map((proceso) => proceso.id).join('-')}
                    size="small"
                    bordered
                    column={{ xs: 1, sm: 2, md: 3 }}
                    style={{ marginBottom: 16 }}
                    title={<span>
                        <a onClick={() => procesosSeleccionados.set(ciclo.procesos.map((p) => p.id))}>
                            {ciclo.estados.map(nombreEstado).join(' → ')}
                        </a>
                        {ciclo.hayAvisos && <Tooltip title={getTextoUI("ciclo_con_avisos")}>
                            <WarningTwoTone twoToneColor="#faad14" style={{ marginLeft: 8 }} />
                        </Tooltip>}
                        {ciclo.caudal !== null && <Tag style={{ marginLeft: 8 }}>
                            {magnitud(ciclo.caudal, 'kg/s')}
                        </Tag>}
                    </span>}
                    items={[
                        {
                            key: 'w',
                            label: getTextoUI("ciclo_w_neto"),
                            children: conPotencia(ciclo.w_neto, ciclo.caudal)
                        },
                        {
                            key: 'qa',
                            label: getTextoUI("ciclo_q_absorbido"),
                            children: conPotencia(ciclo.q_absorbido, ciclo.caudal)
                        },
                        {
                            key: 'qc',
                            label: getTextoUI("ciclo_q_cedido"),
                            children: conPotencia(ciclo.q_cedido, ciclo.caudal)
                        },
                        ...indicadores(ciclo)
                    ]}
                    // El índice solo entra en juego si dos ciclos comparten procesos
                    data-ciclo={i}
                />
            ))}

            <p className='comentario'>{getTextoUI("ciclo_convenio")}</p>
        </div>
    );
};

export default Ciclos;
