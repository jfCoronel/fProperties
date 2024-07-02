import React from 'react';
import { Drawer, Form, Select, InputNumber } from 'antd';

import { useState } from '@hookstate/core';
import { configuracion } from '../configuracion';

const ConfiguracionFluidos = () => {
  const conf = useState(configuracion);
  const columnasTabla = conf.columnasTablaAires;
  const nCifras = conf.nCifras;
  const verConfiguracion = conf.verConfiguracion;

  const { Option } = Select;

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 8 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 16 },
    }
  }

  const OPCIONES = (<>
    <Option value='RO'>Densidad, ρ[kg/m³]</Option>
    <Option value='HR'>Humedad rel., ϕ[%]</Option>
    <Option value='TH'>Temp. húmeda, T<sub>H</sub>[°C]</Option>
    <Option value='TR'>Temp. de rocío, T<sub>R</sub>[°C]</Option>
    <Option value='H'>Entalpía, h[kJ/kg]</Option>
    <Option value='S'>Entropía, s[kJ/(kg·K)]</Option>
    <Option value='V'>Volumen esp., v[m³/kg]</Option>
    <Option value='CP'>Calor esp., c<sub>p</sub>[J/(kg·K)]</Option>
    <Option value='NO'>NO INCLUIR</Option>
  </>);

  return (
    <Drawer
      width={400}
      title="Configuración"
      placement="left"
      closable={false}
      onClose={() => { verConfiguracion.set(false); }}
      visible={verConfiguracion.get()}
    >
      <Form {...formItemLayout} >
        <Form.Item label="Nº cifras sig.">
          <InputNumber
            min={0}
            max={10}
            defaultValue={nCifras.get()}
            onChange={(value) => {
              if (Number.isInteger(value)) {
                if (value >= 0) {
                  nCifras.set(value);
                }
              }
            }}
          />
        </Form.Item>
        <Form.Item label="Columna nº 6">
          <Select
            showSearch
            defaultValue={columnasTabla[0].get()}
            onChange={(value) => { columnasTabla[0].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label="Columna nº 7">
          <Select
            showSearch
            defaultValue={columnasTabla[1].get()}
            onChange={(value) => { columnasTabla[1].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label="Columna nº 8">
          <Select
            showSearch
            defaultValue={columnasTabla[2].get()}
            onChange={(value) => { columnasTabla[2].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label="Columna nº 9">
          <Select
            showSearch
            defaultValue={columnasTabla[3].get()}
            onChange={(value) => { columnasTabla[3].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label="Columna nº 10">
          <Select
            showSearch
            defaultValue={columnasTabla[4].get()}
            onChange={(value) => { columnasTabla[4].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label="Columna nº 11">
          <Select
            showSearch
            defaultValue={columnasTabla[5].get()}
            onChange={(value) => { columnasTabla[5].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label="Columna nº 12">
          <Select
            showSearch
            defaultValue={columnasTabla[6].get()}
            onChange={(value) => { columnasTabla[6].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
      </Form>
    </Drawer>
  );


}

export default ConfiguracionFluidos;