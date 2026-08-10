import {
  CopyOutlined,
  DeleteOutlined,
  SettingOutlined,
  FileExcelOutlined,
  PlusCircleOutlined,
  LineChartOutlined,
  HolderOutlined
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
import { listaAires, nuevoAire, borrarAires, duplicarAires, reordenarAires } from '../listaAires';
import formatear from '../util/formatear';
import ConfiguracionAires from './ConfiguracionAires';

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
  const { idAireActual, columnasTablaAires, nCifras, verConfiguracion, verPsicrometrico, verDialogoAire, airesSeleccionados } = useHookstate(configuracion);


  const lista = useHookstate(listaAires);

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
          <a onClick={(event) => { event.stopPropagation(); idAireActual.set(record.key); verDialogoAire.set(true) }} >{text}</a>
        </div>
      ),
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

  const datos = lista.map((aire) => {
    let dato = {
      key: aire.id.get(),
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
    selectedRowKeys: airesSeleccionados.get(),
    onChange: (selectedRowKeys) => {
      airesSeleccionados.set(selectedRowKeys);
      if (selectedRowKeys.length > 0) {
        idAireActual.set(null);
      }
    }
  }

  const rowClassName = (record) => {
    return record.key === idAireActual.get() ? 'selected-row' : '';
  };

  const columnasCsv = columnas.map((a) => ({ ...a }));

  let iInicial = 5; // 5 columnas fijas: nombre, altura, presión, temperatura, humedad absoluta
  columnasTablaAires.forEach((columna) => {
    if (columna.get() !== "NO") {
      columnasCsv[iInicial].title = TITULO_COLUMNAS_CSV[columna.get()];
      iInicial++;
    }
  });


  const onDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      const activeIndex = datos.findIndex((record) => record.key === active.id);
      const overIndex = datos.findIndex((record) => record.key === over?.id);
      reordenarAires(activeIndex, overIndex);
    }
  };

  return (
    <div>
      <p>  </p>
      <Tooltip title={getTextoUI("tooltip_nuevo_aire")} mouseEnterDelay={1}>
        <Button type='link' icon={<PlusCircleOutlined />} size='large' onClick={() => nuevoAire()}></Button>
      </Tooltip>
      <span>  </span>

      {
        (airesSeleccionados.length === 0) ?
          <span><Button type='link' icon={<DeleteOutlined />} size='large' disabled></Button>
            <span>  </span>
            <Button type='link' icon={<CopyOutlined />} size='large' disabled></Button>
          </span>
          : <span>
            <Tooltip title={getTextoUI("tooltip_borrar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<DeleteOutlined />} size='large' onClick={() => {
                const ids = [...airesSeleccionados.get()];
                airesSeleccionados.set([]);
                borrarAires(ids);
              }}></Button>
            </Tooltip>
            <span>  </span>
            <Tooltip title={getTextoUI("tooltip_duplicar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<CopyOutlined />} size='large' onClick={() => {
                const ids = [...airesSeleccionados.get()];
                airesSeleccionados.set([]);
                duplicarAires(ids);
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
          checked={verPsicrometrico.get()}
          onClick={() => { verPsicrometrico.set(!verPsicrometrico.get()); }}
        />
      </Tooltip>
      <span>  </span>
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
                onDoubleClick: () => { idAireActual.set(record.key); verDialogoAire.set(true) }
              };
            }}
          />
        </SortableContext>
      </DndContext>

      {verConfiguracion.get() && <ConfiguracionAires />}
    </div >
  );


}

export default TablaAires;