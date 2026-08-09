import {
  CopyOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  CheckCircleTwoTone,
  WarningTwoTone,
  CloseCircleTwoTone
} from '@ant-design/icons';
import { Button, Tooltip, Table } from 'antd';

import { useHookstate } from '@hookstate/core';
import { configuracion, getTextoUI } from '../configuracion';
import { listaFluidos } from '../listaFluidos';
import {
  listaProcesos,
  nuevoProceso,
  borrarProcesos,
  duplicarProcesos
} from '../procesos/listaProcesos';
import { evaluarProceso } from '../procesos/proceso';
import { textoMensaje } from '../procesos/mensajes';
import formatear from '../util/formatear';
import DialogoProceso from './DialogoProceso';

const TablaProcesos = () => {
  const {
    idProcesoActual, verDialogoProceso, procesosSeleccionados,
    fluidosSeleccionados, nCifras
  } = useHookstate(configuracion);

  const procesos = useHookstate(listaProcesos);
  const estados = useHookstate(listaFluidos);

  const listaEstados = estados.get({ noproxy: true });
  const cifras = nCifras.get();

  const nombreEstado = (id) => {
    const estado = listaEstados.find((e) => e.id === id);
    return estado ? estado.nombre : getTextoUI("proc_sin_asignar");
  };

  // Un proceso nuevo hereda los dos estados seleccionados, si hay exactamente dos:
  // es el gesto natural ("conecta estos dos puntos") y ahorra rellenar el diálogo.
  const crearProceso = () => {
    const seleccion = [...fluidosSeleccionados.get()];
    if (seleccion.length === 2) {
      nuevoProceso(seleccion[0], seleccion[1]);
      fluidosSeleccionados.set([]);
    } else {
      nuevoProceso();
    }
  };

  const datos = procesos.get({ noproxy: true }).map((proceso) => {
    const evaluacion = evaluarProceso(proceso, listaEstados);
    return {
      key: proceso.id,
      etiqueta: `${nombreEstado(proceso.origenes[0])} → ${nombreEstado(proceso.destino)}`,
      tipo: evaluacion.definicion ? getTextoUI(evaluacion.definicion.i18n) : proceso.tipo,
      caudal: proceso.parametros.m_punto == null ? "–" : formatear(proceso.parametros.m_punto, cifras),
      evaluacion
    };
  });

  const celdaDiagnostico = (evaluacion) => {
    const mensajes = [...evaluacion.errores, ...evaluacion.avisos]
      .map((mensaje) => textoMensaje(mensaje, cifras));

    let icono = <CheckCircleTwoTone twoToneColor="#52c41a" />;
    let resumen = getTextoUI("proc_diag_coherente");
    if (evaluacion.errores.length > 0) {
      icono = <CloseCircleTwoTone twoToneColor="#f5222d" />;
      resumen = getTextoUI("proc_diag_invalido");
    } else if (evaluacion.avisos.length > 0) {
      icono = <WarningTwoTone twoToneColor="#faad14" />;
      resumen = getTextoUI("proc_diag_revisar");
    }

    if (mensajes.length === 0) {
      return <span>{icono} {resumen}</span>;
    }
    return (
      <Tooltip title={mensajes.map((m, i) => <div key={i}>{m}</div>)}>
        <span>{icono} {mensajes[0]}</span>
      </Tooltip>
    );
  };

  const columnas = [
    {
      title: getTextoUI("proc_columna_proceso"),
      dataIndex: 'etiqueta',
      key: 'etiqueta',
      render: (texto, fila) => (
        <a onClick={(event) => {
          event.stopPropagation();
          idProcesoActual.set(fila.key);
          verDialogoProceso.set(true);
        }}>{texto}</a>
      )
    },
    {
      title: getTextoUI("proc_tipo"),
      dataIndex: 'tipo',
      key: 'tipo'
    },
    {
      title: getTextoUI("param_m_punto") + ' [kg/s]',
      dataIndex: 'caudal',
      key: 'caudal'
    },
    {
      title: getTextoUI("proc_columna_diagnostico"),
      key: 'diagnostico',
      render: (_, fila) => celdaDiagnostico(fila.evaluacion)
    }
  ];

  const seleccionFilas = {
    selectedRowKeys: procesosSeleccionados.get(),
    onChange: (selectedRowKeys) => {
      procesosSeleccionados.set(selectedRowKeys);
      if (selectedRowKeys.length > 0) {
        idProcesoActual.set(null);
      }
    }
  };

  const rowClassName = (fila) => {
    if (fila.evaluacion.errores.length > 0) return 'fila-proceso-invalida';
    if (fila.evaluacion.avisos.length > 0) return 'fila-proceso-aviso';
    return '';
  };

  return (
    <div>
      <h3>{getTextoUI("titulo_procesos")}</h3>

      <Tooltip title={getTextoUI("tooltip_nuevo_proceso")} mouseEnterDelay={1}>
        <Button type='link' icon={<PlusCircleOutlined />} size='large' onClick={crearProceso}></Button>
      </Tooltip>
      <span>  </span>
      {
        (procesosSeleccionados.length === 0) ?
          <span>
            <Button type='link' icon={<DeleteOutlined />} size='large' disabled></Button>
            <span>  </span>
            <Button type='link' icon={<CopyOutlined />} size='large' disabled></Button>
          </span>
          : <span>
            <Tooltip title={getTextoUI("tooltip_borrar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<DeleteOutlined />} size='large' onClick={() => {
                const ids = [...procesosSeleccionados.get()];
                procesosSeleccionados.set([]);
                borrarProcesos(ids);
              }}></Button>
            </Tooltip>
            <span>  </span>
            <Tooltip title={getTextoUI("tooltip_duplicar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<CopyOutlined />} size='large' onClick={() => {
                const ids = [...procesosSeleccionados.get()];
                procesosSeleccionados.set([]);
                duplicarProcesos(ids);
              }}></Button>
            </Tooltip>
          </span>
      }

      {datos.length === 0
        ? <p className='comentario'>{getTextoUI("proc_ayuda_vacia")}</p>
        : <Table
          rowSelection={seleccionFilas}
          columns={columnas}
          dataSource={datos}
          rowClassName={rowClassName}
          pagination={false}
          size="small"
          onRow={(fila) => ({
            onDoubleClick: () => { idProcesoActual.set(fila.key); verDialogoProceso.set(true); }
          })}
        />}

      <DialogoProceso />
    </div>
  );
}

export default TablaProcesos;
