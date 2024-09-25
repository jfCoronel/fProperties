import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, InputNumber, Form, Divider } from 'antd'
import { configuracion, getTextoUI } from '../configuracion';
import { listaAires } from '../listaAires';
import { Chart as ChartJS } from 'chart.js/auto';
import { Scatter } from 'react-chartjs-2';
import { getPropAireHumedo } from '../propFluidos/aires'
import formatear from '../util/formatear';

const { Option } = Select;

const Psicrometrico = () => {
    const lista = useHookstate(listaAires);
    const { opcionPsicrometrico, valorOpcionPsicrometrico,
        ejeXmaxPsicrometrico, ejeXminPsicrometrico,
        ejeYmaxPsicrometrico, ejeYminPsicrometrico } = useHookstate(configuracion);

    // Tooltip
    const titleTooltip = (ctx) => {
        return ctx[0].raw.nombre;
    }

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
    const getAires = () => {
        const datos = lista.reduce((result, aire) => {
            if (check_altura(aire)) {
                let dato = {
                    x: aire.T.get(),
                    y: aire.W.get(),
                    nombre: aire.nombre.get()
                }
                result.push(dato);
            }
            return result;
        }, []);

        return {
            data: datos,
            borderColor: "blue",
            pointRadius: 6
        };
    }

    return (<div className="grafica">
        <Divider />
        <h3>{getTextoUI("titulo_psicrometrico")}</h3>
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
                <Col span={9}>
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
                <Col span={3}>
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
                    }
                }
            }}
            data={{
                datasets: [
                    getCurvaHRcte(100, 3),
                    getCurvaHRcte(75),
                    getCurvaHRcte(50),
                    getCurvaHRcte(25),
                    getAires()
                ]
            }}
        />
    </div >);

}

export default Psicrometrico;