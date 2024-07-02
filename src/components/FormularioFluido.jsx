import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, Input, InputNumber } from 'antd'
import { configuracion } from '../configuracion';
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
        <div>
            <Row gutter={8} className="grande">
                FLUIDO:
            </Row>
            <Row gutter={8}>
                <Col span={24} className="etiqueta">
                    Nombre
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Input
                        size="large"
                        value={fluido.nombre}
                        onChange={(e) => {
                            fluido.nombre = e.target.value;
                            actualizarFluido(fila, fluido);
                        }}
                    />
                </Col>
            </Row>

            <div className="etiqueta">Fluido</div>
            <Select
                showSearch
                style={{ width: "300px" }}
                value={fluido.fluido}
                onChange={(value) => {
                    fluido.fluido = value;
                    actualizarFluido(fila, fluido);
                }}
            >
                {getListaFluidos().map((fluido) => (<Option key={fluido} value={fluido}>{fluido}</Option>))}
            </Select>

            <Row gutter={8}>
                <Col span={12} className="etiqueta">
                    1º propiedad
                </Col>
                <Col span={12} className="etiqueta">
                    Valor
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <Select
                        showSearch
                        style={{ width: "150px" }}
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
                </Col>
                <Col span={12} >
                    <InputNumber
                        style={{ width: "100%" }}
                        value={fluido.in1Val}
                        onChange={(value) => {
                            fluido.in1Val = value;
                            actualizarFluido(fila, fluido);
                        }}
                    />
                </Col>
            </Row>

            <Row gutter={8}>
                <Col span={12} className="etiqueta">
                    2ª propiedad
                </Col>
                <Col span={12} className="etiqueta">
                    Valor
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <Select
                        showSearch
                        style={{ width: "150px" }}
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
                </Col>
                <Col span={12} >
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
            <p></p>

        </div >

    );


}

export default FormularioFluido;