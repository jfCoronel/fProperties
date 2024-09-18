import { useHookstate } from '@hookstate/core';
import { Modal, Button, Row, Col, Select, Input, InputNumber, Form } from 'antd'
import { configuracion, getTextoUI } from '../configuracion';
import { listaAires, actualizarAire } from '../listaAires';

const { Option } = Select;

const DialogoAire = () => {
    const lista = useHookstate(listaAires);
    const { iAireActual, verDialogoAire } = useHookstate(configuracion);
    const fila = iAireActual.get();

    let aire = undefined
    if (fila >= 0) {
        aire = {
            nombre: lista[fila].nombre.get(),
            in1Id: lista[fila].in1Id.get(),
            in2Id: lista[fila].in2Id.get(),
            in3Id: lista[fila].in3Id.get(),
            in1Val: lista[fila].in1Val.get(),
            in2Val: lista[fila].in2Val.get(),
            in3Val: lista[fila].in3Val.get()
        }
    }

    const handleOk = () => {
        verDialogoAire.set(false);
    };
    const handleCancel = () => {
        verDialogoAire.set(false);
    };

    if (fila >= 0) {
        return (<Modal
            title={getTextoUI("titulo_editor_aire")}
            open={verDialogoAire.get()}
            onOk={handleOk}
            onCancel={handleCancel}
            closable={false}
            width={640}
            footer={[
                <Button key="ok" type="primary" onClick={handleOk}>
                    OK
                </Button>,
            ]}>
            <Form name="editor_fluidos">
                <Row gutter={8}>
                    <Col span={24}>
                        <Form.Item
                            label={getTextoUI("lab_nombre")}
                        >
                            <Input
                                value={aire.nombre}
                                onChange={(e) => {
                                    aire.nombre = e.target.value;
                                    actualizarAire(fila, aire);
                                }}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={8}>

                    <Col span={14}>
                        <Form.Item
                            label={getTextoUI("lab_prop_1")}
                        >
                            <Select
                                showSearch
                                value={aire.in1Id}
                                onChange={(value) => {
                                    aire.in1Id = value;
                                    actualizarAire(fila, aire);
                                }}
                            >
                                <Option value="A">{getTextoUI("tabla_altura")}</Option>
                                <Option value="P">p [kPa]</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={10}>
                        <InputNumber
                            style={{ width: "100%" }}
                            value={aire.in1Val}
                            onChange={(value) => {
                                aire.in1Val = value;
                                actualizarAire(fila, aire);
                            }}
                        />
                    </Col>
                </Row>
                <Row gutter={8}>
                    <Col span={14}>
                        <Form.Item
                            label={getTextoUI("lab_prop_2")}
                        >
                            <Select
                                showSearch
                                value={aire.in2Id}
                                onChange={(value) => {
                                    aire.in2Id = value;
                                    actualizarAire(fila, aire);
                                }}
                            >
                                <Option value="T">T [ºC]</Option>
                                <Option value="W">w [g/kg as]</Option>
                                <Option value="H">h [kJ/kg as]</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={10}>
                        <InputNumber
                            style={{ width: "100%" }}
                            value={aire.in2Val}
                            onChange={(value) => {
                                aire.in2Val = value;
                                actualizarAire(fila, aire);
                            }}
                        />
                    </Col>
                </Row>
                <Row gutter={8}>
                    <Col span={14}>
                        <Form.Item
                            label={getTextoUI("lab_prop_3")}
                        >
                            <Select
                                showSearch
                                value={aire.in3Id}
                                onChange={(value) => {
                                    aire.in3Id = value;
                                    actualizarAire(fila, aire);
                                }}
                            >
                                <Option value="T">T [ºC]</Option>
                                <Option value="TH">T<sub>H</sub> [ºC]</Option>
                                <Option value="TR">T<sub>R</sub> [ºC]</Option>
                                <Option value="W">w [g/kg as]</Option>
                                <Option value="HR">HR [%]</Option>
                                <Option value="H">h [kJ/kg as]</Option>
                                <Option value="S">s [kJ/(kg as·K)]</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={10}>
                        <InputNumber
                            style={{ width: "100%" }}
                            value={aire.in3Val}
                            onChange={(value) => {
                                aire.in3Val = value;
                                actualizarAire(fila, aire);
                            }}
                        />
                    </Col>
                </Row>
            </Form>

        </Modal>
        );
    } else {
        return (<></>)
    }
}

export default DialogoAire;