import { useHookstate } from '@hookstate/core';
import { Modal, Button, Row, Col, Select, InputNumber, Form, ColorPicker, Alert } from 'antd'
import { configuracion, getTextoUI } from '../configuracion';
import { listaFluidos, nuevoFluido } from '../listaFluidos';
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
import { getRendimientoIsentropico } from '../procesos/resolvedores';
import { textoMensaje } from '../procesos/mensajes';
import formatear from '../util/formatear';

const { Option } = Select;

const DialogoProceso = () => {
    const procesos = useHookstate(listaProcesos);
    const estados = useHookstate(listaFluidos);
    const { idProcesoActual, verDialogoProceso, nCifras } = useHookstate(configuracion);

    const id = idProcesoActual.get();
    const fila = procesos.get({ noproxy: true }).findIndex((p) => p.id === id);

    if (fila < 0) {
        return (<></>);
    }

    const proceso = procesos[fila].get({ noproxy: true });
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
        ? detectarTipo(evaluacion.origenes[0], evaluacion.destino)
        : null;

    const redondear = (valor) => Number(formatear(valor, nCifras.get()));

    // Al pasar a calculado, los parámetros que hasta ahora eran resultado se
    // convierten en entrada: se rellenan con lo que ya describía la pareja de
    // estados, de modo que el punto no salte al cambiar de modo.
    const sugerirParametros = () => {
        const origen = listaEstados.find((estado) => estado.id === proceso.origenes[0]);
        const estadoDestino = listaEstados.find((estado) => estado.id === proceso.destino);
        if (!origen || !estadoDestino) return {};

        const claves = definicion.parametros.map((parametro) => parametro.clave);
        const sugerencias = {};
        if (claves.includes("p_final")) sugerencias.p_final = redondear(estadoDestino.P);
        if (claves.includes("t_final")) sugerencias.t_final = redondear(estadoDestino.T);
        if (claves.includes("q_dato")) sugerencias.q_dato = redondear(estadoDestino.H - origen.H);
        if (claves.includes("dp_dato")) {
            sugerencias.dp_dato = redondear(Math.max(0, origen.P - estadoDestino.P));
        }
        if (claves.includes("eta")) {
            const rendimiento = getRendimientoIsentropico(origen, estadoDestino);
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
            cambios.destino = nuevoFluido();
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
                    {estado.nombre} ({estado.fluido})
                </Option>
            ))}
        </Select>
    );

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
                            {getDefiniciones('fluido').map((tipo) => (
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
                <Col span={12}>
                    <Form.Item label={getTextoUI("proc_origen")}>
                        {selectorEstado(proceso.origenes[0], (nuevo) => guardar({ origenes: [nuevo] }))}
                    </Form.Item>
                </Col>
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
