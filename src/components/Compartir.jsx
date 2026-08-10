import { useRef } from 'react';
import { Button, Input, Modal, Tooltip, message } from 'antd';
import { ShareAltOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';

import { getTextoUI } from '../configuracion';
import {
  getEnlaceProblema,
  fijarHash,
  descargarProblema,
  cargarProblemaJSON,
  LONGITUD_ENLACE_COMODA
} from '../permalink/problema';

// Los errores del permalink llegan como clave i18n para no fijar el idioma en el
// motor; si la clave no está traducida se muestra el mensaje tal cual.
const textoError = (error) => {
  const traducido = getTextoUI(error.message);
  return traducido === '__' ? error.message : traducido;
};

const Compartir = () => {
  const ficheroRef = useRef(null);

  // El portapapeles solo existe en contexto seguro (https o localhost). Donde no
  // esté, el enlace se enseña para copiarlo a mano en vez de fallar en silencio.
  const mostrarParaCopiar = (enlace) => {
    Modal.info({
      title: getTextoUI("titulo_enlace"),
      width: 600,
      content: <Input.TextArea value={enlace} readOnly autoSize={{ minRows: 3, maxRows: 8 }} />
    });
  };

  const compartir = async () => {
    try {
      const enlace = await getEnlaceProblema();
      fijarHash(enlace);

      if (enlace.length > LONGITUD_ENLACE_COMODA) {
        message.warning(getTextoUI("msg_enlace_largo"));
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(enlace);
        message.success(getTextoUI("msg_enlace_copiado"));
      } else {
        mostrarParaCopiar(enlace);
      }
    } catch (error) {
      message.error(textoError(error));
    }
  };

  const importar = async (evento) => {
    const fichero = evento.target.files?.[0];
    evento.target.value = ''; // permite reimportar el mismo fichero
    if (!fichero) return;

    try {
      const problema = await cargarProblemaJSON(await fichero.text());
      message.success(
        getTextoUI("msg_problema_cargado")
          .split('{estados}').join(problema.estados.length + problema.aires.length)
          .split('{procesos}').join(problema.procesos.length)
      );
    } catch (error) {
      message.error(textoError(error));
    }
  };

  return (
    <span>
      <Tooltip title={getTextoUI("tooltip_compartir")} mouseEnterDelay={1}>
        <Button type='text' icon={<ShareAltOutlined />} onClick={compartir} />
      </Tooltip>
      <Tooltip title={getTextoUI("tooltip_descargar_problema")} mouseEnterDelay={1}>
        <Button type='text' icon={<DownloadOutlined />} onClick={descargarProblema} />
      </Tooltip>
      <Tooltip title={getTextoUI("tooltip_importar_problema")} mouseEnterDelay={1}>
        <Button type='text' icon={<UploadOutlined />} onClick={() => ficheroRef.current?.click()} />
      </Tooltip>
      <input
        type="file"
        accept="application/json,.json"
        ref={ficheroRef}
        style={{ display: 'none' }}
        onChange={importar}
      />
    </span>
  );
};

export default Compartir;
