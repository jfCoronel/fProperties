import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, InputNumber, Form, Divider } from 'antd'
import { configuracion, getTextoUI } from '../configuracion';
import { Chart as ChartJS } from 'chart.js/auto';
import { Scatter } from 'react-chartjs-2';
import formatear from '../util/formatear';
import { listaFluidos } from '../listaFluidos';
import { getListaFluidos } from '../propFluidos/fluidos';

const { Option } = Select;

const Diagrama = () => {
    const lista = useHookstate(listaFluidos);
    const { tipoDiagrama, fluidoDiagrama,
        ejeXmaxDiagrama, ejeXminDiagrama,
        ejeYmaxDiagrama, ejeYminDiagrama } = useHookstate(configuracion);

    // Tooltip
    const titleTooltip = (ctx) => {
        return ctx[0].raw.nombre;
    }

    const getLabelX = () => {
        if (tipoDiagrama.get() === "p-h") {
            return "h [kJ/kg]";
        } else if (tipoDiagrama.get() === "T-s") {
            return "s [kJ/kg·K]";
        }
    }

    const getLabelY = () => {
        if (tipoDiagrama.get() === "p-h") {
            return "p [kPa]";
        } else if (tipoDiagrama.get() === "T-s") {
            return "T [ºC]";
        }
    }
    const getEscalaY = () => {
        if (tipoDiagrama.get() === "p-h") {
            return "logarithmic";
        } else if (tipoDiagrama.get() === "T-s") {
            return "linear";
        }
    }


    const getFluidos = () => {
        const datos = lista.reduce((result, fluido) => {
            if (fluido.fluido.get() == fluidoDiagrama.get()) {
                let dato = {};
                if (tipoDiagrama.get() === "p-h") {
                    dato = {
                        x: fluido.H.get(),
                        y: fluido.P.get(),
                        nombre: fluido.nombre.get()
                    }

                } else if (tipoDiagrama.get() === "T-s") {
                    dato = {
                        x: fluido.S.get(),
                        y: fluido.T.get(),
                        nombre: fluido.nombre.get()
                    }
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
        <h3>{getTextoUI("titulo_diagrama")}</h3>
        <Form name="selector_diagrama">
            <Row gutter={8}>
                <Col span={8}>
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
                            <Option value="p-h">{getTextoUI("tipo_p-h")}</Option>
                            <Option value="T-s">{getTextoUI("tipo_T-s")}</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={8}>
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
                <Col span={8}>
                    <span className='comentario'>{getTextoUI("coment_diagrama")}</span>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={7}>
                    <Form.Item
                        label={getLabelX()}
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
                <Col span={5}>
                    <InputNumber
                        style={{ width: "100%" }}
                        value={ejeXmaxDiagrama.get()}
                        onChange={(value) => {
                            ejeXmaxDiagrama.set(value);
                        }}
                    />
                </Col>
                <Col span={7}>
                    <Form.Item
                        label={getLabelY()}
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
                <Col span={5}>
                    <InputNumber
                        style={{ width: "100%" }}
                        value={ejeYmaxDiagrama.get()}
                        onChange={(value) => {
                            ejeYmaxDiagrama.set(value);
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
                    }
                }
            }}
            data={{
                datasets: [
                    //getCurvaHRcte(100, 3),
                    //getCurvaHRcte(75),
                    //getCurvaHRcte(50),
                    //getCurvaHRcte(25),
                    getFluidos()
                ]
            }}
        />
    </div >);

}

export default Diagrama;