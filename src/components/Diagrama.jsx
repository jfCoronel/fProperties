import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, Form } from 'antd';
import { configuracion, getTextoUI } from '../configuracion';
import formatear from '../util/formatear';
import { listaFluidos } from '../listaFluidos';
import { getListaFluidos, getPropFluido } from '../propFluidos/fluidos';
import { useCallback, useMemo } from 'react';
import GraficaEstados from './GraficaEstados';

// Diagramas de fluido puro (p-h, T-s, p-T). Todo el andamiaje —zoom, clic sobre
// curvas, rótulos, resaltado— vive en GraficaEstados; aquí queda solo lo propio
// del dominio: qué ejes, cómo se proyecta un estado y qué curva de fondo se
// dibuja. Ver DOCUMENTACION.md §3.6.

const { Option } = Select;

// Proyección de un estado a los ejes. Un mismo estado cae en un punto distinto
// según el tipo, y por aquí pasan tanto los puntos de la tabla como las curvas de
// los procesos: por eso un solo trazado sirve para los tres diagramas
// (DOCUMENTACION.md §3.4).
const proyectar = (estado, tipo) => {
    if (tipo === "p-T") return { x: estado.T, y: estado.P };
    if (tipo === "p-h") return { x: estado.H, y: estado.P };
    return { x: estado.S, y: estado.T };
};

const ETIQUETAS_X = { "p-T": "T [ºC]", "p-h": "h [kJ/kg]", "T-s": "s [kJ/kg·K]" };
const ETIQUETAS_Y = { "p-T": "p [kPa]", "p-h": "p [kPa]", "T-s": "T [ºC]" };

const Diagrama = () => {
    const lista = useHookstate(listaFluidos);
    const { tipoDiagrama, fluidoDiagrama, fluidosSeleccionados } = useHookstate(configuracion);

    const fluidoActual = fluidoDiagrama.get();
    const tipoActual = tipoDiagrama.get();
    const estadosActuales = lista.get({ noproxy: true });

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

    // La curva de saturación son ~200 llamadas a CoolProp: se recalcula solo cuando
    // cambia algo de lo que depende, no en cada render.
    const curvasFondo = useMemo(() => [getCurvaSat(3)], [getCurvaSat]);

    function getPuntosCaracteristicos() {
        const pTriple = formatear(getPropFluido(fluidoActual, "PTRIPLE", "T", 0, "X", 50), 3);
        const tTriple = formatear(getPropFluido(fluidoActual, "TTRIPLE", "T", 0, "X", 50), 3);
        const pCritica = formatear(getPropFluido(fluidoActual, "PCRIT", "T", 0, "X", 50), 3);
        const tCritica = formatear(getPropFluido(fluidoActual, "TCRIT", "T", 0, "X", 50), 3);
        return `${getTextoUI("lab_punto_triple")}: ${tTriple} ºC, ${pTriple} kPa`
            + ` — ${getTextoUI("lab_punto_critico")}: ${tCritica} ºC, ${pCritica} kPa`;
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

    const selectorTipo = (
        <Col xs={24} sm={10} md={8} key="tipo">
            <Form.Item label={getTextoUI("lab_tipo_diagrama")} style={{ marginBottom: 8 }}>
                <Select value={tipoActual} onChange={alCambiarTipo}>
                    <Option value="ninguno">{getTextoUI("tipo_ninguno")}</Option>
                    <Option value="p-T">{getTextoUI("tipo_p-T")}</Option>
                    <Option value="p-h">{getTextoUI("tipo_p-h")}</Option>
                    <Option value="T-s">{getTextoUI("tipo_T-s")}</Option>
                </Select>
            </Form.Item>
        </Col>
    );

    // Sin diagrama solo queda el desplegable, que hace de interruptor.
    if (tipoActual === "ninguno") {
        return (<div className="panel">
            <Form name="selector_diagrama" layout="vertical" style={{ marginBottom: 8 }}>
                <Row gutter={16}>{selectorTipo}</Row>
            </Form>
        </div>);
    }

    const selectorFluido = (
        <Col xs={24} sm={10} md={8} key="fluido">
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
        </Col>
    );

    return (
        <GraficaEstados
            dominio="fluido"
            estados={estadosActuales}
            seleccionados={fluidosSeleccionados}
            visible={(estado) => estado.fluido === fluidoActual}
            proyectar={(estado) => proyectar(estado, tipoActual)}
            etiquetaX={ETIQUETAS_X[tipoActual] ?? ""}
            etiquetaY={ETIQUETAS_Y[tipoActual] ?? ""}
            escalaY={tipoActual === "p-h" ? "logarithmic" : "linear"}
            firmaVista={`${tipoActual}|${fluidoActual}`}
            curvasFondo={curvasFondo}
            titulo={getTextoUI("titulo_diagrama")}
            selectores={[selectorTipo, selectorFluido]}
            pie={<p className='comentario' style={{ marginTop: 0, marginBottom: 4 }}>
                {getPuntosCaracteristicos()}
            </p>}
        />
    );
}

export default Diagrama;
