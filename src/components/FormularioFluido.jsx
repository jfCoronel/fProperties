import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, Input, InputNumber, Form } from 'antd'
import { configuracion, getTextoUI } from '../configuracion';
import { listaFluidos, actualizarFluido } from '../listaFluidos';
import { getListaFluidos } from '../propFluidos/fluidos';

const { Option } = Select;

const FormularioFluido = () => {
    const lista = useHookstate(listaFluidos);
    const { iActual } = useHookstate(configuracion);
    const fila = iActual.get();

    let fluido = {
        nombre: lista[fila].nombre.get(),
        fluido: lista[fila].fluido.get(),
        in1Id: lista[fila].in1Id.get(),
        in2Id: lista[fila].in2Id.get(),
        in1Val: lista[fila].in1Val.get(),
        in2Val: lista[fila].in2Val.get()
    }

    return (
        <div className="editor-fila">
            <Form name="editor_fluidos">
                <Row gutter={8}>
                    <Col span={12}>
                        <Form.Item
                            label={getTextoUI("lab_nombre")}
                        >
                            <Input
                                value={fluido.nombre}
                                onChange={(e) => {
                                    fluido.nombre = e.target.value;
                                    actualizarFluido(fila, fluido);
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label={getTextoUI("lab_fluido")}
                        >
                            <Select
                                showSearch
                                value={fluido.fluido}
                                onChange={(value) => {
                                    fluido.fluido = value;
                                    actualizarFluido(fila, fluido);
                                }}
                            >
                                {getListaFluidos().map((fluido) => (<Option key={fluido} value={fluido}>{fluido}</Option>))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={8}>
                    <Col span={9}>
                        <Form.Item
                            label={getTextoUI("lab_prop_1")}
                        >
                            <Select
                                showSearch
                                value={fluido.in1Id}
                                onChange={(value) => {
                                    fluido.in1Id = value;
                                    actualizarFluido(fila, fluido);
                                }}
                            >
                                <Option value="T">T [ºC]</Option>
                                <Option value="P">p [kPa]</Option>
                                <Option value="X">X [%]</Option>
                                <Option value="RO">ρ [kg/m³]</Option>
                                <Option value="H">h [kJ/kg]</Option>
                                <Option value="S">s [kJ/(kg·K)]</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={3}>
                        <InputNumber
                            style={{ width: "100%" }}
                            value={fluido.in1Val}
                            onChange={(value) => {
                                fluido.in1Val = value;
                                actualizarFluido(fila, fluido);
                            }}
                        />
                    </Col>
                    <Col span={9}>
                        <Form.Item
                            label={getTextoUI("lab_prop_2")}
                        >
                            <Select
                                showSearch
                                value={fluido.in2Id}
                                onChange={(value) => {
                                    fluido.in2Id = value;
                                    actualizarFluido(fila, fluido);
                                }}
                            >
                                <Option value="T">T [ºC]</Option>
                                <Option value="P">p [kPa]</Option>
                                <Option value="X">X [%]</Option>
                                <Option value="RO">ρ [kg/m³]</Option>
                                <Option value="H">h [kJ/kg]</Option>
                                <Option value="S">s [kJ/(kg·K)]</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={3}>
                        <InputNumber
                            style={{ width: "100%" }}
                            value={fluido.in2Val}
                            onChange={(value) => {
                                fluido.in2Val = value;
                                actualizarFluido(fila, fluido);
                            }}
                        />
                    </Col>
                </Row>
            </Form>
            <p></p>
        </div >
    );


}

export default FormularioFluido;