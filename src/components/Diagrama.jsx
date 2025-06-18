import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, InputNumber, Form, Divider, Button } from 'antd'
import { configuracion, getTextoUI } from '../configuracion';
import { Chart as ChartJS } from 'chart.js/auto';
import { Scatter } from 'react-chartjs-2';
import formatear from '../util/formatear';
import { listaFluidos } from '../listaFluidos';
import { getListaFluidos, getPropFluido } from '../propFluidos/fluidos';

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


    const getFluidos = () => {
        const datos = lista.reduce((result, fluido) => {
            if (fluido.fluido.get() == fluidoDiagrama.get()) {
                let dato = {};
                if (tipoDiagrama.get() === "p-T") {
                    dato = {
                        x: fluido.T.get(),
                        y: fluido.P.get(),
                        nombre: fluido.nombre.get()
                    }

                } else if (tipoDiagrama.get() === "p-h") {
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

    function ajustarEjesDiagrama() {
        const puntos = getFluidos().data;
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

    const getCurvaSat = (grosor = 1) => {
        let datos = [];
        const fluido = fluidoDiagrama.get()
        if (tipoDiagrama.get() === "p-T") {
            const deltaT = (ejeXmaxDiagrama.get() - ejeXminDiagrama.get()) / 100
            for (let t = ejeXminDiagrama.get(); t <= ejeXmaxDiagrama.get(); t += deltaT) {
                let p = getPropFluido(fluido, "P", "T", t, "X", 50);
                datos.push({ x: t, y: p })
            }
        } else if (tipoDiagrama.get() === "p-h") {
            const pTriple = getPropFluido(fluido, "PTRIPLE", "T", 0, "X", 50);
            const pCritica = getPropFluido(fluido, "PCRIT", "T", 0, "X", 50);

            const deltaP = (pCritica - pTriple) / 100
            for (let p = pTriple; p <= pCritica; p += deltaP) {
                let h = getPropFluido(fluido, "H", "P", p, "X", 0);
                datos.push({ x: h, y: p })
            }
            for (let p = pCritica; p >= pTriple; p -= deltaP) {
                let h = getPropFluido(fluido, "H", "P", p, "X", 100);
                datos.push({ x: h, y: p })
            }
        } else if (tipoDiagrama.get() === "T-s") {
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
    }

    function getFluidInfo() {
        const fluido = fluidoDiagrama.get();
        const pTriple = formatear(getPropFluido(fluido, "PTRIPLE", "T", 0, "X", 50), 3);
        const pCritica = formatear(getPropFluido(fluido, "PCRIT", "T", 0, "X", 50), 3);
        const tTriple = formatear(getPropFluido(fluido, "TTRIPLE", "T", 0, "X", 50), 3);
        const tCritica = formatear(getPropFluido(fluido, "TCRIT", "T", 0, "X", 50), 3);
        return `${getTextoUI("lab_punto_triple")}: ${tTriple} ºC, ${pTriple} kPa; ${getTextoUI("lab_punto_critico")}: ${tCritica} ºC, ${pCritica} kPa`;
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
                            <Option value="p-T">{getTextoUI("tipo_p-T")}</Option>
                            <Option value="p-h">{getTextoUI("tipo_p-h")}</Option>
                            <Option value="T-s">{getTextoUI("tipo_T-s")}</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={6}>
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
                <Col span={10}>
                    <span className='comentario'>{getFluidInfo()}</span>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <span>{getTextoUI("coment_ejes")}</span>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={6}>
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
                <Col span={4}>
                    <InputNumber
                        style={{ width: "100%" }}
                        value={ejeXmaxDiagrama.get()}
                        onChange={(value) => {
                            ejeXmaxDiagrama.set(value);
                        }}
                    />
                </Col>
                <Col span={6}>
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
                <Col span={4}>
                    <InputNumber
                        style={{ width: "100%" }}
                        value={ejeYmaxDiagrama.get()}
                        onChange={(value) => {
                            ejeYmaxDiagrama.set(value);
                        }}
                    />
                </Col>
                <Col span={4}>
                    <Button type="primary"
                        onClick={() => { ajustarEjesDiagrama() }}
                    >{getTextoUI("bot_actualizar_ejes")}</Button>
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
                    getCurvaSat(3),
                    getFluidos()
                ]
            }}
        />
    </div >);

}

export default Diagrama;