import {
  CopyOutlined,
  DeleteOutlined,
  SettingOutlined,
  FileExcelOutlined,
  PlusCircleOutlined
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { Table, ExportTableButton } from 'ant-table-extensions';

import { useHookstate } from '@hookstate/core';
import { configuracion } from '../configuracion';
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
  const conf = useHookstate(configuracion);
  const columnasTabla = conf.columnasTablaAires;
  const nCifras = conf.nCifras;
  const verConfiguracion = conf.verConfiguracion;
  const iActual = conf.iActual;

  const lista = useHookstate(listaAires);
  const filasSeleccionadas = useHookstate([]);

  let columnas = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      sortDirections: ['descend', 'ascend'],
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      key: 'nombre'
    },
    {
      title: 'Altura [m]',
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

  columnasTabla.forEach((columna) => {
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

    columnasTabla.forEach((columna) => {
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
        iActual.set(-1);
      }
    }
  }

  const rowClassName = (record) => {
    return record.key === iActual.get() ? 'selected-row' : '';
  };

  const columnasCsv = columnas.map((a) => ({ ...a }));

  let iInicial = 5;
  columnasTabla.forEach((columna) => {
    if (columna.get() !== "NO") {
      columnasCsv[iInicial].title = TITULO_COLUMNAS_CSV[columna.get()];
      iInicial++;
    }
  });


  return (
    <div>
      <p>  </p>
      <Tooltip title="Nuevo aire húmedo" mouseEnterDelay={1}>
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
            <Tooltip title="Borrar seleccionados" mouseEnterDelay={1}>
              <Button type='link' icon={<DeleteOutlined />} size='large' onClick={() => {
                const filas = [...filasSeleccionadas.get()];
                filasSeleccionadas.set([]);
                borrarAires(filas);
              }}></Button>
            </Tooltip>
            <span>  </span>
            <Tooltip title="Duplicar seleccionados" mouseEnterDelay={1}>
              <Button type='link' icon={<CopyOutlined />} size='large' onClick={() => {
                const filas = [...filasSeleccionadas.get()];
                filasSeleccionadas.set([]);
                duplicarAires(filas);
              }}></Button>
            </Tooltip>
          </span>
      }
      <span>  </span>
      <Tooltip title="Configuración" mouseEnterDelay={1}>
        <Button type='link' icon={<SettingOutlined />} size='large' onClick={() => { verConfiguracion.set(true); }}></Button>
      </Tooltip>
      <ExportTableButton
        dataSource={datos}
        columns={columnasCsv}
        btnProps={{ icon: <FileExcelOutlined /> }}
        fileName="PropiedadesDeFluidos"
        showColumnPicker
      >
        Exportar a CSV
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
            onClick: event => { event.stopPropagation(); iActual.set(record.key); } // click row            
          };
        }}
      />

      {verConfiguracion.get() && <ConfiguracionAires />}
    </div >
  );


}

export default TablaAires;