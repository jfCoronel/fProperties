import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, InputNumber, Form } from 'antd';
import { configuracion, getTextoUI } from '../configuracion';
import { listaAires } from '../listaAires';
import { getPropAireHumedo } from '../propFluidos/aires';
import formatear from '../util/formatear';
import { useMemo } from 'react';
import GraficaEstados from './GraficaEstados';
import PanelLineasFondo from './PanelLineasFondo';
import {
    curvasFondoAire, valoresAutomaticosAire, recortarPolilinea, VENTANA_PSICROMETRICO
} from '../diagramas/lineasFondo';
import { leyendaFondo } from '../diagramas/leyendaFondo';

// Diagrama psicrométrico. Mismo esqueleto que el de fluidos: todo lo que no sea
// la proyección a los ejes y las curvas de fondo vive en GraficaEstados.
// Ver DOCUMENTACION.md §3.6.
//
// El papel que en el diagrama de fluidos hace "qué fluido se dibuja" lo hace aquí
// "a qué presión total": un estado de aire a otra altitud es otro sistema, y sus
// curvas de saturación son otras, así que no cabe en el mismo gráfico.

const { Option } = Select;

// La curva de saturación no es una familia de fondo que se pueda apagar: es la
// campana del psicrométrico, como la de los diagramas de fluido. Va en el gris
// más oscuro del fondo y más gruesa. Las demás líneas las da lineasFondo.js.
const GRIS_SATURACION = "#737373";

// Dos estados están en el mismo diagrama si comparten presión total. Se compara
// la presión y no la altitud porque es lo que de verdad usa CoolProp: dos estados
// dados uno por altitud y otro por presión equivalente son el mismo sistema.
const MISMA_PRESION = 1e-3;

const Psicrometrico = () => {
    const lista = useHookstate(listaAires);
    const {
        tipoPsicrometrico, opcionPsicrometrico, valorOpcionPsicrometrico, airesSeleccionados,
        lineasFondo, idioma
    } = useHookstate(configuracion);

    const tipoActual = tipoPsicrometrico.get();
    const opcionActual = opcionPsicrometrico.get();
    const valorActual = valorOpcionPsicrometrico.get();
    const estadosActuales = lista.get({ noproxy: true });

    // Presión total del diagrama, venga dada como altitud o como presión.
    const presionDiagrama = getPropAireHumedo(
        "P", opcionActual, valorActual, 'T', 25, 'HR', 50
    );

    // Las curvas de fondo son unos cientos de llamadas a CoolProp: se recalculan
    // solo cuando cambia la presión del diagrama, su configuración o el idioma
    // (que cambia el decimal de los rótulos), no en cada render.
    const lineasGuardadas = lineasFondo.get({ noproxy: true });
    const firmaFondo = JSON.stringify(lineasGuardadas.psicrometrico ?? {});
    const idiomaActual = idioma.get();
    const curvasFondo = useMemo(() => {
        const { xMin, xMax } = VENTANA_PSICROMETRICO;
        const saturacion = [];
        for (let t = xMin; t <= xMax; t++) {
            saturacion.push({ x: t, y: getPropAireHumedo("W", opcionActual, valorActual, 'T', t, 'HR', 100) });
        }
        return [
            ...curvasFondoAire(opcionActual, valorActual, lineasGuardadas, idiomaActual),
            ...recortarPolilinea(saturacion, VENTANA_PSICROMETRICO).map((trozo) => ({
                data: trozo, showLine: true, pointRadius: 0, borderColor: GRIS_SATURACION, borderWidth: 3
            }))
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opcionActual, valorActual, firmaFondo, idiomaActual]);

    const panelFondo = (
        <PanelLineasFondo
            diagrama="psicrometrico"
            valoresAutomaticos={(familia) => valoresAutomaticosAire(familia, opcionActual, valorActual)}
        />
    );

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
            panelFondo={panelFondo}
            pie={<>
                <p className='comentario' style={{ marginTop: 0, marginBottom: 4 }}>
                    {getTextoUI("coment_psicrometrico")} — p = {formatear(presionDiagrama, 4)} kPa
                </p>
                <p className='comentario' style={{ marginTop: 0, marginBottom: 4 }}>
                    {leyendaFondo("psicrometrico", lineasGuardadas)} {getTextoUI("leyenda_recorte_psicrometrico")}
                </p>
            </>}
        />
    );
}

export default Psicrometrico;
