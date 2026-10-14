import { useHookstate } from '@hookstate/core';
import { Row, Col, Form, Button, Tooltip, Spin } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { configuracion, getTextoUI } from '../configuracion';
import { listaProcesos, idsProcesosDeEstados } from '../procesos/listaProcesos';
import { dominioDeProceso } from '../procesos/proceso';
import { trazosProcesos } from '../diagramas/trazosProcesos';
import { contextoPvT, superficiePvT, campanaPvT } from '../diagramas/superficiePvT';
import { valoresLineales } from '../diagramas/lineasFondo';
import { refinarTrazo } from '../diagramas/refinarTrazo';

// Diagrama p-v-T en 3D. No usa GraficaEstados: Chart.js no dibuja en 3D, así
// que aquí se dibuja con Plotly, que se carga solo al abrir este diagrama (pesa
// más que todo el resto de la aplicación). Los estados y los procesos son los
// mismos que en los diagramas planos: solo cambia la proyección.

// Mismos colores y tamaños que los diagramas planos (GraficaEstados)
const COLOR_ESTADOS = "#0000FF";
const TAMANO_ESTADO = 10;
const TAMANO_ESTADO_SELECCIONADO = 16;
const COLOR_SUPERFICIE = "#d9d9d9";
const COLOR_ISOTERMAS = "#8c8c8c";

// p hacia arriba, v hacia la derecha y T hacia el fondo: la vista de los libros
const CAMARA_INICIAL = { eye: { x: 1.6, y: -1.5, z: 0.8 }, up: { x: 0, y: 0, z: 1 } };

const proyectar = (estado) => ({ x: estado.V, y: estado.T, z: estado.P });

// Una lista de estados a las columnas x, y, z que pide Plotly
const columnas = (estados) => {
    const puntos = estados.map(proyectar);
    return { x: puntos.map((p) => p.x), y: puntos.map((p) => p.y), z: puntos.map((p) => p.z) };
};

// Resumen corto (djb2, en base 36) de un texto cualquiera
const resumen = (texto) => {
    let h = 5381;
    for (let i = 0; i < texto.length; i++) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
    return h.toString(36);
};

const PLANTILLA_PUNTO = "v: %{x:.4g} m³/kg<br>T: %{y:.4g} ºC<br>p: %{z:.4g} kPa";

/**
 * @param estados        todos los estados de fluido (hacen falta para evaluar)
 * @param seleccionados  hookstate con los ids seleccionados en la tabla
 * @param visible        (estado) => bool, si ese estado es del fluido elegido
 * @param fluido         fluido del diagrama
 * @param selectores     <Col> del tipo y del fluido; el reencuadre lo añade este
 * @param pie            líneas informativas bajo los selectores
 */
const Diagrama3D = ({ estados, seleccionados, visible, fluido, titulo, selectores, pie }) => {
    const { procesosSeleccionados, idProcesoActual, idioma } = useHookstate(configuracion);
    const procesos = useHookstate(listaProcesos);
    const procesosActuales = procesos.get({ noproxy: true })
        .filter((proceso) => dominioDeProceso(proceso) === "fluido");

    const referenciaLienzo = useRef(null);
    const [plotly, setPlotly] = useState(null);

    useEffect(() => {
        let vigente = true;
        import('plotly.js-gl3d-dist-min').then((modulo) => {
            if (vigente) setPlotly(() => modulo.default ?? modulo);
        });
        return () => { vigente = false; };
    }, []);

    // La superficie son unas 2000 llamadas a CoolProp: solo cuando cambia el fluido
    const fondo = useMemo(() => {
        const ctx = contextoPvT(fluido);
        const superficie = superficiePvT(fluido, ctx);
        const pasoIsotermas = valoresLineales(ctx.tMin, ctx.tMax, 8);
        return [
            {
                type: 'surface',
                ...superficie,
                colorscale: [[0, COLOR_SUPERFICIE], [1, COLOR_SUPERFICIE]],
                showscale: false,
                opacity: 0.9,
                lighting: { ambient: 0.7, diffuse: 0.5, specular: 0.05 },
                // La superficie es fondo: ni valores ni isolíneas al pasar por
                // encima, que tapaban los de los estados y los procesos.
                hoverinfo: 'skip',
                contours: {
                    x: { highlight: false },
                    z: { highlight: false },
                    y: {
                        show: true,
                        highlight: false,
                        color: COLOR_ISOTERMAS,
                        start: pasoIsotermas[0],
                        end: pasoIsotermas.at(-1),
                        size: pasoIsotermas[1] - pasoIsotermas[0]
                    }
                }
            },
            {
                type: 'scatter3d',
                mode: 'lines',
                ...columnas(campanaPvT(fluido, ctx)),
                line: { color: 'black', width: 5 },
                hoverinfo: 'skip'
            }
        ];
    }, [fluido]);

    // Las curvas de los procesos se rehacen solo si cambian los procesos o los
    // estados que enlazan, igual que en los diagramas planos.
    const firmaProcesos = JSON.stringify(procesosActuales);
    const firmaEstados = JSON.stringify(estados.map((estado) => [estado.id, proyectar(estado)]));
    const trazos = useMemo(
        () => trazosProcesos(procesosActuales, estados, visible)
            .map((trazo) => ({ ...trazo, estados: refinarTrazo(trazo.estados, { subdividir: true }) })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [firmaProcesos, firmaEstados, fluido]
    );

    const idsResaltados = new Set([
        ...procesosSeleccionados.get(),
        ...idsProcesosDeEstados([...seleccionados.get()])
    ]);

    const seriesProcesos = trazos.map((trazo) => {
        const resaltado = idsResaltados.has(trazo.idProceso);
        const { color, grosor, trazo: tipoTrazo } = trazo.estilo;
        const nombre = `${trazo.estados[0].nombre ?? ""} → ${trazo.estados.at(-1).nombre ?? ""}`;
        return {
            type: 'scatter3d',
            mode: 'lines',
            ...columnas(trazo.estados),
            line: trazo.auxiliar
                ? { color, width: resaltado ? 3 : 2, dash: 'dot' }
                : { color, width: grosor + (resaltado ? 3 : 0) + 1, dash: tipoTrazo === "dashed" ? 'dash' : 'solid' },
            // Los auxiliares son construcciones, no estados del fluido
            hovertemplate: trazo.auxiliar
                ? undefined
                : `<b>${nombre}</b><br>` + PLANTILLA_PUNTO + "<extra></extra>",
            hoverinfo: trazo.auxiliar ? 'skip' : undefined,
            meta: { idProceso: trazo.idProceso }
        };
    });

    const marcados = new Set(seleccionados.get());
    const dibujables = estados.filter((estado) => visible(estado) && estado.enDiagrama !== false);
    const nombres = dibujables.map((estado) => estado.nombre);
    const serieEstados = {
        type: 'scatter3d',
        mode: 'markers',
        ...columnas(dibujables),
        text: nombres,
        marker: {
            symbol: 'circle-open',
            color: COLOR_ESTADOS,
            size: dibujables.map((estado) => (
                marcados.has(estado.id) ? TAMANO_ESTADO_SELECCIONADO : TAMANO_ESTADO
            )),
            line: { width: 2 }
        },
        hovertemplate: "<b>%{text}</b><br>" + PLANTILLA_PUNTO + "<extra></extra>"
    };
    // Puntos y rótulos van en series separadas: en una sola, Plotly 3D aplica a
    // los textos la lista de tamaños de los puntos y solo el primero sale bien.
    //
    // Además, Plotly 3D dibuja diminutos los rótulos que se añaden a una serie ya
    // pintada (un estado nuevo, uno renombrado). Con un uid que cambia con la
    // lista de nombres, la serie se crea de nuevo en vez de actualizarse. El uid
    // acaba en una clase CSS: va resumido a letras y números.
    const serieNombres = {
        type: 'scatter3d',
        uid: `nombres-${resumen(nombres.join('\u0000'))}`,
        mode: 'text',
        ...columnas(dibujables),
        text: nombres,
        textposition: 'top right',
        textfont: { color: COLOR_ESTADOS, size: 14 },
        hoverinfo: 'skip'
    };

    const idiomaActual = idioma.get();
    const datos = [...fondo, ...seriesProcesos, serieEstados, serieNombres];
    const layout = {
        // Mientras no cambie el fluido, Plotly conserva la cámara entre redibujos
        uirevision: fluido,
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        separators: idiomaActual === "es" ? ",." : ".,",
        scene: {
            // Sin líneas de proyección a las paredes al pasar el ratón
            xaxis: { title: { text: "v [m³/kg]" }, type: 'log', exponentformat: 'power', showspikes: false },
            yaxis: { title: { text: "T [ºC]" }, showspikes: false },
            zaxis: { title: { text: "p [kPa]" }, type: 'log', exponentformat: 'power', showspikes: false },
            aspectmode: 'cube',
            camera: CAMARA_INICIAL
        }
    };

    useEffect(() => {
        const lienzo = referenciaLienzo.current;
        if (!plotly || !lienzo) return;
        plotly.react(lienzo, datos, layout, { responsive: true, displaylogo: false });
    });

    // Clic sobre una curva → selecciona su proceso; sobre la superficie, nada.
    // Plotly solo avisa de clics sobre algo dibujado, nunca al girar.
    useEffect(() => {
        const lienzo = referenciaLienzo.current;
        if (!plotly || !lienzo) return;
        const alHacerClic = (evento) => {
            const idPulsado = evento.points?.[0]?.data?.meta?.idProceso ?? null;
            procesosSeleccionados.set(idPulsado === null ? [] : [idPulsado]);
            idProcesoActual.set(null);
        };
        lienzo.on('plotly_click', alHacerClic);
        return () => { lienzo.removeAllListeners?.('plotly_click'); };
    }, [plotly, procesosSeleccionados, idProcesoActual]);

    useEffect(() => {
        const lienzo = referenciaLienzo.current;
        return () => { if (plotly && lienzo) plotly.purge(lienzo); };
    }, [plotly]);

    const reencuadrar = () => {
        if (plotly && referenciaLienzo.current) {
            plotly.relayout(referenciaLienzo.current, { 'scene.camera': CAMARA_INICIAL });
        }
    };

    return (<div className="panel">
        <h3>{titulo}</h3>

        <Form name="selector_diagrama" layout="vertical" style={{ marginBottom: 8 }}>
            <Row gutter={16}>
                {selectores}
                <Col xs={24} sm={4} md={4}>
                    <Form.Item label={" "} style={{ marginBottom: 8 }}>
                        <Tooltip title={getTextoUI("tooltip_reencuadrar")} mouseEnterDelay={1}>
                            <Button icon={<ExpandOutlined />} onClick={reencuadrar} block>
                                {getTextoUI("bot_reencuadrar")}
                            </Button>
                        </Tooltip>
                    </Form.Item>
                </Col>
            </Row>
        </Form>

        {pie}
        <p className='comentario' style={{ marginTop: 0 }}>{getTextoUI("ayuda_3d")}</p>

        <Spin spinning={plotly === null}>
            <div className="lienzo-diagrama" ref={referenciaLienzo} />
        </Spin>
    </div>);
};

export default Diagrama3D;
