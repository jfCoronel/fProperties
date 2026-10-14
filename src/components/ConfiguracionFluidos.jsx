import { Drawer, Form, Select, InputNumber } from 'antd';

import { useHookstate } from '@hookstate/core';
import { configuracion, getTextoUI } from '../configuracion';
import { listaFluidos } from '../listaFluidos';
import { REFERENCIAS_HS, tieneReferencia } from '../propFluidos/fluidos';
import { cambiarReferenciaHS } from '../referenciaHS';

const ConfiguracionFluidos = () => {
  const conf = useHookstate(configuracion);
  const columnasTabla = conf.columnasTablaFluidos;
  const nCifras = conf.nCifras;
  const verConfiguracion = conf.verConfiguracion;
  const lista = useHookstate(listaFluidos);

  // Los fluidos de la tabla que no tienen el estado de la referencia elegida
  // (0 ºC por encima de su crítica, sin líquido a 1 atm...) van con la de CoolProp
  const referencia = conf.referenciaHS.get();
  const sinReferencia = [...new Set(lista.get({ noproxy: true }).map((estado) => estado.fluido))]
    .filter((fluido) => !tieneReferencia(fluido, referencia));

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
    <Option value='X'>{getTextoUI("prop_X")}</Option>
    <Option value='RO'>{getTextoUI("prop_RO")}</Option>
    <Option value='V'>{getTextoUI("prop_V")}</Option>
    <Option value='H'>{getTextoUI("prop_H")}</Option>
    <Option value='U'>{getTextoUI("prop_U")}</Option>
    <Option value='S'>{getTextoUI("prop_S")}</Option>
    <Option value='CP'>{getTextoUI("prop_CP")}</Option>
    <Option value='CV'>{getTextoUI("prop_CV")}</Option>
    <Option value='K'>{getTextoUI("prop_K")}</Option>
    <Option value='PR'>{getTextoUI("prop_PR")}</Option>
    <Option value='MU'>{getTextoUI("prop_MU")}</Option>
    <Option value='NU'>{getTextoUI("prop_NU")}</Option>
    <Option value='ALFA'>{getTextoUI("prop_ALFA")}</Option>
    <Option value='BETA'>{getTextoUI("prop_BETA")}</Option>
    <Option value='M'>{getTextoUI("prop_M")}</Option>
    <Option value='TCRIT'>{getTextoUI("prop_TCRIT")}</Option>
    <Option value='PCRIT'>{getTextoUI("prop_PCRIT")}</Option>
    <Option value='TTRIPLE'>{getTextoUI("prop_TTRIPLE")}</Option>
    <Option value='PTRIPLE'>{getTextoUI("prop_PTRIPLE")}</Option>
    <Option value='NO'>{getTextoUI("prop_NO")}</Option>
  </>);

  return (
    <Drawer
      width={400}
      title={getTextoUI("tooltip_configuracion")}
      placement="left"
      closable={false}
      onClose={() => { verConfiguracion.set(false); }}
      open={verConfiguracion.get()}
    >
      <Form {...formItemLayout} >
        <Form.Item label={getTextoUI("lab_n_cifras")}>
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
        <Form.Item label={getTextoUI("lab_columna_n") + "6"}>
          <Select
            showSearch
            defaultValue={columnasTabla[0].get()}
            onChange={(value) => { columnasTabla[0].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label={getTextoUI("lab_columna_n") + "7"}>
          <Select
            showSearch
            defaultValue={columnasTabla[1].get()}
            onChange={(value) => { columnasTabla[1].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label={getTextoUI("lab_columna_n") + "8"}>
          <Select
            showSearch
            defaultValue={columnasTabla[2].get()}
            onChange={(value) => { columnasTabla[2].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label={getTextoUI("lab_columna_n") + "9"}>
          <Select
            showSearch
            defaultValue={columnasTabla[3].get()}
            onChange={(value) => { columnasTabla[3].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label={getTextoUI("lab_columna_n") + "10"}>
          <Select
            showSearch
            defaultValue={columnasTabla[4].get()}
            onChange={(value) => { columnasTabla[4].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label={getTextoUI("lab_columna_n") + "11"}>
          <Select
            showSearch
            defaultValue={columnasTabla[5].get()}
            onChange={(value) => { columnasTabla[5].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item label={getTextoUI("lab_columna_n") + "12"}>
          <Select
            showSearch
            defaultValue={columnasTabla[6].get()}
            onChange={(value) => { columnasTabla[6].set(value); }}
          >
            {OPCIONES}
          </Select>
        </Form.Item>
        <Form.Item
          label={getTextoUI("lab_referencia_hs")}
          extra={<>
            {getTextoUI(`ayuda_ref_${referencia}`)}
            {sinReferencia.length > 0 && (
              <div style={{ color: '#d46b08', marginTop: 4 }}>
                {getTextoUI("aviso_sin_referencia")}: {sinReferencia.join(', ')}
              </div>
            )}
          </>}
        >
          <Select value={referencia} onChange={cambiarReferenciaHS}>
            {REFERENCIAS_HS.map((clave) => (
              <Option key={clave} value={clave}>{getTextoUI(`ref_${clave}`)}</Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Drawer>
  );


}

export default ConfiguracionFluidos;