import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, InputNumber, Form } from 'antd';
import { configuracion, getTextoUI } from '../configuracion';
import { listaAires } from '../listaAires';
import { getPropAireHumedo } from '../propFluidos/aires';
import formatear from '../util/formatear';
import { useMemo } from 'react';
import GraficaEstados from './GraficaEstados';

// Diagrama psicrométrico. Mismo esqueleto que el de fluidos: todo lo que no sea
// la proyección a los ejes y las curvas de fondo vive en GraficaEstados.
// Ver DOCUMENTACION.md §3.6.
//
// El papel que en el diagrama de fluidos hace "qué fluido se dibuja" lo hace aquí
// "a qué presión total": un estado de aire a otra altitud es otro sistema, y sus
// curvas de saturación son otras, así que no cabe en el mismo gráfico.

const { Option } = Select;

// Curvas de humedad relativa constante que se dibujan de fondo.
const HUMEDADES_FONDO = [
    { hr: 100, grosor: 3 },
    { hr: 75, grosor: 1 },
    { hr: 50, grosor: 1 },
    { hr: 25, grosor: 1 }
];

// Rango de temperatura seca del fondo. Antes lo fijaba el usuario con cuatro
// campos de mínimo y máximo; ahora es fijo y el encuadre se hace con el zoom,
// como en el diagrama de fluidos.
const T_MINIMA = -10;
const T_MAXIMA = 55;

// Dos estados están en el mismo diagrama si comparten presión total. Se compara
// la presión y no la altitud porque es lo que de verdad usa CoolProp: dos estados
// dados uno por altitud y otro por presión equivalente son el mismo sistema.
const MISMA_PRESION = 1e-3;

const Psicrometrico = () => {
    const lista = useHookstate(listaAires);
    const {
        tipoPsicrometrico, opcionPsicrometrico, valorOpcionPsicrometrico, airesSeleccionados
    } = useHookstate(configuracion);

    const tipoActual = tipoPsicrometrico.get();
    const opcionActual = opcionPsicrometrico.get();
    const valorActual = valorOpcionPsicrometrico.get();
    const estadosActuales = lista.get({ noproxy: true });

    // Presión total del diagrama, venga dada como altitud o como presión.
    const presionDiagrama = getPropAireHumedo(
        "P", opcionActual, valorActual, 'T', 25, 'HR', 50
    );

    // Las curvas de ϕ constante son ~4·(rango de T) llamadas a CoolProp: se
    // recalculan solo cuando cambia la presión del diagrama, no en cada render.
    const curvasFondo = useMemo(() => HUMEDADES_FONDO.map(({ hr, grosor }) => {
        const datos = [];
        for (let t = T_MINIMA; t <= T_MAXIMA; t++) {
            const w = getPropAireHumedo("W", opcionActual, valorActual, 'T', t, 'HR', hr);
            if (Number.isFinite(w)) datos.push({ x: t, y: w });
        }
        return {
            data: datos,
            borderColor: "black",
            showLine: true,
            pointRadius: 0,
            borderWidth: grosor
        };
    }), [opcionActual, valorActual]);

    const selectorTipo = (
        <Col xs={24} sm={10} md={8} key="tipo">
            <Form.Item label={getTextoUI("lab_tipo_diagrama")} style={{ marginBottom: 8 }}>
                <Select value={tipoActual} onChange={(valor) => { tipoPsicrometrico.set(valor); }}>
                    <Option value="ninguno">{getTextoUI("tipo_ninguno")}</Option>
                    <Option value="psicrometrico">{getTextoUI("titulo_psicrometrico")}</Option>
                </Select>
            </Form.Item>
        </Col>
    );

    if (tipoActual === "ninguno") {
        return (<div className="panel">
            <Form name="selector_psicrometrico" layout="vertical" style={{ marginBottom: 8 }}>
                <Row gutter={16}>{selectorTipo}</Row>
            </Form>
        </div>);
    }

    // Altitud o presión: es lo que identifica al diagrama, igual que el fluido en
    // el de fluidos, y por eso va en la barra y no en un panel aparte.
    const selectorPresion = (
        <Col xs={24} sm={10} md={8} key="presion">
            <Form.Item label={getTextoUI("lab_opcion_psicrometrico")} style={{ marginBottom: 8 }}>
                <Row gutter={4}>
                    <Col span={10}>
                        <Select
                            style={{ width: "100%" }}
                            value={opcionActual}
                            onChange={(valor) => { opcionPsicrometrico.set(valor); }}
                        >
                            <Option value="A">{getTextoUI("tabla_altura")}</Option>
                            <Option value="P">p [kPa]</Option>
                        </Select>
                    </Col>
                    <Col span={14}>
                        <InputNumber
                            style={{ width: "100%" }}
                            value={valorActual}
                            onChange={(valor) => { valorOpcionPsicrometrico.set(valor); }}
                        />
                    </Col>
                </Row>
            </Form.Item>
        </Col>
    );

    return (
        <GraficaEstados
            dominio="aire"
            estados={estadosActuales}
            seleccionados={airesSeleccionados}
            visible={(estado) => Math.abs(estado.P - presionDiagrama) < MISMA_PRESION}
            proyectar={(estado) => ({ x: estado.T, y: estado.W })}
            etiquetaX="T [°C]"
            etiquetaY="w [g/kg a.s.]"
            firmaVista={`psicrometrico|${opcionActual}|${valorActual}`}
            curvasFondo={curvasFondo}
            titulo={getTextoUI("titulo_psicrometrico")}
            selectores={[selectorTipo, selectorPresion]}
            pie={<p className='comentario' style={{ marginTop: 0, marginBottom: 4 }}>
                {getTextoUI("coment_psicrometrico")} — p = {formatear(presionDiagrama, 4)} kPa
            </p>}
        />
    );
}

export default Psicrometrico;
