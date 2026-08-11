import { Button, Tooltip } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { getTextoUI } from '../configuracion';

const COLOR_VISIBLE = '#1890FF';
const COLOR_OCULTO = '#BFBFBF';

/**
 * Columna "Diagrama", común a la tabla de estados y a la de procesos: un ojo por
 * fila que decide si esa fila se dibuja, y otro en la cabecera que las cambia
 * todas de golpe.
 *
 * Va con icono de ojo y no con un checkbox a propósito: la columna de selección
 * de la tabla ya son casillas, y dos columnas de casillas con significados
 * distintos en la misma fila se confunden.
 *
 * @param ids      ids de todas las filas, para el interruptor de la cabecera
 * @param ocultos  Set de ids que ahora mismo no se dibujan
 * @param cambiar  (ids, valor) => void, el que escribe en la lista
 */
export function columnaDiagrama({ ids, ocultos, cambiar }) {
  const todosVisibles = ocultos.size === 0;

  const ojo = (visible) => (visible
    ? <EyeOutlined style={{ color: COLOR_VISIBLE }} />
    : <EyeInvisibleOutlined style={{ color: COLOR_OCULTO }} />);

  return {
    title: (
      <span style={{ whiteSpace: 'nowrap' }}>
        {getTextoUI("col_diagrama")}
        <Tooltip title={getTextoUI("tooltip_en_diagrama_todos")} mouseEnterDelay={1}>
          <Button
            type='link'
            size='small'
            icon={ojo(todosVisibles)}
            onClick={() => { cambiar(ids, !todosVisibles); }}
          />
        </Tooltip>
      </span>
    ),
    key: 'enDiagrama',
    align: 'center',
    render: (_, fila) => {
      const visible = !ocultos.has(fila.key);
      return (
        <Tooltip title={getTextoUI("tooltip_en_diagrama")} mouseEnterDelay={1}>
          <Button
            type='link'
            size='small'
            icon={ojo(visible)}
            onClick={(evento) => {
              evento.stopPropagation();
              cambiar([fila.key], !visible);
            }}
          />
        </Tooltip>
      );
    }
  };
}
