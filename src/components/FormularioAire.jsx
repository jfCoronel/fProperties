import { useHookstate } from '@hookstate/core';
import { Row, Col, Select, Input, InputNumber } from 'antd'
import { configuracion } from '../configuracion';
import { listaAires, actualizarAire } from '../listaAires';

const { Option } = Select;

const FormularioAire = () => {
    const lista = useHookstate(listaAires);
    const { iActual } = useHookstate(configuracion);
    const fila = iActual.get();

    let aire = {
        nombre: lista[fila].nombre.get(),
        in1Id: lista[fila].in1Id.get(),
        in2Id: lista[fila].in2Id.get(),
        in3Id: lista[fila].in3Id.get(),
        in1Val: lista[fila].in1Val.get(),
        in2Val: lista[fila].in2Val.get(),
        in3Val: lista[fila].in3Val.get()
    }


    return (<div>
        <Row gutter={8} className="grande">
            AIRE HÚMEDO:
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
                    value={aire.nombre}
                    onChange={(e) => {
                        aire.nombre = e.target.value;
                        actualizarAire(fila, aire);
                    }}
                />
            </Col>
        </Row>

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
                    value={aire.in1Id}
                    onChange={(value) => {
                        aire.in1Id = value;
                        actualizarAire(fila, aire);
                    }}
                >
                    <Option value="A">Altura [m]</Option>
                    <Option value="P">p [kPa]</Option>
                </Select>
            </Col>
            <Col span={12} >
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
            </Col>
            <Col span={12} >
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
            <Col span={12} className="etiqueta">
                3ª propiedad
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
            </Col>
            <Col span={12} >
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
    </div >);



}

export default FormularioAire;