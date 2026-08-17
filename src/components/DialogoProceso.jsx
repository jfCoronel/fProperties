/* eslint-disable react/prop-types */
import { useHookstate } from '@hookstate/core';
import { Modal, Button, Row, Col, Select, InputNumber, Form, ColorPicker, Alert } from 'antd'
import { configuracion, getTextoUI } from '../configuracion';
import { getListaDominio } from '../listasDominio';
import { listaProcesos, actualizarProceso, cambiarTipoProceso } from '../procesos/listaProcesos';
import {
    getDefiniciones,
    getDefinicion,
    getParametrosVisibles,
    getParametrosPorDefecto,
    evaluarProceso,
    puedeCalcular
} from '../procesos/proceso';
import { detectarTipo } from '../procesos/deteccion';
import { propagarProcesos } from '../procesos/propagacion';
import { getRendimientoIsentropico, getRendimientoExpansion } from '../procesos/resolvedores';
import { textoMensaje } from '../procesos/mensajes';
import formatear from '../util/formatear';

const { Option } = Select;

const DialogoProceso = ({ dominio = 'fluido' }) => {
    const procesos = useHookstate(listaProcesos);
    const { lista, nuevoEstado } = getListaDominio(dominio);
    const estados = useHookstate(lista);
    const { idProcesoActual, verDialogoProceso, nCifras } = useHookstate(configuracion);

    const id = idProcesoActual.get();
    const fila = procesos.get({ noproxy: true }).findIndex((p) => p.id === id);

    if (fila < 0) {
        return (<></>);
    }

    const proceso = procesos[fila].get({ noproxy: true });
    // Las dos tablas montan su diálogo; el que no es del dominio del proceso
    // seleccionado se aparta en vez de editar la lista de estados equivocada.
    if (getDefinicion(proceso.tipo)?.dominio !== dominio) {
        return (<></>);
    }
    const listaEstados = estados.get({ noproxy: true });
    const definicion = getDefinicion(proceso.tipo);
    const evaluacion = evaluarProceso(proceso, listaEstados);

    const guardar = (cambios) => {
        actualizarProceso(id, { ...proceso, ...cambios });
        // Cualquier cambio puede alterar la cadena de estados generados
        propagarProcesos();
    };

    // Cambiar de tipo puede dejar parámetros huérfanos, faltar los del tipo nuevo
    // o dejar en calculado un tipo que no sabe calcular: de todo eso se ocupa
    // cambiarTipoProceso, que es el mismo camino que usa el aviso de la tabla.
    const cambiarTipo = (clave) => {
        cambiarTipoProceso(id, clave);
        propagarProcesos();
    };

    // El tipo lo declara el usuario; esto solo dice cuál encajaría, y ofrece
    // adoptarlo de un clic si no es el declarado.
    const tipoDetectado = evaluacion.valido
        ? detectarTipo(evaluacion.origenes[0], evaluacion.destino, dominio)
        : null;

    const redondear = (valor) => Number(formatear(valor, nCifras.get()));

    // Al pasar a calculado, los parámetros que hasta ahora eran resultado se
    // convierten en entrada: se rellenan con lo que ya describía la pareja de
    // estados, de modo que el punto no salte al cambiar de modo.
    const sugerirParametros = () => {
        const origen = listaEstados.find((estado) => estado.id === proceso.origenes[0]);
        const estadoDestino = listaEstados.find((estado) => estado.id === proceso.destino);
        if (!origen || !estadoDestino) return {};

        // Cada parámetro sabe leerse de la pareja de estados. El rendimiento va
        // aparte porque solo se adopta si cae en el rango físico: fuera de él, el
        // valor por defecto del tipo es mejor punto de partida que un absurdo.
        const DE_LOS_ESTADOS = {
            p_final: () => estadoDestino.P,
            t_final: () => estadoDestino.T,
            q_dato: () => estadoDestino.H - origen.H,
            dp_dato: () => Math.max(0, origen.P - estadoDestino.P),
            hr_final: () => estadoDestino.HR,
            w_final: () => estadoDestino.W,
            h_agua: () => (Math.abs(estadoDestino.W - origen.W) > 1e-9
                ? (estadoDestino.H - origen.H) * 1000 / (estadoDestino.W - origen.W)
                : null)
        };

        const sugerencias = {};
        definicion.parametros.forEach(({ clave }) => {
            const leer = DE_LOS_ESTADOS[clave];
            if (!leer) return;
            const valor = leer();
            if (Number.isFinite(valor)) sugerencias[clave] = redondear(valor);
        });

        if (definicion.parametros.some((parametro) => parametro.clave === "eta")) {
            const rendimiento = definicion.clave === "expansion_isentropica"
                ? getRendimientoExpansion(origen, estadoDestino)
                : getRendimientoIsentropico(origen, estadoDestino);
            if (rendimiento !== null && rendimiento > 0 && rendimiento <= 1) {
                sugerencias.eta = redondear(rendimiento);
            }
        }
        return sugerencias;
    };

    const cambiarModo = (modo) => {
        if (modo === "manual") {
            guardar({ modoDestino: "manual" });
            return;
        }

        // Sin estado destino no hay dónde dejar el resultado: se crea uno.
        const cambios = { modoDestino: "calculado" };
        if (proceso.destino === null) {
            cambios.destino = nuevoEstado();
        }
        cambios.parametros = {
            ...getParametrosPorDefecto(definicion, "calculado"),
            ...sugerirParametros(),
            ...proceso.parametros
        };
        guardar(cambios);
    };

    const selectorEstado = (valor, alCambiar) => (
        <Select
            showSearch
            allowClear
            optionFilterProp="children"
            value={valor ?? undefined}
            placeholder={getTextoUI("proc_sin_asignar")}
            onChange={(nuevo) => alCambiar(nuevo ?? null)}
            style={{ width: "100%" }}
        >
            {listaEstados.map((estado) => (
                <Option key={estado.id} value={estado.id}>
                    {/* El fluido puro se identifica por su nombre; el aire húmedo,
                        por su presión total, que es lo que lo hace o no compatible
                        con los demás estados. */}
                    {estado.nombre} ({estado.fluido ?? `${formatear(estado.P, 4)} kPa`})
                </Option>
            ))}
        </Select>
    );

    // Un proceso conecta tantos estados de origen como diga su aridad: uno en casi
    // todos los tipos, dos en la mezcla adiabática. Cambiar un origen escribe en
    // su posición y deja el resto como estaba.
    const cambiarOrigen = (posicion) => (nuevo) => {
        const origenes = [...proceso.origenes];
        origenes[posicion] = nuevo;
        guardar({ origenes });
    };

    const etiquetaOrigen = (posicion) => (proceso.origenes.length === 1
        ? getTextoUI("proc_origen")
        : `${getTextoUI("proc_origen")} ${posicion + 1}`);

    const parametros = getParametrosVisibles(definicion, proceso.modoDestino);

    return (<Modal
        title={getTextoUI("titulo_editor_proceso")}
        open={verDialogoProceso.get()}
        onOk={() => verDialogoProceso.set(false)}
        onCancel={() => verDialogoProceso.set(false)}
        closable={false}
        width={640}
        footer={[
            <Button key="ok" type="primary" onClick={() => verDialogoProceso.set(false)}>
                OK
            </Button>,
        ]}>

        <Form name="dialogo_proceso" layout="vertical">
            <Row gutter={8}>
                <Col span={14}>
                    <Form.Item
                        label={getTextoUI("proc_tipo")}
                        extra={tipoDetectado && <span className='comentario'>
                            {getTextoUI("proc_detectado")}: {getTextoUI(getDefinicion(tipoDetectado).i18n)}
                            {tipoDetectado !== proceso.tipo && <>
                                {" "}<a onClick={() => cambiarTipo(tipoDetectado)}>{getTextoUI("proc_usar_detectado")}</a>
                            </>}
                        </span>}
                    >
                        <Select
                            showSearch
                            optionFilterProp="children"
                            value={proceso.tipo}
                            onChange={cambiarTipo}
                        >
                            {getDefiniciones(dominio).map((tipo) => (
                                <Option key={tipo.clave} value={tipo.clave}>{getTextoUI(tipo.i18n)}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={10}>
                    <Form.Item
                        label={getTextoUI("proc_modo")}
                        extra={!puedeCalcular(definicion) && <span className='comentario'>
                            {getTextoUI("proc_sin_modo_calculado")}
                        </span>}
                    >
                        <Select value={proceso.modoDestino} onChange={cambiarModo}>
                            <Option value="manual">{getTextoUI("proc_modo_manual")}</Option>
                            {/* Un tipo que no sabe generar su destino no ofrece la
                                opción: elegirla no haría nada. */}
                            <Option value="calculado" disabled={!puedeCalcular(definicion)}>
                                {getTextoUI("proc_modo_calculado")}
                            </Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={8}>
                {proceso.origenes.map((origen, posicion) => (
                    <Col span={12} key={`origen${posicion}`}>
                        <Form.Item label={etiquetaOrigen(posicion)}>
                            {selectorEstado(origen, cambiarOrigen(posicion))}
                        </Form.Item>
                    </Col>
                ))}
                <Col span={12}>
                    <Form.Item
                        label={getTextoUI("proc_destino")}
                        extra={proceso.modoDestino === "calculado"
                            ? <span className='comentario'>{getTextoUI("proc_destino_calculado")}</span>
                            : null}
                    >
                        {selectorEstado(proceso.destino, (nuevo) => guardar({ destino: nuevo }))}
                    </Form.Item>
                </Col>
            </Row>

            {parametros.length > 0 && <Row gutter={8}>
                {parametros.map((parametro) => (
                    <Col span={12} key={parametro.clave}>
                        <Form.Item label={`${getTextoUI(parametro.i18n)} [${parametro.unidad}]`}>
                            <InputNumber
                                style={{ width: "100%" }}
                                min={parametro.min}
                                max={parametro.max}
                                value={proceso.parametros[parametro.clave] ?? null}
                                onChange={(valor) => guardar({
                                    parametros: { ...proceso.parametros, [parametro.clave]: valor }
                                })}
                            />
                        </Form.Item>
                    </Col>
                ))}
            </Row>}

            <Row gutter={8}>
                <Col span={8}>
                    <Form.Item label={getTextoUI("lab_estilo_color")}>
                        <ColorPicker
                            value={proceso.estilo.color}
                            onChange={(_, hex) => guardar({ estilo: { ...proceso.estilo, color: hex } })}
                        />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label={getTextoUI("lab_estilo_grosor")}>
                        <InputNumber
                            style={{ width: "100%" }}
                            min={1}
                            max={8}
                            value={proceso.estilo.grosor}
                            onChange={(valor) => guardar({ estilo: { ...proceso.estilo, grosor: valor } })}
                        />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label={getTextoUI("lab_estilo_trazo")}>
                        <Select
                            value={proceso.estilo.trazo}
                            onChange={(valor) => guardar({ estilo: { ...proceso.estilo, trazo: valor } })}
                        >
                            <Option value="solid">{getTextoUI("trazo_solid")}</Option>
                            <Option value="dashed">{getTextoUI("trazo_dashed")}</Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            {evaluacion.errores.map((error, i) => (
                <Alert
                    key={`e${i}`}
                    type="error"
                    showIcon
                    style={{ marginBottom: 8 }}
                    message={textoMensaje(error, nCifras.get())}
                />
            ))}
            {evaluacion.avisos.map((aviso, i) => (
                <Alert
                    key={`a${i}`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 8 }}
                    message={textoMensaje(aviso, nCifras.get())}
                />
            ))}
        </Form>

    </Modal>
    );
}

export default DialogoProceso;
