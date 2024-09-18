import {
  CopyOutlined,
  DeleteOutlined,
  SettingOutlined,
  FileExcelOutlined,
  PlusCircleOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { Button, Tooltip, Switch } from 'antd';
import { Table, ExportTableButton } from 'ant-table-extensions';

import { useHookstate } from '@hookstate/core';
import { configuracion, getTextoUI } from '../configuracion';
import { listaAires, nuevoAire, borrarAires, duplicarAires } from '../listaAires';
import formatear from '../util/formatear';
import ConfiguracionAires from './ConfiguracionAires';

const TITULO_COLUMNAS = {
  'RO': 'ρ [kg/m³]',
  'V': 'v [m³/kg]',
  'H': 'h [kJ/kg]',
  'TH': 'T<sub>H</sub> [°C]',
  'TR': 'T<sub>R</sub> [°C]',
  'S': 's [kJ/(kg·K)]',
  'HR': 'ϕ [%]',
  'CP': 'c<sub>p</sub> [J/(kg·K)]'
}
const TITULO_COLUMNAS_CSV = {
  'RO': 'ρ [kg/m³]',
  'V': 'v [m³/kg]',
  'H': 'h [kJ/kg]',
  'TH': 'T_H [°C]',
  'TR': 'T_R [°C]',
  'S': 's [kJ/(kg·K)]',
  'HR': 'ϕ [%]',
  'CP': 'c_p [J/(kg·K)]'
}
const NOMBRE_COLUMNAS = {
  'RO': 'densidad',
  'V': 'volumen',
  'H': 'entalpia',
  'TH': 'temperaturaHumeda',
  'TR': 'temperaturaRocio',
  'S': 'entropia',
  'HR': 'humedadRelativa',
  'CP': 'cp'
}

const TablaAires = () => {
  const { iAireActual, columnasTablaAires, nCifras, verConfiguracion, verPsicrometrico, verDialogoAire } = useHookstate(configuracion);


  const lista = useHookstate(listaAires);
  const filasSeleccionadas = useHookstate([]);

  let columnas = [
    {
      title: getTextoUI("tabla_nombre"),
      dataIndex: 'nombre',
      sortDirections: ['descend', 'ascend'],
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      key: 'nombre',
      render: (text, record) => <a onClick={(event) => { event.stopPropagation(); iAireActual.set(record.key); verDialogoAire.set(true) }} >{text}</a>,
    },
    {
      title: getTextoUI("tabla_altura"),
      dataIndex: 'altura',
      key: 'altura',
    },
    {
      title: 'p [kPa]',
      dataIndex: 'presion',
      key: 'presion',
    },
    {
      title: 'T [°C]',
      dataIndex: 'temperatura',
      key: 'temperatura',
    },
    {
      title: 'w [g/kg]',
      dataIndex: 'humedadAbsoluta',
      key: 'humedadAbsoluta',
    }
  ];

  columnasTablaAires.forEach((columna) => {
    if (columna.get() !== "NO") {
      const nuevaColumna = {
        title: <div dangerouslySetInnerHTML={{ __html: TITULO_COLUMNAS[columna.get()] }} />,
        dataIndex: NOMBRE_COLUMNAS[columna.get()],
        key: NOMBRE_COLUMNAS[columna.get()]
      }
      columnas.push(nuevaColumna);
    }
  })

  const datos = lista.map((aire, i) => {
    let dato = {
      key: i,
      nombre: aire.nombre.get(),
      altura: formatear(aire.A.get(), nCifras.get()),
      presion: formatear(aire.P.get(), nCifras.get()),
      temperatura: formatear(aire.T.get(), nCifras.get()),
      humedadAbsoluta: formatear(aire.W.get(), nCifras.get())
    }

    columnasTablaAires.forEach((columna) => {
      if (columna.get() !== "NO") {
        dato[NOMBRE_COLUMNAS[columna.get()]] = formatear(aire[columna.get()].get(), nCifras.get());
      }
    });

    return dato;
  });

  const seleccionFilas = {
    selectedRowKeys: filasSeleccionadas.get(),
    onChange: (selectedRowKeys) => {
      filasSeleccionadas.set(selectedRowKeys);
      if (selectedRowKeys.length > 0) {
        iAireActual.set(-1);
      }
    }
  }

  const rowClassName = (record) => {
    return record.key === iAireActual.get() ? 'selected-row' : '';
  };

  const columnasCsv = columnas.map((a) => ({ ...a }));

  let iInicial = 5;
  columnasTablaAires.forEach((columna) => {
    if (columna.get() !== "NO") {
      columnasCsv[iInicial].title = TITULO_COLUMNAS_CSV[columna.get()];
      iInicial++;
    }
  });


  return (
    <div>
      <p>  </p>
      <Tooltip title={getTextoUI("tooltip_nuevo_aire")} mouseEnterDelay={1}>
        <Button type='link' icon={<PlusCircleOutlined />} size='large' onClick={() => nuevoAire()}></Button>
      </Tooltip>
      <span>  </span>

      {
        (filasSeleccionadas.length === 0) ?
          <span><Button type='link' icon={<DeleteOutlined />} size='large' disabled></Button>
            <span>  </span>
            <Button type='link' icon={<CopyOutlined />} size='large' disabled></Button>
          </span>
          : <span>
            <Tooltip title={getTextoUI("tooltip_borrar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<DeleteOutlined />} size='large' onClick={() => {
                const filas = [...filasSeleccionadas.get()];
                filasSeleccionadas.set([]);
                borrarAires(filas);
              }}></Button>
            </Tooltip>
            <span>  </span>
            <Tooltip title={getTextoUI("tooltip_duplicar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<CopyOutlined />} size='large' onClick={() => {
                const filas = [...filasSeleccionadas.get()];
                filasSeleccionadas.set([]);
                duplicarAires(filas);
              }}></Button>
            </Tooltip>
          </span>
      }
      <span>  </span>
      <Tooltip title={getTextoUI("tooltip_configuracion")} mouseEnterDelay={1}>
        <Button type='link' icon={<SettingOutlined />} size='large' onClick={() => { verConfiguracion.set(true); }}></Button>
      </Tooltip>
      <span>  </span>
      <Tooltip title={getTextoUI("tooltip_psicrometrico")} mouseEnterDelay={1}>
        <Switch
          checkedChildren={<LineChartOutlined />}
          unCheckedChildren={<LineChartOutlined />}
          defaultChecked={false}
          onClick={() => { verPsicrometrico.set(!verPsicrometrico.get()); }}
        />
      </Tooltip>
      <span>  </span>
      <ExportTableButton
        dataSource={datos}
        columns={columnasCsv}
        btnProps={{ icon: <FileExcelOutlined /> }}
        fileName="fProperties"
        showColumnPicker
      >
        {getTextoUI("btn_exportar_csv")}
      </ExportTableButton>
      <p> </p>
      <Table
        rowSelection={seleccionFilas}
        columns={columnas}
        dataSource={datos}
        rowClassName={rowClassName}
        pagination={{
          showSizeChanger: true,
          defaultPageSize: 5,
          pageSizeOptions: [5, 10, 100]
        }}
        onRow={(record, rowIndex) => {
          return {
            onDoubleClick: event => { iAireActual.set(record.key); verDialogoAire.set(true) } // click row            
          };
        }}
      />

      {verConfiguracion.get() && <ConfiguracionAires />}
    </div >
  );


}

export default TablaAires;