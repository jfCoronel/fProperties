import {
  CopyOutlined,
  DeleteOutlined,
  SettingOutlined,
  FileExcelOutlined,
  PlusCircleOutlined,
  LineChartOutlined,
  HolderOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { Button, Tooltip, Switch, Table } from 'antd';
import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useHookstate } from '@hookstate/core';
import { configuracion, getTextoUI, descargarTablaCSV } from '../configuracion';
import { listaFluidos, nuevoFluido, borrarFluidos, duplicarFluidos, reordenarFluidos } from '../listaFluidos';
import { listaProcesos, idsEstadosDeProcesos } from '../procesos/listaProcesos';
import { esDerivado } from '../procesos/propagacion';
import formatear from '../util/formatear';
import ConfiguracionFluidos from './ConfiguracionFluidos';



// Componente DragHandle que se renderiza en cada fila
const DragHandle = ({ rowKey }) => {
  const { attributes, listeners, setActivatorNodeRef } = useSortable({ id: rowKey });

  return (
    <HolderOutlined
      ref={setActivatorNodeRef}
      style={{ cursor: 'move', marginRight: 8, touchAction: 'none' }}
      {...attributes}
      {...listeners}
    />
  );
};

// Componente para fila arrastrable
const FilaArrastrable = ({ children, ...props }) => {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });

  const style = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style}>
      {children}
    </tr>
  );
};

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
  const { idFluidoActual, columnasTablaFluidos, nCifras, verConfiguracion, verDialogoFluido,
    verDiagrama, fluidosSeleccionados, procesosSeleccionados } = useHookstate(configuracion);

  const lista = useHookstate(listaFluidos);
  useHookstate(listaProcesos); // la incidencia estado ↔ proceso cambia con la lista

  // Estados generados por un proceso en modo calculado. Va aparte de las filas
  // para no colarse como una columna más en el CSV.
  const derivados = new Set(
    lista.get({ noproxy: true }).filter(esDerivado).map((estado) => estado.id)
  );

  let columnas = [
    {
      title: getTextoUI("tabla_nombre"),
      dataIndex: 'nombre',
      sortDirections: ['descend', 'ascend'],
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
      key: 'nombre',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DragHandle rowKey={record.key} />
          <a onClick={(event) => { event.stopPropagation(); idFluidoActual.set(record.key); verDialogoFluido.set(true) }} >{text}</a>
          {derivados.has(record.key) && <Tooltip title={getTextoUI("tooltip_estado_derivado")}>
            <CalculatorOutlined style={{ marginLeft: 6, color: '#1890FF' }} />
          </Tooltip>}
        </div>
      ),
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



  const datos = lista.map((fluido) => {
    let dato = {
      key: fluido.id.get(),
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
    selectedRowKeys: fluidosSeleccionados.get(),
    onChange: (selectedRowKeys) => {
      fluidosSeleccionados.set(selectedRowKeys);
      if (selectedRowKeys.length > 0) {
        idFluidoActual.set(null);
      }
    }
  }

  // Estados implicados en los procesos seleccionados: el otro sentido de la
  // sincronización que hace la tabla de procesos con los estados.
  const estadosResaltados = new Set(idsEstadosDeProcesos([...procesosSeleccionados.get()]));

  const rowClassName = (record) => {
    const clases = [];
    if (record.key === idFluidoActual.get()) clases.push('selected-row');
    if (estadosResaltados.has(record.key)) clases.push('fila-resaltada');
    return clases.join(' ');
  };

  const columnasCsv = columnas.map((a) => ({ ...a }));

  let iInicial = 5; // 5 columnas fijas: nombre, fluido, fase, temperatura, presión
  columnasTablaFluidos.forEach((columna) => {
    if (columna.get() !== "NO") {
      columnasCsv[iInicial].title = TITULO_COLUMNAS_CSV[columna.get()];
      iInicial++;
    }
  });

  const onDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      const activeIndex = datos.findIndex((record) => record.key === active.id);
      const overIndex = datos.findIndex((record) => record.key === over?.id);
      reordenarFluidos(activeIndex, overIndex);
    }
  };

  return (
    <div>
      <p>  </p>
      <Tooltip title={getTextoUI("tooltip_nuevo_fluido")} mouseEnterDelay={1}>
        <Button type='link' icon={<PlusCircleOutlined />} size='large' onClick={() => nuevoFluido()}></Button>
      </Tooltip>
      <span>  </span>

      {
        (fluidosSeleccionados.length === 0) ?
          <span><Button type='link' icon={<DeleteOutlined />} size='large' disabled></Button>
            <span>  </span>
            <Button type='link' icon={<CopyOutlined />} size='large' disabled></Button>
          </span>
          : <span>
            <Tooltip title={getTextoUI("tooltip_borrar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<DeleteOutlined />} size='large' onClick={() => {
                const ids = [...fluidosSeleccionados.get()];
                fluidosSeleccionados.set([]);
                borrarFluidos(ids);
              }}></Button>
            </Tooltip>
            <span>  </span>
            <Tooltip title={getTextoUI("tooltip_duplicar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<CopyOutlined />} size='large' onClick={() => {
                const ids = [...fluidosSeleccionados.get()];
                fluidosSeleccionados.set([]);
                duplicarFluidos(ids);
              }}></Button>
            </Tooltip>
          </span>
      }
      <span>  </span>
      <Tooltip title={getTextoUI("tooltip_configuracion")} mouseEnterDelay={1}>
        <Button type='link' icon={<SettingOutlined />} size='large' onClick={() => { verConfiguracion.set(true); }}></Button>
      </Tooltip>
      <span>  </span>
      <Tooltip title={getTextoUI("tooltip_diagrama")} mouseEnterDelay={1}>
        <Switch
          checkedChildren={<LineChartOutlined />}
          unCheckedChildren={<LineChartOutlined />}
          checked={verDiagrama.get()}
          onClick={() => { verDiagrama.set(!verDiagrama.get()); }}
        />
      </Tooltip>
      <span> </span>
       <Button
        icon={<FileExcelOutlined />}
        onClick={() => {
          descargarTablaCSV(columnasCsv, datos)
        }}
      >
        {getTextoUI("btn_exportar_csv")}
      </Button>
      <p> </p>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext
          items={datos.map((d) => d.key)}
          strategy={verticalListSortingStrategy}
        >
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
            components={{
              body: {
                row: FilaArrastrable,
              },
            }}
            onRow={(record) => {
              return {
                onDoubleClick: () => { idFluidoActual.set(record.key); verDialogoFluido.set(true) }
              };
            }}
          />
        </SortableContext>
      </DndContext>

      {verConfiguracion.get() && <ConfiguracionFluidos />}
    </div >
  );


}

export default TablaFluidos;