import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, InputNumber, Form } from 'antd';
import { configuracion, getTextoUI } from '../configuracion';
import { listaAires } from '../listaAires';
import { getPropAireHumedo, getIsolineaAire } from '../propFluidos/aires';
import formatear from '../util/formatear';
import { useMemo } from 'react';
import GraficaEstados from './GraficaEstados';

// Diagrama psicrométrico. Mismo esqueleto que el de fluidos: todo lo que no sea
// la proyección a los ejes y las curvas de fondo vive en GraficaEstados.
// Ver DOCUMENTACION.md §3.6.
//
// El papel que en el diagrama de fluidos hace "qué fluido se dibuja" lo hace aquí
// "a qué presión total": un estado de aire a otra altitud es otro sistema, y sus
// curvas de saturación son otras, así que no cabe en el mismo gráfico.

const { Option } = Select;

// Todo el fondo va en grises, para que resalten los estados y los procesos, que
// son lo que se está mirando. El tono marca la jerarquía: la saturación, la más
// oscura; después las de humedad relativa, las de bulbo húmedo y, la más clara,
// las de entalpía.
const GRIS_SATURACION = "#737373";
const GRIS_HUMEDAD = "#999999";
const GRIS_BULBO_HUMEDO = "#a6a6a6";
const GRIS_ENTALPIA = "#c4c4c4";
// Los rótulos, más oscuros que su línea: en el gris de la entalpía no se leerían
const GRIS_ROTULOS = "#8c8c8c";

// Curvas de humedad relativa constante que se dibujan de fondo.
const HUMEDADES_FONDO = [
    { hr: 100, grosor: 3, color: GRIS_SATURACION },
    { hr: 75, grosor: 1, color: GRIS_HUMEDAD },
    { hr: 50, grosor: 1, color: GRIS_HUMEDAD },
    { hr: 25, grosor: 1, color: GRIS_HUMEDAD }
];

// Isolíneas de bulbo húmedo y de entalpía constantes. Son casi paralelas entre
// sí, y por eso se distinguen por trazo y no solo por color: discontinuas las de
// bulbo húmedo, continuas y más claras las de entalpía. Las de bulbo húmedo
// empiezan en 5 ºC porque CoolProp salta al cruzar 0 ºC (agua o hielo) y la de
// T_h = 0 no tiene extremo seco (ver getIsolineaAire). Acaban donde, a nivel del
// mar, la línea siguiente ya saturaría por encima de W_MAXIMA.
const BULBOS_HUMEDOS_FONDO = [5, 10, 15, 20, 25, 30];
const ENTALPIAS_FONDO = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const ESTILO_BULBO_HUMEDO = { borderColor: GRIS_BULBO_HUMEDO, borderDash: [6, 4] };
const ESTILO_ENTALPIA = { borderColor: GRIS_ENTALPIA, borderDash: [] };

// Rango de temperatura seca del fondo. Antes lo fijaba el usuario con cuatro
// campos de mínimo y máximo; ahora es fijo y el encuadre se hace con el zoom,
// como en el diagrama de fluidos.
const T_MINIMA = -10;
const T_MAXIMA = 55;

// Humedad máxima del fondo, como en los diagramas de papel. Sin ella la curva de
// saturación subía hasta ~115 g/kg a 55 ºC y los ejes, que se ajustan a lo
// dibujado, aplastaban contra el eje T toda la zona útil. Solo recorta el fondo:
// un estado con más humedad se sigue dibujando y los ejes se estiran hasta él.
const W_MAXIMA = 30;

// Recorta una curva del fondo a w ≤ W_MAXIMA, con el punto exacto del corte
// interpolado para que la curva llegue justo al borde.
const recortarW = (puntos) => puntos.flatMap((punto, i) => {
    const anterior = puntos[i - 1];
    const corte = anterior && (anterior.y > W_MAXIMA) !== (punto.y > W_MAXIMA)
        ? [{
            x: anterior.x + (punto.x - anterior.x) * (W_MAXIMA - anterior.y) / (punto.y - anterior.y),
            y: W_MAXIMA
        }]
        : [];
    return punto.y > W_MAXIMA ? corte : [...corte, punto];
});

const ESTILO_FONDO = { showLine: true, pointRadius: 0 };
const ROTULO_FONDO = { font: '11px Arial', color: GRIS_ROTULOS };

// Dos estados están en el mismo diagrama si comparten presión total. Se compara
// la presión y no la altitud porque es lo que de verdad usa CoolProp: dos estados
// dados uno por altitud y otro por presión equivalente son el mismo sistema.
const MISMA_PRESION = 1e-3;

const Psicrometrico = () => {
    const lista = useHookstate(listaAires);
    const {
        tipoPsicrometrico, opcionPsicrometrico, valorOpcionPsicrometrico, airesSeleccionados
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
    // solo cuando cambia la presión del diagrama, no en cada render.
    const curvasFondo = useMemo(() => {
        const humedades = HUMEDADES_FONDO.map(({ hr, grosor, color }) => {
            const datos = [];
            for (let t = T_MINIMA; t <= T_MAXIMA; t++) {
                const w = getPropAireHumedo("W", opcionActual, valorActual, 'T', t, 'HR', hr);
                if (Number.isFinite(w)) datos.push({ x: t, y: w });
            }
            return { ...ESTILO_FONDO, data: recortarW(datos), borderColor: color, borderWidth: grosor };
        });

        // Cada isolínea lleva su valor como nombre en un punto, que el diagrama
        // rotula. Las de bulbo húmedo, en la campana y por fuera de ella, como en
        // los diagramas de papel; las de entalpía, en su extremo final —el eje
        // w = 0 o el borde derecho del fondo—, para que los dos juegos de rótulos
        // no se pisen.
        const isolineas = (propiedad, valores, estilo, rotular) => valores.flatMap((valor) => {
            // A más altitud cabe más vapor y alguna línea satura por encima de
            // W_MAXIMA: se recorta, y su rótulo pasa a ir en el borde superior.
            const puntos = recortarW(
                getIsolineaAire(opcionActual, valorActual, propiedad, valor, T_MINIMA, T_MAXIMA)
                    .map(({ T, W }) => ({ x: T, y: W }))
            );
            if (puntos.length < 2) return [];
            const { indice, posicionNombre, texto } = rotular(valor, puntos);
            puntos[indice] = { ...puntos[indice], nombre: texto, posicionNombre };
            return [{ ...ESTILO_FONDO, ...estilo, data: puntos, borderWidth: 1 }];
        });

        const rotularEntalpia = (h, puntos) => ({
            indice: puntos.length - 1,
            texto: `${h}`,
            posicionNombre: puntos[puntos.length - 1].y === 0
                ? { ...ROTULO_FONDO, align: 'left', dx: 2, dy: -8 }
                : { ...ROTULO_FONDO, align: 'right', dx: -3, dy: -6 }
        });
        const rotularBulboHumedo = (t) => ({
            indice: 0,
            texto: `${t}`,
            posicionNombre: { ...ROTULO_FONDO, align: 'right', dx: -4, dy: -6 }
        });

        return [
            ...isolineas("H", ENTALPIAS_FONDO, ESTILO_ENTALPIA, rotularEntalpia),
            ...isolineas("TH", BULBOS_HUMEDOS_FONDO, ESTILO_BULBO_HUMEDO, rotularBulboHumedo),
            ...humedades
        ];
    }, [opcionActual, valorActual]);

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
            pie={<>
                <p className='comentario' style={{ marginTop: 0, marginBottom: 4 }}>
                    {getTextoUI("coment_psicrometrico")} — p = {formatear(presionDiagrama, 4)} kPa
                </p>
                <p className='comentario' style={{ marginTop: 0, marginBottom: 4 }}>
                    {getTextoUI("leyenda_fondo_psicrometrico")}
                </p>
            </>}
        />
    );
}

export default Psicrometrico;
