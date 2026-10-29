import { useHookstate } from '@hookstate/core';
import { Row, Col, Form, Button, Modal, Space, Tabs } from 'antd';
import CampoNumero from './CampoNumero';
import { ExpandOutlined, SettingOutlined } from '@ant-design/icons';
// Importado por su efecto: registra todos los controladores de Chart.js.
import 'chart.js/auto';
import { Scatter } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import { useMemo, useRef, useState } from 'react';
import { configuracion, getTextoUI } from '../configuracion';
import { listaProcesos, idsProcesosDeEstados } from '../procesos/listaProcesos';
import { dominioDeProceso } from '../procesos/proceso';
import { trazosProcesos } from '../diagramas/trazosProcesos';
import { refinarTrazo } from '../diagramas/refinarTrazo';
import { situarRotulo } from '../diagramas/lineasFondo';
import formatear from '../util/formatear';
import { TooltipAccion } from './Ayudas';
import { ES_TACTIL } from '../util/tactil';

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

// Altura del lienzo elegida con el tirador. Sin elegir, manda la del CSS
// (.lienzo-diagrama), que es relativa a la ventana. Se guarda en el navegador y
// no en el permalink: depende de la pantalla de quien mira, no del problema.
// localStorage puede no estar (ventana privada, datos bloqueados): entonces
// simplemente no se recuerda.
const CLAVE_ALTO_DIAGRAMA = 'fproperties.altoDiagrama';
const ALTO_MINIMO = 300;
const ALTO_MAXIMO = 2000;

const leerAltoGuardado = () => {
    try {
        const alto = Number(localStorage.getItem(CLAVE_ALTO_DIAGRAMA));
        return alto >= ALTO_MINIMO && alto <= ALTO_MAXIMO ? alto : null;
    } catch {
        return null;
    }
};

const guardarAlto = (alto) => {
    try {
        if (alto === null) localStorage.removeItem(CLAVE_ALTO_DIAGRAMA);
        else localStorage.setItem(CLAVE_ALTO_DIAGRAMA, String(Math.round(alto)));
    } catch {
        // Sin almacenamiento, la altura vale para esta sesión y nada más
    }
};

// Los diagramas no tienen panel de configuración: lo que antes eran opciones
// (color, línea, nombres, ejes) son ahora decisiones fijas.
const COLOR_ESTADOS = "#0000FF";
const FONDO_ESTADOS = "#FFFFFF";
const RADIO_ESTADO = 6;
const RADIO_ESTADO_SELECCIONADO = 10;
const RADIO_MARCA_AUXILIAR = 3;
// Un dedo no apunta como un ratón: en táctil, el tooltip de un estado sale al
// tocar a esta distancia del punto, no solo encima de él.
const RADIO_TOQUE_ESTADO = 20;
const TECLA_MODIFICADORA = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'meta' : 'ctrl';

// Rotula cada punto con su nombre. Va como plugin y no como opción de Chart.js
// porque hay que pintar sobre el lienzo una vez dibujadas las series. Es
// afterDatasetsDraw (una vez, al final) y no afterDatasetDraw (una por serie):
// con este último, cada pasada volvía a rotular todas las series y cada texto se
// pintaba tantas veces como series hubiera, emborronado y en falsa negrita.
//
// Por defecto el rótulo va arriba a la derecha del punto, que es lo que piden los
// estados. Un punto puede traer su propia `posicionNombre` ({ align, dx, dy,
// font, color }), como el final de un trazo auxiliar.
//
// Las isolíneas de fondo no rotulan un punto fijo: traen un `rotulo` por dataset
// y se sitúa en cada dibujo sobre lo que se ve de la línea, para que siga dentro
// del diagrama con zoom o con otros límites de ejes. Se trabaja en píxeles, que
// ya tienen en cuenta la escala logarítmica.
const POSICION_NOMBRE = { dx: 5, dy: -15 };

const mostrarNombres = {
    id: 'mostrarNombres',
    afterDatasetsDraw: (chart, args, options) => {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach((datapoint, index) => {
                const punto = dataset.data[index];
                if (options.showLabels && punto && punto.nombre) {
                    const pos = datapoint.getProps(['x', 'y'], true);
                    const posicion = { ...POSICION_NOMBRE, ...punto.posicionNombre };
                    ctx.save();
                    ctx.fillStyle = posicion.color || dataset.borderColor || 'black';
                    ctx.font = posicion.font || options.font || '12px Arial';
                    ctx.textAlign = posicion.align || options.align || 'center';
                    ctx.textBaseline = options.baseline || 'bottom';
                    ctx.fillText(punto.nombre, pos.x + posicion.dx, pos.y + posicion.dy);
                    ctx.restore();
                }
            });
        });
        if (options.showLabels) rotularFondo(chart);
    }
};

// Los trozos de una misma isolínea comparten el objeto `rotulo`: se juntan para
// rotularla una sola vez, en el extremo de su parte visible.
function rotularFondo(chart) {
    const { ctx, chartArea, scales } = chart;
    const trozosPorRotulo = new Map();
    chart.data.datasets.forEach((dataset, i) => {
        if (!dataset.rotulo || chart.getDatasetMeta(i).hidden) return;
        const enPixeles = dataset.data.map(({ x, y }) => (
            { x: scales.x.getPixelForValue(x), y: scales.y.getPixelForValue(y) }
        ));
        trozosPorRotulo.set(dataset.rotulo, [...(trozosPorRotulo.get(dataset.rotulo) ?? []), enPixeles]);
    });
    const caja = { xMin: chartArea.left, xMax: chartArea.right, yMin: chartArea.top, yMax: chartArea.bottom };
    trozosPorRotulo.forEach((trozos, rotulo) => {
        const situado = situarRotulo(trozos, rotulo, caja);
        if (situado === null) return;
        const { x, y, texto, posicion } = situado;
        ctx.save();
        ctx.fillStyle = posicion.color;
        ctx.font = posicion.font;
        ctx.textAlign = posicion.align;
        ctx.textBaseline = 'middle';
        ctx.fillText(texto, x + posicion.dx, y + posicion.dy);
        ctx.restore();
    });
}

// Límites de ejes fijados en el diálogo, por vista (firmaVista). Viven aquí, y
// no en el estado del componente, para que sobrevivan a cambiar de tipo de
// diagrama o de fluido y volver; no van al permalink.
const limitesFijados = new Map();

// Escribe los límites en las escalas (undefined: automáticos) y redibuja
function aplicarLimites(grafico, limites) {
    Object.assign(grafico.options.scales.x, { min: limites?.xMin, max: limites?.xMax });
    Object.assign(grafico.options.scales.y, { min: limites?.yMin, max: limites?.yMax });
    grafico.update('none');
}



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
 * @param panelFondo     contenido de la pestaña "Líneas de fondo" del diálogo de
 *                       configuración (PanelLineasFondo), o nada si no tiene
 */
const GraficaEstados = ({
    dominio, estados, seleccionados, visible, proyectar,
    etiquetaX, etiquetaY, escalaY = 'linear',
    firmaVista, curvasFondo, titulo, selectores, pie, panelFondo
}) => {
    const { procesosSeleccionados, idProcesoActual } = useHookstate(configuracion);
    const procesos = useHookstate(listaProcesos);

    const procesosActuales = procesos.get({ noproxy: true })
        .filter((proceso) => dominioDeProceso(proceso) === dominio);

    const referenciaGrafico = useRef(null);
    const [dialogoEjesAbierto, setDialogoEjesAbierto] = useState(false);
    const [limitesEjes, setLimitesEjes] = useState(null);
    // Los límites de los ejes solo se aplican si se han tocado: abrir el diálogo
    // para cambiar las líneas de fondo no debe congelar el encuadre actual.
    const [ejesEditados, setEjesEditados] = useState(false);
    // Reencuadrar vuelve a los límites fijados, o a los automáticos si no los hay.
    // El resetZoom va primero para que el plugin de zoom olvide su estado, pero
    // no basta solo: los límites "originales" que restaura son los que había al
    // primer zoom, que pueden ser de otra vista.
    const reencuadrar = () => {
        const grafico = referenciaGrafico.current;
        if (!grafico) return;
        grafico.resetZoom('none');
        aplicarLimites(grafico, limitesFijados.get(firmaVista));
    };

    // Tirador de altura. Chart.js sigue al contenedor por su cuenta (responsive con
    // maintainAspectRatio: false), así que basta con cambiar la altura del div.
    // La captura del puntero mantiene el arrastre aunque se salga del tirador.
    const referenciaLienzo = useRef(null);
    const [alto, setAlto] = useState(leerAltoGuardado);
    const arrastreAlto = useRef(null);

    const empezarArrastreAlto = (evento) => {
        evento.currentTarget.setPointerCapture(evento.pointerId);
        arrastreAlto.current = {
            y: evento.clientY,
            alto: referenciaLienzo.current.getBoundingClientRect().height
        };
    };
    const moverArrastreAlto = (evento) => {
        const inicio = arrastreAlto.current;
        if (inicio === null) return;
        const nuevo = inicio.alto + evento.clientY - inicio.y;
        setAlto(Math.min(ALTO_MAXIMO, Math.max(ALTO_MINIMO, nuevo)));
    };
    const terminarArrastreAlto = () => {
        if (arrastreAlto.current === null) return;
        arrastreAlto.current = null;
        guardarAlto(referenciaLienzo.current.getBoundingClientRect().height);
    };

    const abrirDialogoEjes = () => {
        const grafico = referenciaGrafico.current;
        if (!grafico) return;
        setLimitesEjes({
            xMin: grafico.scales.x.min,
            xMax: grafico.scales.x.max,
            yMin: grafico.scales.y.min,
            yMax: grafico.scales.y.max
        });
        setEjesEditados(false);
        setDialogoEjesAbierto(true);
    };

    const limitesValidos = limitesEjes !== null
        && Object.values(limitesEjes).every(Number.isFinite)
        && limitesEjes.xMin < limitesEjes.xMax
        && limitesEjes.yMin < limitesEjes.yMax
        && (escalaY !== 'logarithmic' || limitesEjes.yMin > 0);

    const editarLimite = (clave, valor) => {
        setLimitesEjes({ ...limitesEjes, [clave]: valor });
        setEjesEditados(true);
    };

    const aplicarConfiguracion = () => {
        const grafico = referenciaGrafico.current;
        if (ejesEditados && limitesValidos && grafico) {
            limitesFijados.set(firmaVista, limitesEjes);
            aplicarLimites(grafico, limitesEjes);
        }
        setDialogoEjesAbierto(false);
    };

    // Olvida los límites fijados y deja el diálogo con los automáticos
    const limitesAutomaticos = () => {
        const grafico = referenciaGrafico.current;
        limitesFijados.delete(firmaVista);
        if (!grafico) return;
        grafico.resetZoom('none');
        aplicarLimites(grafico, undefined);
        setLimitesEjes({
            xMin: grafico.scales.x.min,
            xMax: grafico.scales.x.max,
            yMin: grafico.scales.y.min,
            yMax: grafico.scales.y.max
        });
        setEjesEditados(false);
    };

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
            pointHitRadius: ES_TACTIL ? RADIO_TOQUE_ESTADO : 1,
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
        return trazosProcesos(procesosActuales, estados, visible).map((trazo) => {
            // En los de fluido, la curva dobla justo sobre la campana en vez de
            // recortar la esquina (el psicrométrico no tiene campana)
            const camino = dominio === 'fluido' ? refinarTrazo(trazo.estados) : trazo.estados;
            const datos = camino.map(proyectar);
            const { color, grosor, trazo: tipoTrazo } = trazo.estilo;

            // Los trazos auxiliares (la prolongación hasta el ADP, por ejemplo)
            // van con el color del proceso pero finos y discontinuos, para que no
            // se confundan con el camino del fluido. El punto final se marca y se
            // rotula: es la construcción que se quiere enseñar.
            if (trazo.auxiliar) {
                const ultimo = datos.length - 1;
                // El rótulo, a la izquierda: el de la salida va arriba a la
                // derecha y, con un by-pass pequeño, los dos puntos casi se tocan.
                if (trazo.rotuloFinal) {
                    datos[ultimo] = {
                        ...datos[ultimo],
                        nombre: trazo.rotuloFinal,
                        posicionNombre: { align: 'right', dx: -7, dy: 0 }
                    };
                }
                return {
                    data: datos,
                    borderColor: color,
                    backgroundColor: color,
                    borderWidth: 1,
                    borderDash: [3, 3],
                    showLine: true,
                    pointRadius: datos.map((_, i) => (i === ultimo ? RADIO_MARCA_AUXILIAR : 0)),
                    idProceso: trazo.idProceso,
                    auxiliar: true
                };
            }

            return {
                data: datos,
                borderColor: color,
                borderWidth: grosor,
                borderDash: tipoTrazo === "dashed" ? [8, 4] : [],
                showLine: true,
                pointRadius: 0,
                // El id viaja dentro del dataset: es lo que permite volver de un
                // clic en la curva a la fila de la tabla.
                idProceso: trazo.idProceso
            };
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

        // Solo se escribe lo que cambia: cada escritura redibuja el diagrama, y
        // en táctil eso borraba el tooltip del estado recién tocado.
        const seleccion = idPulsado === null ? [] : [idPulsado];
        if (JSON.stringify(procesosSeleccionados.get({ noproxy: true })) !== JSON.stringify(seleccion)) {
            procesosSeleccionados.set(seleccion);
        }
        if (idProcesoActual.get() !== null) idProcesoActual.set(null);
    };

    const todasLasSeries = () => {
        // Un trazo auxiliar se resalta menos: engordarlo tanto como la curva lo
        // haría pasar por parte del camino.
        const seriesProcesos = curvasProcesos.map((curva) => (
            idsResaltados.has(curva.idProceso)
                ? { ...curva, borderWidth: curva.borderWidth + (curva.auxiliar ? 1 : 3) }
                : curva
        ));
        return [...curvasFondo, ...seriesProcesos, getSerieEstados()];
    };

    // Las opciones van memorizadas y no es un detalle de rendimiento: react-chartjs-2
    // vuelca este objeto sobre el del gráfico cada vez que cambia de identidad, y
    // el zoom vive precisamente en los mínimos y máximos de las escalas. Sin
    // memorizar, cualquier render (seleccionar una fila, editar un estado) devolvería
    // el diagrama a su encuadre inicial. Que cambiar de vista sí lo reencuadre es
    // lo deseable: el encuadre anterior no significa nada en otros ejes. Los
    // límites fijados en el diálogo para la nueva vista, si los hay, se recuperan.
    const opcionesGrafico = useMemo(() => {
        const fijados = limitesFijados.get(firmaVista);
        return {
            // Mismo formato que las tablas: punto decimal y sin separador de miles,
            // sea cual sea el idioma.
            locale: "en-US",
            maintainAspectRatio: false,
        // Sin animaciones: las series se rehacen en cada selección y en cada
        // cambio de altura, y Chart.js las hacía crecer desde el eje cada vez.
        animation: false,
            scales: {
                x: {
                    min: fijados?.xMin,
                    max: fijados?.xMax,
                    title: { display: true, text: etiquetaX, font: { size: 14 } },
                    ticks: { font: { size: 14 }, format: { useGrouping: false } }
                },
                y: {
                    type: escalaY,
                    min: fijados?.yMin,
                    max: fijados?.yMax,
                    title: { display: true, text: etiquetaY, font: { size: 14 } },
                    // Chart.js saca los decimales de la separación entre marcas y los
                    // aplica a todas: en logarítmica, unas marcas de 0.1 en 0.1 al pie
                    // del eje dejarían "1000.0" arriba. Se permite quitar ceros finales.
                    ticks: {
                        font: { size: 14 },
                        format: escalaY === 'logarithmic'
                            ? { useGrouping: false, minimumFractionDigits: 0 }
                            : { useGrouping: false }
                    }
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
                // Cmd en Apple y Ctrl en el resto evitan capturar la rueda de la página.
                zoom: {
                    zoom: {
                        wheel: { enabled: true, speed: 0.1, modifierKey: TECLA_MODIFICADORA },
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
                    pan: { enabled: true, mode: 'xy', modifierKey: TECLA_MODIFICADORA }
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firmaVista]);

    return (<div className="panel">
        <h3>{titulo}</h3>

        <Form name="selector_diagrama" layout="vertical" style={{ marginBottom: 8 }}>
            <Row gutter={16}>
                {selectores}
                <Col xs={24} sm={4} md={4}>
                    <Form.Item label={" "} style={{ marginBottom: 8 }}>
                        <Space.Compact block>
                            <TooltipAccion title={getTextoUI("tooltip_reencuadrar")}>
                                <Button icon={<ExpandOutlined />} onClick={reencuadrar} block>
                                    {getTextoUI("bot_reencuadrar")}
                                </Button>
                            </TooltipAccion>
                            <TooltipAccion title={getTextoUI("tooltip_configurar_ejes")}>
                                <Button icon={<SettingOutlined />} onClick={abrirDialogoEjes} />
                            </TooltipAccion>
                        </Space.Compact>
                    </Form.Item>
                </Col>
            </Row>
        </Form>

        {pie}
        <p className='comentario' style={{ marginTop: 0 }}>{getTextoUI(ES_TACTIL ? "ayuda_zoom_tactil" : "ayuda_zoom")}</p>

        <div
            className="lienzo-diagrama"
            ref={referenciaLienzo}
            style={alto === null ? undefined : { height: alto }}
        >
            <Scatter
                ref={referenciaGrafico}
                onClick={alHacerClic}
                onPointerDown={alPulsar}
                options={opcionesGrafico}
                data={{ datasets: todasLasSeries() }}
                plugins={[mostrarNombres, zoomPlugin]}
            />
        </div>
        <TooltipAccion title={getTextoUI("tooltip_alto_diagrama")}>
            <div
                className="tirador-diagrama"
                role="separator"
                aria-orientation="horizontal"
                onPointerDown={empezarArrastreAlto}
                onPointerMove={moverArrastreAlto}
                onPointerUp={terminarArrastreAlto}
                onPointerCancel={terminarArrastreAlto}
            />
        </TooltipAccion>

        <Modal
            title={getTextoUI("titulo_configurar_diagrama")}
            open={dialogoEjesAbierto}
            onCancel={() => { setDialogoEjesAbierto(false); }}
            onOk={aplicarConfiguracion}
            okText={getTextoUI("bot_aplicar")}
            okButtonProps={{ disabled: ejesEditados && !limitesValidos }}
            width={640}
        >
            <Tabs
                defaultActiveKey={panelFondo ? "fondo" : "ejes"}
                items={[
                    ...(panelFondo ? [{
                        key: "fondo",
                        label: getTextoUI("tab_lineas_fondo"),
                        children: panelFondo
                    }] : []),
                    {
                        key: "ejes",
                        label: getTextoUI("tab_ejes"),
                        children: limitesEjes && (
                            <Form layout="vertical">
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label={`${etiquetaX} ${getTextoUI("lab_minimo")}`}>
                                            <CampoNumero
                                                value={limitesEjes.xMin}
                                                onChange={(valor) => editarLimite('xMin', valor)}
                                                style={{ width: "100%" }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label={`${etiquetaX} ${getTextoUI("lab_maximo")}`}>
                                            <CampoNumero
                                                value={limitesEjes.xMax}
                                                onChange={(valor) => editarLimite('xMax', valor)}
                                                style={{ width: "100%" }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label={`${etiquetaY} ${getTextoUI("lab_minimo")}`}>
                                            <CampoNumero
                                                value={limitesEjes.yMin}
                                                onChange={(valor) => editarLimite('yMin', valor)}
                                                style={{ width: "100%" }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label={`${etiquetaY} ${getTextoUI("lab_maximo")}`}>
                                            <CampoNumero
                                                value={limitesEjes.yMax}
                                                onChange={(valor) => editarLimite('yMax', valor)}
                                                style={{ width: "100%" }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Button onClick={limitesAutomaticos} disabled={!limitesFijados.has(firmaVista)}>
                                    {getTextoUI("bot_ejes_automaticos")}
                                </Button>
                            </Form>
                        )
                    }
                ]}
            />
        </Modal>
    </div>);
};

export default GraficaEstados;
