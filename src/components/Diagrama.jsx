import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, InputNumber, Form, Button, Drawer, ColorPicker, Checkbox } from 'antd'
import { SettingOutlined } from '@ant-design/icons';
import { configuracion, getTextoUI } from '../configuracion';
import { Chart as ChartJS } from 'chart.js/auto';
import { Scatter } from 'react-chartjs-2';
import formatear from '../util/formatear';
import { listaFluidos } from '../listaFluidos';
import { listaProcesos, idsProcesosDeEstados } from '../procesos/listaProcesos';
import { evaluarProceso, trazarProceso } from '../procesos/proceso';
import { getListaFluidos, getPropFluido } from '../propFluidos/fluidos';
import { useCallback, useMemo, useRef, useState } from 'react';

// Radio en píxeles dentro del cual un clic se considera hecho sobre una curva.
// Sin él, "el elemento más cercano" acaba seleccionando algo desde cualquier
// punto del lienzo.
const RADIO_CLIC = 30;

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
    let series = useHookstate([]);
    const { tipoDiagrama, fluidoDiagrama,
        ejeXmaxDiagrama, ejeXminDiagrama,
        ejeYmaxDiagrama, ejeYminDiagrama, opcionAddDatosDiagrama,
        colorDatos, lineaDatos, nombreDatos, fluidosSeleccionados,
        procesosSeleccionados, idProcesoActual } = useHookstate(configuracion);

    const procesos = useHookstate(listaProcesos);

    const [drawerVisible, setDrawerVisible] = useState(false);

    // Valores de los que depende la curva de saturación, extraídos para poder
    // memorizarla (ver getCurvaSat / curvaSaturacion más abajo).
    const fluidoActual = fluidoDiagrama.get();
    const tipoActual = tipoDiagrama.get();
    const xMin = ejeXminDiagrama.get();
    const xMax = ejeXmaxDiagrama.get();

    const estadosActuales = lista.get({ noproxy: true });
    const procesosActuales = procesos.get({ noproxy: true });

    // Tooltip
    const titleTooltip = (ctx) => {
        return ctx[0].raw.nombre;
    }

    const mostrarNombres = {
        id: 'mostrarNombres',
        afterDatasetDraw: (chart, args, options) => {
            const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
            const datasets = chart.data.datasets;

            datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (!meta.hidden) {
                    meta.data.forEach((datapoint, index) => {
                        // Solo mostrar si hay nombre
                        if (options.showLabels && dataset.data[index] && dataset.data[index].nombre) {
                            const pos = datapoint.getProps(['x', 'y'], true); // <-- Cambia aquí
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
        if (tipoDiagrama.get() === "p-T") {
            return "T [ºC]";
        } else if (tipoDiagrama.get() === "p-h") {
            return "h [kJ/kg]";
        } else if (tipoDiagrama.get() === "T-s") {
            return "s [kJ/kg·K]";
        }
    }

    const getLabelY = () => {
        if (tipoDiagrama.get() === "p-T") {
            return "p [kPa]";
        } else if (tipoDiagrama.get() === "p-h") {
            return "p [kPa]";
        } else if (tipoDiagrama.get() === "T-s") {
            return "T [ºC]";
        }
    }
    const getEscalaY = () => {
        if (tipoDiagrama.get() === "p-h") {
            return "logarithmic";
        } else {
            return "linear";
        }
    }


    function ajustarEjesDiagrama() {
        const puntos = getSerie().data;
        if (puntos.length > 0) {
            let Xmin = Infinity;
            let Xmax = -Infinity;
            let Ymin = Infinity;
            let Ymax = -Infinity;
            for (let punto of puntos) {
                if (punto.x < Xmin) {
                    Xmin = punto.x;
                }
                if (punto.x > Xmax) {
                    Xmax = punto.x;
                }
                if (punto.y < Ymin) {
                    Ymin = punto.y;
                }
                if (punto.y > Ymax) {
                    Ymax = punto.y;
                }
            }
            ejeXminDiagrama.set(potenciaDe10Inferior(Xmin));
            ejeXmaxDiagrama.set(potenciaDe10Superior(Xmax));
            ejeYminDiagrama.set(potenciaDe10Inferior(Ymin));
            ejeYmaxDiagrama.set(potenciaDe10Superior(Ymax));
        }
    }

    function potenciaDe10Inferior(numero) {
        const log10 = Math.log10(numero);
        const redondeado = Math.round(log10);
        const orden = Math.pow(10, redondeado);
        const valor = Math.floor(numero / orden) * orden;
        return valor;
    }

    function potenciaDe10Superior(numero) {
        const log10 = Math.log10(numero);
        const redondeado = Math.round(log10);
        const orden = Math.pow(10, redondeado);
        const valor = Math.ceil(numero / orden) * orden;
        return valor;
    }

    const getCurvaSat = useCallback((grosor = 1) => {
        let datos = [];
        const fluido = fluidoActual
        if (tipoActual === "p-T") {
            const deltaT = (xMax - xMin) / 100
            for (let t = xMin; t <= xMax; t += deltaT) {
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
    }, [fluidoActual, tipoActual, xMin, xMax])

    function getPuntoTripleInfo() {
        const fluido = fluidoDiagrama.get();
        const pTriple = formatear(getPropFluido(fluido, "PTRIPLE", "T", 0, "X", 50), 3);
        const tTriple = formatear(getPropFluido(fluido, "TTRIPLE", "T", 0, "X", 50), 3);
        return `${getTextoUI("lab_punto_triple")}: ${tTriple} ºC, ${pTriple} kPa`;
    }

    function getPuntoCriticoInfo() {
        const fluido = fluidoDiagrama.get();
        const pCritica = formatear(getPropFluido(fluido, "PCRIT", "T", 0, "X", 50), 3);
        const tCritica = formatear(getPropFluido(fluido, "TCRIT", "T", 0, "X", 50), 3);
        return `${getTextoUI("lab_punto_critico")}: ${tCritica} ºC, ${pCritica} kPa`;
    }


    const getDato = (estado) => proyectar(estado, tipoActual);

    const getSerie = (incluirDatos = "todos") => {
        let datos = [];
        if (incluirDatos === "todos") {
            estadosActuales.forEach(estado => {
                if (estado.fluido === fluidoActual) {
                    datos.push(getDato(estado));
                }
            })
        } else if (incluirDatos === "seleccionados") {
            const ids = [...fluidosSeleccionados.get()]
            ids.forEach(id => {
                const estado = estadosActuales.find(e => e.id === id);
                if (estado && estado.fluido === fluidoActual) {
                    datos.push(getDato(estado));
                }
            })
        }
        return {
            data: datos,
            borderColor: colorDatos.get(),
            showLine: lineaDatos.get(),
            pointRadius: 6
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

    // Clic sobre una curva → selecciona su fila. El id del proceso viaja dentro
    // del dataset, así que no hace falta reconstruir a qué corresponde cada uno.
    const alHacerClic = (evento) => {
        const grafico = referenciaGrafico.current;
        if (!grafico) return;

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
        let todasSeries = [curvaSaturacion, ...seriesProcesos]
        if (opcionAddDatosDiagrama.get() === "todos") {
            todasSeries.push(getSerie("todos"));
        } else if (opcionAddDatosDiagrama.get() === "seleccionados") {
            series.get({ noproxy: true }).forEach(serie => {
                todasSeries.push(serie);
            });
            todasSeries.push(getSerie("seleccionados"));
        }
        return todasSeries;
    }

    return (<div className="grafica">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{getTextoUI("titulo_diagrama")}</h3>
            <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => setDrawerVisible(true)}
            >
                {getTextoUI("configuracion_diagrama")}
            </Button>
        </div>

        <Scatter
            ref={referenciaGrafico}
            onClick={alHacerClic}
            options={{
                locale: "es",
                scales: {
                    x: {
                        min: ejeXminDiagrama.get(),
                        max: ejeXmaxDiagrama.get(),
                        title: {
                            display: true,
                            text: getLabelX(),
                            font: { size: 14 }
                        },
                        ticks: {
                            font: { size: 14 }
                        }
                    },
                    y: {
                        type: getEscalaY(),
                        min: ejeYminDiagrama.get(),
                        max: ejeYmaxDiagrama.get(),
                        title: {
                            display: true,
                            text: getLabelY(),
                            font: { size: 14 }
                        },
                        ticks: {
                            font: { size: 14 }
                        }
                    },
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: titleTooltip,
                            label: ctx => getLabelX() + ": " + formatear(ctx.parsed.x, 3) + ", " + getLabelY() + ": " + formatear(ctx.parsed.y, 3)
                        }
                    },
                    mostrarNombres: {
                        showLabels: nombreDatos.get(),
                        align: 'left',
                        baseline: 'middle'
                    }
                }
            }}
            data={{
                datasets: getTodasSeries()
            }}
            plugins={[mostrarNombres]}
        />

        <Drawer
            title={getTextoUI("configuracion_diagrama")}
            placement="right"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            width={360}
        >
            <Form name="selector_diagrama" layout="vertical">
                <Row gutter={8}>
                    <Col span={24}>
                        <Form.Item
                            label={getTextoUI("lab_tipo_diagrama")}
                        >
                            <Select
                                showSearch
                                value={tipoDiagrama.get()}
                                onChange={(value) => {
                                    tipoDiagrama.set(value);
                                }}
                            >
                                <Option value="p-T">{getTextoUI("tipo_p-T")}</Option>
                                <Option value="p-h">{getTextoUI("tipo_p-h")}</Option>
                                <Option value="T-s">{getTextoUI("tipo_T-s")}</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={24}>
                        <Form.Item
                            label={getTextoUI("lab_fluido_diagrama")}
                        >
                            <Select
                                showSearch
                                value={fluidoDiagrama.get()}
                                onChange={(value) => {
                                    fluidoDiagrama.set(value);
                                }}
                            >
                                {getListaFluidos().map((fluido) => (<Option key={fluido} value={fluido}>{fluido}</Option>))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={24}>
                        <span className='comentario'>{getPuntoTripleInfo()}</span>
                    </Col>
                </Row>
                <Row gutter={8}>
                    <Col span={24}>
                        <span className='comentario'>{getPuntoCriticoInfo()}</span>
                    </Col>
                </Row>

                <Row gutter={8} style={{ marginTop: 16 }}>
                    <Col span={24}>
                        <Form.Item label={getTextoUI("lab_add_puntos")}>
                            <Select
                                showSearch
                                value={opcionAddDatosDiagrama.get()}
                                onChange={(value) => {
                                    opcionAddDatosDiagrama.set(value);
                                }}
                            >
                                <Option value="todos">{getTextoUI("opcion_add_datos_todos")}</Option>
                                <Option value="seleccionados">{getTextoUI("opcion_add_datos_seleccionados")}</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={8}>
                        <Form.Item label={getTextoUI("lab_color_datos")}>
                            <ColorPicker
                                value={colorDatos.get()}
                                onChange={(_, hex) => {
                                    colorDatos.set(hex);
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={getTextoUI("lab_mostrar_nombre")}>
                            <Checkbox
                                checked={nombreDatos.get()}
                                onChange={(e) => {
                                    nombreDatos.set(e.target.checked);
                                }}> </Checkbox>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={getTextoUI("lab_add_linea")}>
                            <Checkbox
                                checked={lineaDatos.get()}
                                onChange={(e) => {
                                    lineaDatos.set(e.target.checked);
                                }}> </Checkbox>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={12}>
                        <Button
                            type="primary"
                            disabled={opcionAddDatosDiagrama.get() === "todos"}
                            onClick={() => {
                                series.merge([getSerie(opcionAddDatosDiagrama.get())])
                                fluidosSeleccionados.set([]);
                            }}
                            block
                        >{getTextoUI("bot_guardar_serie")}</Button>
                    </Col>
                    <Col span={12}>
                        <Button
                            type="primary"
                            disabled={opcionAddDatosDiagrama.get() === "todos"}
                            onClick={() => {
                                series.set([]);
                            }}
                            block
                        >{getTextoUI("bot_borrar_series")}</Button>
                    </Col>
                </Row>

                <Row gutter={8} style={{ marginTop: 24 }}>
                    <Col span={24}>
                        <h4>{getTextoUI("ejes_max_min")}</h4>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={12}>
                        <Form.Item
                            label={getLabelX() + " (min)"}
                        >
                            <InputNumber
                                style={{ width: "100%" }}
                                value={ejeXminDiagrama.get()}
                                onChange={(value) => {
                                    ejeXminDiagrama.set(value);
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label={getLabelX() + " (max)"}
                        >
                            <InputNumber
                                style={{ width: "100%" }}
                                value={ejeXmaxDiagrama.get()}
                                onChange={(value) => {
                                    ejeXmaxDiagrama.set(value);
                                }}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={12}>
                        <Form.Item
                            label={getLabelY() + " (min)"}
                        >
                            <InputNumber
                                style={{ width: "100%" }}
                                value={ejeYminDiagrama.get()}
                                onChange={(value) => {
                                    ejeYminDiagrama.set(value);
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label={getLabelY() + " (max)"}
                        >
                            <InputNumber
                                style={{ width: "100%" }}
                                value={ejeYmaxDiagrama.get()}
                                onChange={(value) => {
                                    ejeYmaxDiagrama.set(value);
                                }}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={8}>
                    <Col span={24}>
                        <Button
                            type="primary"
                            onClick={() => { ajustarEjesDiagrama() }}
                            block
                        >{getTextoUI("bot_actualizar_ejes")}</Button>
                    </Col>
                </Row>
            </Form>
        </Drawer>

    </div >);

}

export default Diagrama;