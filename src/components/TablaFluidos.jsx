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
import { configuracion, getTextoUI } from '../configuracion';
import { listaFluidos, nuevoFluido, borrarFluidos, duplicarFluidos } from '../listaFluidos';
import formatear from '../util/formatear';
import ConfiguracionFluidos from './ConfiguracionFluidos';



const TITULO_COLUMNAS = {
  'X': 'X [%]',
  'RO': 'ρ [kg/m³]',
  'V': 'v [m³/kg]',
  'H': 'h [kJ/kg]',
  'U': 'u [kJ/kg]',
  'S': 's [kJ/(kg·K)]',
  'CP': 'c<sub>p</sub> [J/(kg·K)]',
  'CV': 'c<sub>v</sub> [J/(kg·K)]',
  'K': 'k [W/(m·K)]',
  'PR': 'Pr [-]',
  'MU': 'μ [Pa·s]',
  'NU': 'ν [m²/s]',
  'ALFA': 'α [m²/s]',
  'BETA': 'β [1/K]',
  'M': 'M [kg/mol]',
  'TCRIT': 'T<sub>crit</sub> [°C]',
  'PCRIT': 'p<sub>crit</sub> [kPa]',
  'TTRIPLE': 'T<sub>trip</sub> [°C]',
  'PTRIPLE': 'p<sub>trip</sub> [kPa]',
}
const TITULO_COLUMNAS_CSV = {
  'X': 'X [%]',
  'RO': 'ρ [kg/m³]',
  'V': 'v [m³/kg]',
  'H': 'h [kJ/kg]',
  'U': 'u [kJ/kg]',
  'S': 's [kJ/(kg·K)]',
  'CP': 'c_p [J/(kg·K)]',
  'CV': 'c_v[J/(kg·K)]',
  'K': 'k [W/(m·K)]',
  'PR': 'Pr [-]',
  'MU': 'μ [Pa·s]',
  'NU': 'ν [m²/s]',
  'ALFA': 'α [m²/s]',
  'BETA': 'β [1/K]',
  'M': 'M [kg/mol]',
  'TCRIT': 'T_crit [°C]',
  'PCRIT': 'p_crit [kPa]',
  'TTRIPLE': 'T_trip [°C]',
  'PTRIPLE': 'p_trip [kPa]',
}
const NOMBRE_COLUMNAS = {
  'X': 'tituloVapor',
  'RO': 'densidad',
  'V': 'volumenEspecifico',
  'H': 'entalpia',
  'U': 'energiaInterna',
  'S': 'entropia',
  'CP': 'cp',
  'CV': 'cv',
  'K': 'conductividad',
  'PR': 'prandtl',
  'MU': 'viscosidad',
  'NU': 'viscosidadCinematica',
  'ALFA': 'difusividad',
  'BETA': 'coefExpansion',
  'M': 'masaMolar',
  'TCRIT': 'TCritica',
  'PCRIT': 'pCritica',
  'TTRIPLE': 'TTriple',
  'PTRIPLE': 'pTriple',
}

const TablaFluidos = () => {
  const { iFluidoActual, columnasTablaFluidos, nCifras, verConfiguracion, verDialogoFluido } = useHookstate(configuracion);

  const lista = useHookstate(listaFluidos);
  const filasSeleccionadas = useHookstate([]);

  let columnas = [
    {
      title: getTextoUI("tabla_nombre"),
      dataIndex: 'nombre',
      sortDirections: ['descend', 'ascend'],
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      key: 'nombre',
      render: (text, record) => <a onClick={(event) => { event.stopPropagation(); iFluidoActual.set(record.key); verDialogoFluido.set(true) }} >{text}</a>,
    },
    {
      title: getTextoUI("tabla_fluido"),
      dataIndex: 'fluido',
      key: 'fluido',
    },
    {
      title: getTextoUI("tabla_fase"),
      dataIndex: 'fase',
      key: 'fase',
    },
    {
      title: 'T [°C]',
      dataIndex: 'temperatura',
      key: 'temperatura',
    },
    {
      title: 'p [kPa]',
      dataIndex: 'presion',
      key: 'presion',
    }
  ];

  columnasTablaFluidos.forEach((columna) => {
    if (columna.get() !== "NO") {
      const nuevaColumna = {
        title: <div dangerouslySetInnerHTML={{ __html: TITULO_COLUMNAS[columna.get()] }} />,
        dataIndex: NOMBRE_COLUMNAS[columna.get()],
        key: NOMBRE_COLUMNAS[columna.get()]
      }
      columnas.push(nuevaColumna);
    }
  })



  const datos = lista.map((fluido, i) => {
    let dato = {
      key: i,
      nombre: fluido.nombre.get(),
      fluido: fluido.fluido.get(),
      fase: fluido.ESTADO.get(),
      temperatura: formatear(fluido.T.get(), nCifras.get()),
      presion: formatear(fluido.P.get(), nCifras.get())
    }

    columnasTablaFluidos.forEach((columna) => {
      if (columna.get() !== "NO") {
        dato[NOMBRE_COLUMNAS[columna.get()]] = formatear(fluido[columna.get()].get(), nCifras.get());
      }
    });

    return dato;
  });

  const seleccionFilas = {
    selectedRowKeys: filasSeleccionadas.get(),
    onChange: (selectedRowKeys) => {
      filasSeleccionadas.set(selectedRowKeys);
      if (selectedRowKeys.length > 0) {
        iFluidoActual.set(-1);
      }
    }
  }

  const rowClassName = (record) => {
    return record.key === iFluidoActual.get() ? 'selected-row' : '';
  };

  const columnasCsv = columnas.map((a) => ({ ...a }));

  let iInicial = 5;
  columnasTablaFluidos.forEach((columna) => {
    if (columna.get() !== "NO") {
      columnasCsv[iInicial].title = TITULO_COLUMNAS_CSV[columna.get()];
      iInicial++;
    }
  });

  return (
    <div>
      <p>  </p>
      <Tooltip title={getTextoUI("tooltip_nuevo_fluido")} mouseEnterDelay={1}>
        <Button type='link' icon={<PlusCircleOutlined />} size='large' onClick={() => nuevoFluido()}></Button>
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
                borrarFluidos(filas);
              }}></Button>
            </Tooltip>
            <span>  </span>
            <Tooltip title={getTextoUI("tooltip_duplicar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<CopyOutlined />} size='large' onClick={() => {
                const filas = [...filasSeleccionadas.get()];
                filasSeleccionadas.set([]);
                duplicarFluidos(filas);
              }}></Button>
            </Tooltip>
          </span>
      }
      <span>  </span>
      <Tooltip title={getTextoUI("tooltip_configuracion")} mouseEnterDelay={1}>
        <Button type='link' icon={<SettingOutlined />} size='large' onClick={() => { verConfiguracion.set(true); }}></Button>
      </Tooltip>
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
            onDoubleClick: event => { iFluidoActual.set(record.key); verDialogoFluido.set(true) } // click row            
          };
        }}
      />

      {verConfiguracion.get() && <ConfiguracionFluidos />}
    </div >
  );


}

export default TablaFluidos;