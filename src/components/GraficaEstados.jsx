// react/prop-types va desactivada aquí por lo mismo que está en rojo en el resto
// del proyecto: no se usa PropTypes en ninguna parte y prop-types no es una
// dependencia declarada. Adoptarlo es la tarea aparte que recoge la deuda §5.4;
// declararlo solo en este fichero sería una excepción sin sentido.
/* eslint-disable react/prop-types */
import { useHookstate } from '@hookstate/core';
import { Row, Col, Form, Button, Tooltip } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';
// Importado por su efecto: registra todos los controladores de Chart.js.
import 'chart.js/auto';
import { Scatter } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import { useMemo, useRef } from 'react';
import { configuracion, getTextoUI } from '../configuracion';
import { listaProcesos, idsProcesosDeEstados } from '../procesos/listaProcesos';
import { evaluarProceso, trazarProceso, dominioDeProceso } from '../procesos/proceso';
import formatear from '../util/formatear';

// Andamiaje común a los dos diagramas: el de fluidos (p-h, T-s, p-T) y el
// psicrométrico. Lo que cambia entre ellos es solo la proyección a los ejes y las
// curvas de fondo; todo lo demás —rótulos, tooltip, zoom, arrastre, clic sobre
// una curva, resaltado cruzado, memorización— es idéntico, y estaba escrito dos
// veces. Ver DOCUMENTACION.md §3.6.
//
// La regla que se sigue aquí: si algo se necesita en los dos lados, se extrae
// antes de escribirlo por segunda vez.

// Radio en píxeles dentro del cual un clic se considera hecho sobre una curva.
// Sin él, "el elemento más cercano" acaba seleccionando algo desde cualquier
// punto del lienzo.
const RADIO_CLIC = 30;

// Movimiento del puntero, en píxeles, a partir del cual lo ocurrido se considera
// un arrastre del diagrama y no un clic sobre una curva.
const UMBRAL_ARRASTRE = 5;

// Los diagramas no tienen panel de configuración: lo que antes eran opciones
// (color, línea, nombres, ejes) son ahora decisiones fijas.
const COLOR_ESTADOS = "#0000FF";
const FONDO_ESTADOS = "#FFFFFF";
const RADIO_ESTADO = 6;
const RADIO_ESTADO_SELECCIONADO = 10;

// Rotula cada punto con su nombre. Va como plugin y no como opción de Chart.js
// porque hay que pintar sobre el lienzo después de cada dataset.
const mostrarNombres = {
    id: 'mostrarNombres',
    afterDatasetDraw: (chart, args, options) => {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach((datapoint, index) => {
                if (options.showLabels && dataset.data[index] && dataset.data[index].nombre) {
                    const pos = datapoint.getProps(['x', 'y'], true);
                    ctx.save();
                    ctx.fillStyle = dataset.borderColor || 'black';
                    ctx.font = options.font || '12px Arial';
                    ctx.textAlign = options.align || 'center';
                    ctx.textBaseline = options.baseline || 'bottom';
                    ctx.fillText(dataset.data[index].nombre, pos.x + 5, pos.y - 15);
                    ctx.restore();
                }
            });
        });
    }
};

/**
 * @param dominio        'fluido' | 'aire'; de él salen los procesos que se dibujan
 * @param estados        todos los estados del dominio (hacen falta para evaluar)
 * @param seleccionados  hookstate con los ids seleccionados en la tabla de estados
 * @param visible        (estado) => bool, si ese estado cae en ESTE diagrama
 *                       (el fluido elegido, o la presión total elegida)
 * @param proyectar      (estado) => { x, y }, la proyección a los ejes
 * @param firmaVista     texto que cambia cuando cambia la vista (tipo, sustancia):
 *                       es lo que invalida las curvas memorizadas
 * @param curvasFondo    datasets de fondo, ya memorizados por quien llama
 * @param selectores     <Col> propios del diagrama; el reencuadre lo añade este
 * @param pie            líneas informativas bajo los selectores
 */
const GraficaEstados = ({
    dominio, estados, seleccionados, visible, proyectar,
    etiquetaX, etiquetaY, escalaY = 'linear',
    firmaVista, curvasFondo, titulo, selectores, pie
}) => {
    const { procesosSeleccionados, idProcesoActual } = useHookstate(configuracion);
    const procesos = useHookstate(listaProcesos);

    const procesosActuales = procesos.get({ noproxy: true })
        .filter((proceso) => dominioDeProceso(proceso) === dominio);

    const referenciaGrafico = useRef(null);
    const reencuadrar = () => { referenciaGrafico.current?.resetZoom(); };

    // Los estados de este diagrama que no estén ocultos con el ojo de la tabla.
    // Los seleccionados se dibujan más grandes: es el mismo resaltado cruzado que
    // ya hacen las tablas entre sí.
    const getSerieEstados = () => {
        const marcados = new Set(seleccionados.get());
        const dibujables = estados.filter(
            (estado) => visible(estado) && estado.enDiagrama !== false
        );
        return {
            data: dibujables.map((estado) => ({ ...proyectar(estado), nombre: estado.nombre })),
            // Círculo hueco: el punto se ve sobre una curva de proceso sin taparla,
            // y sobre la campana sigue leyéndose de qué lado cae.
            borderColor: COLOR_ESTADOS,
            backgroundColor: FONDO_ESTADOS,
            pointBorderWidth: 2,
            showLine: false,
            pointRadius: dibujables.map(
                (estado) => marcados.has(estado.id) ? RADIO_ESTADO_SELECCIONADO : RADIO_ESTADO
            )
        };
    };

    // Firmas de lo que cambia una curva de proceso: los procesos en sí y las
    // propiedades de los estados que enlazan. Sin esto, cada render rehace 25
    // llamadas a CoolProp por proceso.
    const firmaProcesos = JSON.stringify(procesosActuales);
    const firmaEstados = JSON.stringify(estados.map((estado) => [estado.id, proyectar(estado)]));

    const curvasProcesos = useMemo(() => {
        return procesosActuales.flatMap((proceso) => {
            if (proceso.enDiagrama === false) return [];
            const evaluacion = evaluarProceso(proceso, estados);
            // Un proceso de otra sustancia (u otra presión) no pinta nada aquí
            if (!evaluacion.valido || !visible(evaluacion.destino)) return [];

            const puntos = trazarProceso(proceso, evaluacion).map(proyectar);
            if (puntos.length < 2) return [];

            return [{
                data: puntos,
                borderColor: proceso.estilo.color,
                borderWidth: proceso.estilo.grosor,
                borderDash: proceso.estilo.trazo === "dashed" ? [8, 4] : [],
                showLine: true,
                pointRadius: 0,
                // El id viaja dentro del dataset: es lo que permite volver de un
                // clic en la curva a la fila de la tabla.
                idProceso: proceso.id
            }];
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firmaProcesos, firmaEstados, firmaVista]);

    // Un proceso se resalta si está seleccionado en su tabla o si incide en alguno
    // de los estados seleccionados. El resaltado va fuera del useMemo: cambia con
    // cada clic y no debe invalidar las curvas, que sí cuestan CoolProp.
    const idsResaltados = new Set([
        ...procesosSeleccionados.get(),
        ...idsProcesosDeEstados([...seleccionados.get()])
    ]);

    // Arrastrar mueve el diagrama, y al soltar el navegador dispara además un
    // clic: sin esto, cada desplazamiento cambiaría la selección de procesos.
    const inicioPulsacion = useRef(null);

    const alPulsar = (evento) => {
        inicioPulsacion.current = { x: evento.nativeEvent.offsetX, y: evento.nativeEvent.offsetY };
    };

    const huboArrastre = (evento) => {
        const inicio = inicioPulsacion.current;
        if (inicio === null) return false;
        return Math.hypot(
            evento.nativeEvent.offsetX - inicio.x, evento.nativeEvent.offsetY - inicio.y
        ) > UMBRAL_ARRASTRE;
    };

    // Clic sobre una curva → selecciona su fila. El id del proceso viaja dentro
    // del dataset, así que no hace falta reconstruir a qué corresponde cada uno.
    const alHacerClic = (evento) => {
        const grafico = referenciaGrafico.current;
        if (!grafico || huboArrastre(evento)) return;

        const elementos = grafico.getElementsAtEventForMode(
            evento.nativeEvent, 'nearest', { intersect: false }, true
        );
        let idPulsado = null;
        if (elementos.length > 0) {
            const { datasetIndex, index } = elementos[0];
            const punto = grafico.getDatasetMeta(datasetIndex).data[index];
            const distancia = Math.hypot(
                punto.x - evento.nativeEvent.offsetX, punto.y - evento.nativeEvent.offsetY
            );
            const idProceso = grafico.data.datasets[datasetIndex].idProceso;
            if (idProceso !== undefined && distancia <= RADIO_CLIC) {
                idPulsado = idProceso;
            }
        }

        procesosSeleccionados.set(idPulsado === null ? [] : [idPulsado]);
        idProcesoActual.set(null);
    };

    const todasLasSeries = () => {
        const seriesProcesos = curvasProcesos.map((curva) => (
            idsResaltados.has(curva.idProceso)
                ? { ...curva, borderWidth: curva.borderWidth + 3 }
                : curva
        ));
        return [...curvasFondo, ...seriesProcesos, getSerieEstados()];
    };

    // Las opciones van memorizadas y no es un detalle de rendimiento: react-chartjs-2
    // vuelca este objeto sobre el del gráfico cada vez que cambia de identidad, y
    // el zoom vive precisamente en los mínimos y máximos de las escalas. Sin
    // memorizar, cualquier render (seleccionar una fila, editar un estado) devolvería
    // el diagrama a su encuadre inicial. Que cambiar de vista sí lo reencuadre es
    // lo deseable: el encuadre anterior no significa nada en otros ejes.
    const opcionesGrafico = useMemo(() => ({
        locale: "es",
        maintainAspectRatio: false,
        scales: {
            x: {
                title: { display: true, text: etiquetaX, font: { size: 14 } },
                ticks: { font: { size: 14 } }
            },
            y: {
                type: escalaY,
                title: { display: true, text: etiquetaY, font: { size: 14 } },
                ticks: { font: { size: 14 } }
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (ctx) => ctx[0].raw.nombre,
                    label: (ctx) => `${etiquetaX}: ${formatear(ctx.parsed.x, 3)}, `
                        + `${etiquetaY}: ${formatear(ctx.parsed.y, 3)}`
                }
            },
            mostrarNombres: { showLabels: true, align: 'left', baseline: 'middle' },
            // Rueda y pellizco acercan; arrastrar mueve. El encuadre por rectángulo
            // se reserva a Mayús+arrastrar porque solo cabe un gesto de arrastre, y
            // mover es el que se busca sin pensar.
            zoom: {
                zoom: {
                    wheel: { enabled: true, speed: 0.1 },
                    pinch: { enabled: true },
                    drag: {
                        enabled: true,
                        modifierKey: 'shift',
                        backgroundColor: 'rgba(24, 144, 255, 0.15)',
                        borderColor: '#1890FF',
                        borderWidth: 1
                    },
                    mode: 'xy'
                },
                pan: { enabled: true, mode: 'xy' }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [firmaVista]);

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
        <p className='comentario' style={{ marginTop: 0 }}>{getTextoUI("ayuda_zoom")}</p>

        <div className="lienzo-diagrama">
            <Scatter
                ref={referenciaGrafico}
                onClick={alHacerClic}
                onPointerDown={alPulsar}
                onDoubleClick={reencuadrar}
                options={opcionesGrafico}
                data={{ datasets: todasLasSeries() }}
                plugins={[mostrarNombres, zoomPlugin]}
            />
        </div>
    </div>);
};

export default GraficaEstados;
