import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, InputNumber, Form, Collapse, ColorPicker, Checkbox, Button } from 'antd'
import { configuracion, getTextoUI } from '../configuracion';
import { listaAires } from '../listaAires';
import { Chart as ChartJS } from 'chart.js/auto';
import { Scatter } from 'react-chartjs-2';
import { getPropAireHumedo } from '../propFluidos/aires'
import formatear from '../util/formatear';

const { Option } = Select;
const { Panel } = Collapse;

const Psicrometrico = () => {
    const lista = useHookstate(listaAires);
    const { opcionPsicrometrico, valorOpcionPsicrometrico,
        ejeXmaxPsicrometrico, ejeXminPsicrometrico,
        ejeYmaxPsicrometrico, ejeYminPsicrometrico, opcionAddDatosPsicrometrico,
        colorDatos, lineaDatos, airesSeleccionados, nombreDatos } = useHookstate(configuracion);

    let series = useHookstate([]);

    // Tooltip
    const titleTooltip = (ctx) => {
        return ctx[0].raw.nombre;
    }

    // 
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

    const getCurvaHRcte = (hr, grosor = 1) => {
        let datos = [];
        let w = 0
        for (let t = ejeXminPsicrometrico.get(); t <= ejeXmaxPsicrometrico.get(); t++) {
            if (opcionPsicrometrico.get() === "A") {
                w = getPropAireHumedo("W", 'A', valorOpcionPsicrometrico.get(), 'T', t, 'HR', hr)
            } else if (opcionPsicrometrico.get() === "P") {
                w = getPropAireHumedo("W", 'P', valorOpcionPsicrometrico.get(), 'T', t, 'HR', hr)
            }

            datos.push({ x: t, y: w })

        }
        return {
            data: datos,
            borderColor: "black",
            showLine: true,
            pointRadius: 0,
            borderWidth: grosor
        };
    }

    const check_altura = (aire) => {
        if (opcionPsicrometrico.get() === "A") {
            if (Math.abs(aire.A.get() - valorOpcionPsicrometrico.get()) < 1e-3) {
                return true
            } else {
                return false
            }

        } else if (Math.abs(aire.P.get() - valorOpcionPsicrometrico.get()) < 1e-3) {
            if (aire.P.get() === valorOpcionPsicrometrico.get()) {
                return true
            } else {
                return false
            }
        }
    }
    const getSerie = (incluirDatos = "todos") => {
        let datos = [];
        if (incluirDatos === "todos") {
            lista.forEach(aire => {
                if (check_altura(aire)) {
                    let dato = {
                        x: aire.T.get(),
                        y: aire.W.get(),
                        nombre: aire.nombre.get()
                    }
                    datos.push(dato);
                }
            })
        } else if (incluirDatos === "seleccionados") {
            const listaIndices = [...airesSeleccionados.get()]
            listaIndices.forEach(i => {
                const aire = lista[i];
                if (check_altura(aire)) {
                    let dato = {
                        x: aire.T.get(),
                        y: aire.W.get(),
                        nombre: aire.nombre.get()
                    }
                    datos.push(dato);
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

    function getTodasSeries() {
        let todasSeries = [
            getCurvaHRcte(100, 3),
            getCurvaHRcte(75),
            getCurvaHRcte(50),
            getCurvaHRcte(25)
        ]

        if (opcionAddDatosPsicrometrico.get() === "todos") {
            todasSeries.push(getSerie("todos"));
        } else if (opcionAddDatosPsicrometrico.get() === "seleccionados") {
            series.get({ noproxy: true }).forEach(serie => {
                todasSeries.push(serie);
            });
            todasSeries.push(getSerie("seleccionados"));
        }
        return todasSeries;
    }

    return (<div className="grafica">
        <h3>{getTextoUI("titulo_psicrometrico")}</h3>
        <Scatter
            options={{
                locale: "es",
                scales: {
                    x: {
                        min: ejeXminPsicrometrico.get(),
                        max: ejeXmaxPsicrometrico.get(),
                        title: {
                            display: true,
                            text: "T [°C]",
                            font: { size: 14 }
                        },
                        ticks: {
                            font: { size: 14 }
                        }
                    },
                    y: {
                        min: ejeYminPsicrometrico.get(),
                        max: ejeYmaxPsicrometrico.get(),
                        title: {
                            display: true,
                            text: "w [g/kg a.s.]",
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
                            label: ctx => ' T: ' + formatear(ctx.parsed.x, 3) + '°C,  w: ' + formatear(ctx.parsed.y, 3) + ' g/kg'
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

        <Collapse >
            <Panel header={getTextoUI("configuracion_psicrometrico")} key="configuracion_sicrometrico">
                <Form name="selector_presión">
                    <Row gutter={8}>
                        <Col span={9}>
                            <Form.Item
                                label={getTextoUI("lab_opcion_psicrometrico")}
                            >
                                <Select
                                    showSearch
                                    value={opcionPsicrometrico.get()}
                                    onChange={(value) => {
                                        opcionPsicrometrico.set(value);
                                    }}
                                >
                                    <Option value="A">{getTextoUI("tabla_altura")}</Option>
                                    <Option value="P">p [kPa]</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={3}>
                            <InputNumber
                                style={{ width: "100%" }}
                                value={valorOpcionPsicrometrico.get()}
                                onChange={(value) => {
                                    valorOpcionPsicrometrico.set(value);
                                }}
                            />
                        </Col>
                        <Col span={10}>
                            <span className='comentario'>{getTextoUI("coment_psicrometrico")}</span>
                        </Col>
                    </Row>
                    <Row gutter={8}>
                        <Col span={6}>
                            <Form.Item label={getTextoUI("lab_add_puntos")}>
                                <Select
                                    showSearch
                                    value={opcionAddDatosPsicrometrico.get()}
                                    onChange={(value) => {
                                        opcionAddDatosPsicrometrico.set(value);
                                    }}
                                >
                                    <Option value="todos">{getTextoUI("opcion_add_datos_todos")}</Option>
                                    <Option value="seleccionados">{getTextoUI("opcion_add_datos_seleccionados")}</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={2}>
                            <Form.Item label={getTextoUI("lab_color_datos")}>
                                <ColorPicker
                                    value={colorDatos.get()}
                                    onChange={(_, hex) => {
                                        colorDatos.set(hex);
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <Form.Item label={getTextoUI("lab_mostrar_nombre")}>
                                <Checkbox
                                    checked={nombreDatos.get()}
                                    onChange={(e) => {
                                        nombreDatos.set(e.target.checked);
                                    }}> </Checkbox>
                            </Form.Item>
                        </Col>
                        <Col span={3}>
                            <Form.Item label={getTextoUI("lab_add_linea")}>
                                <Checkbox
                                    checked={lineaDatos.get()}
                                    onChange={(e) => {
                                        lineaDatos.set(e.target.checked);
                                    }}> </Checkbox>
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <Button type="primary" disabled={opcionAddDatosPsicrometrico.get() === "todos"}
                                onClick={() => {
                                    series.merge([getSerie(opcionAddDatosPsicrometrico.get())])
                                    airesSeleccionados.set([]);  // Limpiar selección tras añadir datos
                                }}
                            >{getTextoUI("bot_guardar_serie")}</Button>
                        </Col>
                        <Col span={4}>
                            <Button type="primary" disabled={opcionAddDatosPsicrometrico.get() === "todos"}
                                onClick={() => { series.set([]); }}
                            >{getTextoUI("bot_borrar_series")}</Button>
                        </Col>
                    </Row>

                    <Row gutter={8}>
                        <span> {getTextoUI("ejes_max_min")} </span>
                    </Row>
                    <Row gutter={8}>
                        <Col span={8}>
                            <Form.Item
                                label={getTextoUI("lab_ejeX_psicrometrico")}
                            >
                                <InputNumber
                                    style={{ width: "100%" }}
                                    value={ejeXminPsicrometrico.get()}
                                    onChange={(value) => {
                                        ejeXminPsicrometrico.set(value);
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <InputNumber
                                style={{ width: "100%" }}
                                value={ejeXmaxPsicrometrico.get()}
                                onChange={(value) => {
                                    ejeXmaxPsicrometrico.set(value);
                                }}
                            />
                        </Col>
                        <Col span={9}>
                            <Form.Item
                                label={getTextoUI("lab_ejeY_psicrometrico")}
                            >
                                <InputNumber
                                    style={{ width: "100%" }}
                                    value={ejeYminPsicrometrico.get()}
                                    onChange={(value) => {
                                        ejeYminPsicrometrico.set(value);
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={3}>
                            <InputNumber
                                style={{ width: "100%" }}
                                value={ejeYmaxPsicrometrico.get()}
                                onChange={(value) => {
                                    ejeYmaxPsicrometrico.set(value);
                                }}
                            />
                        </Col>
                    </Row>
                </Form>
            </Panel>
        </Collapse>
    </div >);

}

export default Psicrometrico;