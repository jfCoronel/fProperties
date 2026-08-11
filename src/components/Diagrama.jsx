import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, Form, Button, Tooltip } from 'antd'
import { ExpandOutlined } from '@ant-design/icons';
import { configuracion, getTextoUI } from '../configuracion';
import { Chart as ChartJS } from 'chart.js/auto';
import { Scatter } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import formatear from '../util/formatear';
import { listaFluidos } from '../listaFluidos';
import { listaProcesos, idsProcesosDeEstados } from '../procesos/listaProcesos';
import { evaluarProceso, trazarProceso } from '../procesos/proceso';
import { getListaFluidos, getPropFluido } from '../propFluidos/fluidos';
import { useCallback, useMemo, useRef } from 'react';

// Radio en píxeles dentro del cual un clic se considera hecho sobre una curva.
// Sin él, "el elemento más cercano" acaba seleccionando algo desde cualquier
// punto del lienzo.
const RADIO_CLIC = 30;

// Movimiento del puntero, en píxeles, a partir del cual lo ocurrido se considera
// un arrastre del diagrama y no un clic sobre una curva.
const UMBRAL_ARRASTRE = 5;

// El diagrama ya no tiene panel de configuración: lo que antes eran opciones
// (color, línea, nombres, ejes) son ahora decisiones fijas, y lo único que el
// usuario elige es qué diagrama y de qué fluido (DOCUMENTACION.md §3.4).
const COLOR_ESTADOS = "#0000FF";
const FONDO_ESTADOS = "#FFFFFF";
const RADIO_ESTADO = 6;
const RADIO_ESTADO_SELECCIONADO = 10;

const { Option } = Select;

// Proyección de un estado a los ejes del diagrama. Un mismo estado cae en un
// punto distinto según el tipo, y por aquí pasan tanto los puntos de la tabla
// como las curvas de los procesos: por eso un solo trazado sirve para los tres
// diagramas (DOCUMENTACION.md §3.4).
const proyectar = (estado, tipo, conNombre = true) => {
    let punto;
    if (tipo === "p-T") {
        punto = { x: estado.T, y: estado.P };
    } else if (tipo === "p-h") {
        punto = { x: estado.H, y: estado.P };
    } else {
        punto = { x: estado.S, y: estado.T };
    }
    return conNombre ? { ...punto, nombre: estado.nombre } : punto;
};

const Diagrama = () => {
    const lista = useHookstate(listaFluidos);
    const { tipoDiagrama, fluidoDiagrama,
        fluidosSeleccionados, procesosSeleccionados, idProcesoActual } = useHookstate(configuracion);

    const procesos = useHookstate(listaProcesos);

    const fluidoActual = fluidoDiagrama.get();
    const tipoActual = tipoDiagrama.get();

    const estadosActuales = lista.get({ noproxy: true });
    const procesosActuales = procesos.get({ noproxy: true });

    // Tooltip
    const titleTooltip = (ctx) => {
        return ctx[0].raw.nombre;
    }

    const mostrarNombres = {
        id: 'mostrarNombres',
        afterDatasetDraw: (chart, args, options) => {
            const { ctx } = chart;
            const datasets = chart.data.datasets;

            datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (!meta.hidden) {
                    meta.data.forEach((datapoint, index) => {
                        // Solo mostrar si hay nombre
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
                }
            });
        }
    };


    const getLabelX = () => {
        if (tipoActual === "p-T") {
            return "T [ºC]";
        } else if (tipoActual === "p-h") {
            return "h [kJ/kg]";
        } else if (tipoActual === "T-s") {
            return "s [kJ/kg·K]";
        }
        return "";
    }

    const getLabelY = () => {
        if (tipoActual === "p-T" || tipoActual === "p-h") {
            return "p [kPa]";
        } else if (tipoActual === "T-s") {
            return "T [ºC]";
        }
        return "";
    }

    const getEscalaY = () => tipoActual === "p-h" ? "logarithmic" : "linear";

    // La campana (o la línea de saturación en p-T) se recorre siempre entre el
    // punto triple y el crítico: es el rango donde existe equilibrio líquido-vapor
    // y evita depender de unos límites de eje que el usuario ya no fija.
    const getCurvaSat = useCallback((grosor = 1) => {
        let datos = [];
        const fluido = fluidoActual;
        if (tipoActual === "p-T") {
            const tTriple = getPropFluido(fluido, "TTRIPLE", "T", 0, "X", 50);
            const tCritica = getPropFluido(fluido, "TCRIT", "T", 0, "X", 50);

            const deltaT = (tCritica - tTriple) / 100
            for (let t = tTriple; t <= tCritica; t += deltaT) {
                let p = getPropFluido(fluido, "P", "T", t, "X", 50);
                datos.push({ x: t, y: p })
            }
        } else if (tipoActual === "p-h") {
            const pTriple = getPropFluido(fluido, "PTRIPLE", "T", 0, "X", 50);
            const pCritica = getPropFluido(fluido, "PCRIT", "T", 0, "X", 50);

            const ratioP = Math.pow(pCritica / pTriple, 1 / 100)
            for (let p = pTriple; p <= pCritica; p *= ratioP) {
                let h = getPropFluido(fluido, "H", "P", p, "X", 0);
                datos.push({ x: h, y: p })
            }
            for (let p = pCritica; p >= pTriple; p /= ratioP) {
                let h = getPropFluido(fluido, "H", "P", p, "X", 100);
                datos.push({ x: h, y: p })
            }
        } else if (tipoActual === "T-s") {
            const tTriple = getPropFluido(fluido, "TTRIPLE", "T", 0, "X", 50);
            const tCritica = getPropFluido(fluido, "TCRIT", "T", 0, "X", 50);

            const deltaT = (tCritica - tTriple) / 100
            for (let t = tTriple; t <= tCritica; t += deltaT) {
                let s = getPropFluido(fluido, "S", "T", t, "X", 0);
                datos.push({ x: s, y: t })
            }
            for (let t = tCritica; t >= tTriple; t -= deltaT) {
                let s = getPropFluido(fluido, "S", "T", t, "X", 100);
                datos.push({ x: s, y: t })
            }
        }
        return {
            data: datos,
            borderColor: "black",
            showLine: true,
            pointRadius: 0,
            borderWidth: grosor
        };
    }, [fluidoActual, tipoActual])

    function getPuntosCaracteristicos() {
        const pTriple = formatear(getPropFluido(fluidoActual, "PTRIPLE", "T", 0, "X", 50), 3);
        const tTriple = formatear(getPropFluido(fluidoActual, "TTRIPLE", "T", 0, "X", 50), 3);
        const pCritica = formatear(getPropFluido(fluidoActual, "PCRIT", "T", 0, "X", 50), 3);
        const tCritica = formatear(getPropFluido(fluidoActual, "TCRIT", "T", 0, "X", 50), 3);
        return `${getTextoUI("lab_punto_triple")}: ${tTriple} ºC, ${pTriple} kPa`
            + ` — ${getTextoUI("lab_punto_critico")}: ${tCritica} ºC, ${pCritica} kPa`;
    }

    // Los estados del fluido elegido que no estén ocultos con el ojo de la tabla.
    // Los seleccionados se dibujan más grandes: es el mismo resaltado cruzado que
    // ya hacen las tablas entre sí.
    const getSerieEstados = () => {
        const seleccionados = new Set(fluidosSeleccionados.get());
        const estados = estadosActuales.filter(
            (estado) => estado.fluido === fluidoActual && estado.enDiagrama !== false
        );
        return {
            data: estados.map((estado) => proyectar(estado, tipoActual)),
            // Círculo hueco: el punto se ve sobre una curva de proceso sin taparla,
            // y sobre la campana sigue leyéndose de qué lado cae.
            borderColor: COLOR_ESTADOS,
            backgroundColor: FONDO_ESTADOS,
            pointBorderWidth: 2,
            showLine: false,
            pointRadius: estados.map(
                (estado) => seleccionados.has(estado.id) ? RADIO_ESTADO_SELECCIONADO : RADIO_ESTADO
            )
        };
    }

    // La curva de saturación son ~200 llamadas a CoolProp: se recalcula solo cuando
    // cambia algo de lo que depende, no en cada render.
    const curvaSaturacion = useMemo(() => getCurvaSat(3), [getCurvaSat]);

    // Firmas de lo que cambia una curva de proceso: los procesos en sí y las
    // propiedades de los estados que enlazan. Sin esto, cada render rehace 25
    // llamadas a CoolProp por proceso.
    const firmaProcesos = JSON.stringify(procesosActuales);
    const firmaEstados = JSON.stringify(
        estadosActuales.map((estado) => [estado.id, estado.fluido, estado.T, estado.P, estado.H, estado.S])
    );

    const curvasProcesos = useMemo(() => {
        return procesosActuales.flatMap((proceso) => {
            if (proceso.enDiagrama === false) return [];
            const evaluacion = evaluarProceso(proceso, estadosActuales);
            // Un proceso de otro fluido no pinta nada en este diagrama
            if (!evaluacion.valido || evaluacion.destino.fluido !== fluidoActual) return [];

            const puntos = trazarProceso(proceso, evaluacion)
                .map((estado) => proyectar(estado, tipoActual, false));
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
    }, [firmaProcesos, firmaEstados, tipoActual, fluidoActual]);

    // Un proceso se resalta si está seleccionado en su tabla o si incide en alguno
    // de los estados seleccionados. El resaltado va fuera del useMemo: cambia con
    // cada clic y no debe invalidar las curvas, que sí cuestan CoolProp.
    const idsResaltados = new Set([
        ...procesosSeleccionados.get(),
        ...idsProcesosDeEstados([...fluidosSeleccionados.get()])
    ]);

    const referenciaGrafico = useRef(null);

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

    const reencuadrar = () => { referenciaGrafico.current?.resetZoom(); };

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

    function getTodasSeries() {
        const seriesProcesos = curvasProcesos.map((curva) => (
            idsResaltados.has(curva.idProceso)
                ? { ...curva, borderWidth: curva.borderWidth + 3 }
                : curva
        ));
        return [curvaSaturacion, ...seriesProcesos, getSerieEstados()];
    }

    // Al encender el diagrama conviene que apunte a lo que hay en la tabla: si el
    // fluido elegido no tiene ningún estado, se adopta el del primero.
    const alCambiarTipo = (valor) => {
        tipoDiagrama.set(valor);
        if (valor === "ninguno") return;
        const hayEstadosDelFluido = estadosActuales.some((estado) => estado.fluido === fluidoActual);
        if (!hayEstadosDelFluido && estadosActuales.length > 0) {
            fluidoDiagrama.set(estadosActuales[0].fluido);
        }
    };

    // Las opciones van memorizadas y no es un detalle de rendimiento: react-chartjs-2
    // vuelca este objeto sobre el del gráfico cada vez que cambia de identidad, y
    // el zoom vive precisamente en los mínimos y máximos de las escalas. Sin
    // memorizar, cualquier render (seleccionar una fila, editar un estado) devolvería
    // el diagrama a su encuadre inicial. Que el tipo o el fluido sí lo reencuadren es
    // lo deseable: el encuadre anterior no significa nada en otros ejes.
    const opcionesGrafico = useMemo(() => ({
        locale: "es",
        maintainAspectRatio: false,
        scales: {
            x: {
                title: { display: true, text: getLabelX(), font: { size: 14 } },
                ticks: { font: { size: 14 } }
            },
            y: {
                type: getEscalaY(),
                title: { display: true, text: getLabelY(), font: { size: 14 } },
                ticks: { font: { size: 14 } }
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: titleTooltip,
                    label: ctx => getLabelX() + ": " + formatear(ctx.parsed.x, 3) + ", " + getLabelY() + ": " + formatear(ctx.parsed.y, 3)
                }
            },
            mostrarNombres: {
                showLabels: true,
                align: 'left',
                baseline: 'middle'
            },
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
    }), [tipoActual, fluidoActual]);

    const selectores = (
        <Form name="selector_diagrama" layout="vertical" style={{ marginBottom: 8 }}>
            <Row gutter={16}>
                <Col xs={24} sm={10} md={8}>
                    <Form.Item label={getTextoUI("lab_tipo_diagrama")} style={{ marginBottom: 8 }}>
                        <Select value={tipoActual} onChange={alCambiarTipo}>
                            <Option value="ninguno">{getTextoUI("tipo_ninguno")}</Option>
                            <Option value="p-T">{getTextoUI("tipo_p-T")}</Option>
                            <Option value="p-h">{getTextoUI("tipo_p-h")}</Option>
                            <Option value="T-s">{getTextoUI("tipo_T-s")}</Option>
                        </Select>
                    </Form.Item>
                </Col>
                {tipoActual !== "ninguno" && <Col xs={24} sm={10} md={8}>
                    <Form.Item label={getTextoUI("lab_fluido_diagrama")} style={{ marginBottom: 8 }}>
                        <Select
                            showSearch
                            value={fluidoActual}
                            onChange={(valor) => { fluidoDiagrama.set(valor); }}
                        >
                            {getListaFluidos().map((fluido) => (
                                <Option key={fluido} value={fluido}>{fluido}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>}
                {tipoActual !== "ninguno" && <Col xs={24} sm={4} md={4}>
                    <Form.Item label={" "} style={{ marginBottom: 8 }}>
                        <Tooltip title={getTextoUI("tooltip_reencuadrar")} mouseEnterDelay={1}>
                            <Button icon={<ExpandOutlined />} onClick={reencuadrar} block>
                                {getTextoUI("bot_reencuadrar")}
                            </Button>
                        </Tooltip>
                    </Form.Item>
                </Col>}
            </Row>
        </Form>
    );

    if (tipoActual === "ninguno") {
        return (<div className="panel">{selectores}</div>);
    }

    return (<div className="panel">
        <h3>{getTextoUI("titulo_diagrama")}</h3>

        {selectores}

        <p className='comentario' style={{ marginTop: 0, marginBottom: 4 }}>{getPuntosCaracteristicos()}</p>
        <p className='comentario' style={{ marginTop: 0 }}>{getTextoUI("ayuda_zoom")}</p>

        <div className="lienzo-diagrama">
            <Scatter
                ref={referenciaGrafico}
                onClick={alHacerClic}
                onPointerDown={alPulsar}
                onDoubleClick={reencuadrar}
                options={opcionesGrafico}
                data={{
                    datasets: getTodasSeries()
                }}
                plugins={[mostrarNombres, zoomPlugin]}
            />
        </div>

    </div >);

}

export default Diagrama;
