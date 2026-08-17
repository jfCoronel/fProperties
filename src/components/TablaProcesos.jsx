import {
  CopyOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  PlusCircleOutlined,
  CheckCircleTwoTone,
  WarningTwoTone,
  CloseCircleTwoTone
} from '@ant-design/icons';
/* eslint-disable react/prop-types */
import { Button, Tooltip, Table } from 'antd';

import { useHookstate } from '@hookstate/core';
import { configuracion, getTextoUI, descargarTablaCSV } from '../configuracion';
import { getListaDominio } from '../listasDominio';
import {
  listaProcesos,
  nuevoProceso,
  borrarProcesos,
  duplicarProcesos,
  idsProcesosDeEstados,
  verProcesosEnDiagrama,
  cambiarTipoProceso
} from '../procesos/listaProcesos';
import {
  evaluarProceso,
  derivadosProceso,
  getColumnasVisibles,
  getDefinicion,
  tieneCaudal,
  dominioDeProceso
} from '../procesos/proceso';
import { sugerirTipo } from '../procesos/deteccion';
import { propagarProcesos } from '../procesos/propagacion';
import { textoMensaje } from '../procesos/mensajes';
import formatear from '../util/formatear';
import DialogoProceso from './DialogoProceso';
import Ciclos from './Ciclos';
import { columnaDiagrama } from './columnaDiagrama';

// La misma tabla sirve para los dos dominios: lo único que cambia es de qué
// lista salen los estados, qué selección se sincroniza y qué diagrama decide si
// hay ojo que enseñar. Ver DOCUMENTACION.md §3.6.
const TablaProcesos = ({ dominio = 'fluido' }) => {
  const ajustes = useHookstate(configuracion);
  const { idProcesoActual, verDialogoProceso, procesosSeleccionados, nCifras } = ajustes;

  const { lista, claveSeleccion, claveTipoDiagrama } = getListaDominio(dominio);
  const estadosSeleccionados = ajustes[claveSeleccion];
  const hayDiagrama = ajustes[claveTipoDiagrama].get() !== "ninguno";

  const procesos = useHookstate(listaProcesos);
  const estados = useHookstate(lista);

  const listaEstados = estados.get({ noproxy: true });
  const cifras = nCifras.get();

  const nombreEstado = (id) => {
    const estado = listaEstados.find((e) => e.id === id);
    return estado ? estado.nombre : getTextoUI("proc_sin_asignar");
  };

  // Un proceso nuevo hereda los dos estados seleccionados, si hay exactamente dos:
  // es el gesto natural ("conecta estos dos puntos") y ahorra rellenar el diálogo.
  const crearProceso = () => {
    const seleccion = [...estadosSeleccionados.get()];
    if (seleccion.length === 2) {
      nuevoProceso(seleccion[0], seleccion[1], dominio);
      estadosSeleccionados.set([]);
    } else {
      nuevoProceso(null, null, dominio);
    }
  };

  // Borrar o duplicar procesos cambia qué estados quedan generados
  const conPropagacion = (accion) => (ids) => { accion(ids); propagarProcesos(); };

  // La lista de procesos es una sola para los dos dominios; cada tabla enseña la
  // suya. El dominio de un proceso lo dice su tipo, no un campo guardado.
  const listaProcesosActual = procesos.get({ noproxy: true })
    .filter((proceso) => dominioDeProceso(proceso) === dominio);

  // Las columnas de resultado las declara cada tipo, así que la tabla solo
  // muestra la unión de las que piden los procesos existentes. Las de potencia
  // desaparecen mientras ningún proceso lleve caudal.
  const hayCaudal = listaProcesosActual.some(tieneCaudal);
  const evaluaciones = listaProcesosActual.map((proceso) => evaluarProceso(proceso, listaEstados));
  const columnasResultado = getColumnasVisibles(
    evaluaciones.map((evaluacion) => evaluacion.definicion), hayCaudal
  );

  const datos = listaProcesosActual.map((proceso, i) => {
    const evaluacion = evaluaciones[i];
    const derivados = derivadosProceso(proceso, evaluacion);

    const fila = {
      key: proceso.id,
      // La mezcla adiabática tiene dos orígenes, así que la etiqueta los junta
      // todos en vez de dar por hecho que hay uno.
      etiqueta: `${proceso.origenes.map(nombreEstado).join(' + ')} → ${nombreEstado(proceso.destino)}`,
      tipo: evaluacion.definicion ? getTextoUI(evaluacion.definicion.i18n) : proceso.tipo,
      caudal: tieneCaudal(proceso) ? formatear(proceso.parametros.m_punto, cifras) : "–"
    };
    columnasResultado.forEach((columna) => {
      fila[columna.clave] = columna.clave in derivados
        ? formatear(derivados[columna.clave], cifras)
        : "–";
    });
    fila.evaluacion = evaluacion;
    return fila;
  });

  const resumenDiagnostico = (evaluacion) => {
    if (evaluacion.errores.length > 0) return getTextoUI("proc_diag_invalido");
    if (evaluacion.avisos.length > 0) return getTextoUI("proc_diag_revisar");
    return getTextoUI("proc_diag_coherente");
  };

  // Cuando la pareja no cumple lo declarado pero sí encaja con otro tipo, el
  // aviso ofrece el cambio. El desacuerdo se conserva —es lo que enseña—, pero
  // resolverlo cuesta un clic.
  const enlaceSugerencia = (proceso, evaluacion) => {
    if (!proceso) return null;
    const clave = sugerirTipo(proceso, evaluacion);
    if (clave === null) return null;
    const texto = getTextoUI("proc_encaja_con")
      .split('{tipo}').join(getTextoUI(getDefinicion(clave).i18n));
    return (
      <a onClick={(evento) => {
        evento.stopPropagation();
        cambiarTipoProceso(proceso.id, clave);
        propagarProcesos();
      }}> · {texto}</a>
    );
  };

  const celdaDiagnostico = (proceso, evaluacion) => {
    const mensajes = [...evaluacion.errores, ...evaluacion.avisos]
      .map((mensaje) => textoMensaje(mensaje, cifras));

    let icono = <CheckCircleTwoTone twoToneColor="#52c41a" />;
    if (evaluacion.errores.length > 0) {
      icono = <CloseCircleTwoTone twoToneColor="#f5222d" />;
    } else if (evaluacion.avisos.length > 0) {
      icono = <WarningTwoTone twoToneColor="#faad14" />;
    }
    const resumen = resumenDiagnostico(evaluacion);

    if (mensajes.length === 0) {
      return <span>{icono} {resumen}</span>;
    }
    return (
      <span>
        <Tooltip title={mensajes.map((m, i) => <div key={i}>{m}</div>)}>
          <span>{icono} {mensajes[0]}</span>
        </Tooltip>
        {enlaceSugerencia(proceso, evaluacion)}
      </span>
    );
  };

  const columnasIdentidad = [
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
      title: 'ṁ [kg/s]',
      dataIndex: 'caudal',
      key: 'caudal'
    }
  ];

  // El encabezado lleva el símbolo (con subíndices), y el nombre completo va al
  // tooltip: caben así seis o siete columnas de resultado sin desbordar.
  const columnas = [
    ...columnasIdentidad,
    ...columnasResultado.map((columna) => ({
      title: (
        <Tooltip title={getTextoUI(columna.i18n)}>
          <span dangerouslySetInnerHTML={{ __html: `${columna.simbolo} [${columna.unidad}]` }} />
        </Tooltip>
      ),
      dataIndex: columna.clave,
      key: columna.clave,
      align: 'right'
    })),
    {
      title: getTextoUI("proc_columna_diagnostico"),
      key: 'diagnostico',
      render: (_, fila) => celdaDiagnostico(
        listaProcesosActual.find((proceso) => proceso.id === fila.key), fila.evaluacion
      )
    },
    // El ojo solo aparece si hay diagrama que mirar, y nunca en el CSV: no es un
    // resultado del proceso.
    ...(!hayDiagrama ? [] : [columnaDiagrama({
      ids: listaProcesosActual.map((proceso) => proceso.id),
      ocultos: new Set(
        listaProcesosActual.filter((proceso) => proceso.enDiagrama === false)
          .map((proceso) => proceso.id)
      ),
      cambiar: verProcesosEnDiagrama
    })])
  ];

  // El CSV necesita títulos y filas planos: descargarTablaCSV recorre las claves
  // del objeto en orden, así que la fila no puede arrastrar la evaluación.
  const columnasCsv = [
    { title: getTextoUI("proc_columna_proceso"), key: 'etiqueta' },
    { title: getTextoUI("proc_tipo"), key: 'tipo' },
    { title: 'm_punto [kg/s]', key: 'caudal' },
    ...columnasResultado.map((columna) => ({
      title: `${columna.clave} [${columna.unidad}]`,
      key: columna.clave
    })),
    { title: getTextoUI("proc_columna_diagnostico"), key: 'diagnostico' }
  ];

  const datosCsv = datos.map((fila) => {
    const filaCsv = { key: fila.key, etiqueta: fila.etiqueta, tipo: fila.tipo, caudal: fila.caudal };
    columnasResultado.forEach((columna) => { filaCsv[columna.clave] = fila[columna.clave]; });
    // Solo el resumen: los mensajes de diagnóstico llevan comas y romperían el CSV.
    filaCsv.diagnostico = resumenDiagnostico(fila.evaluacion);
    return filaCsv;
  });

  const seleccionFilas = {
    selectedRowKeys: procesosSeleccionados.get(),
    onChange: (selectedRowKeys) => {
      procesosSeleccionados.set(selectedRowKeys);
      if (selectedRowKeys.length > 0) {
        idProcesoActual.set(null);
      }
    }
  };

  // Procesos que inciden en los estados seleccionados en la tabla de arriba.
  const procesosResaltados = new Set(idsProcesosDeEstados([...estadosSeleccionados.get()]));

  const rowClassName = (fila) => {
    const clases = [];
    if (fila.evaluacion.errores.length > 0) clases.push('fila-proceso-invalida');
    else if (fila.evaluacion.avisos.length > 0) clases.push('fila-proceso-aviso');
    if (procesosResaltados.has(fila.key)) clases.push('fila-resaltada');
    return clases.join(' ');
  };

  return (
    <div className='panel'>
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
                conPropagacion(borrarProcesos)(ids);
              }}></Button>
            </Tooltip>
            <span>  </span>
            <Tooltip title={getTextoUI("tooltip_duplicar_seleccionados")} mouseEnterDelay={1}>
              <Button type='link' icon={<CopyOutlined />} size='large' onClick={() => {
                const ids = [...procesosSeleccionados.get()];
                procesosSeleccionados.set([]);
                conPropagacion(duplicarProcesos)(ids);
              }}></Button>
            </Tooltip>
          </span>
      }
      <span>  </span>
      <Button
        icon={<FileExcelOutlined />}
        disabled={datos.length === 0}
        onClick={() => { descargarTablaCSV(columnasCsv, datosCsv, "Procesos.csv"); }}
      >
        {getTextoUI("btn_exportar_csv")}
      </Button>

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

      <Ciclos dominio={dominio} />

      <DialogoProceso dominio={dominio} />
    </div>
  );
}

export default TablaProcesos;
