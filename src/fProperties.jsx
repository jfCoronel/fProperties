import { Divider, Select, message } from 'antd';
import { ExperimentOutlined, CloudOutlined } from '@ant-design/icons';

import { useEffect, useRef } from 'react';
import { useHookstate } from '@hookstate/core';
import { configuracion, cargarTextosUI, getTextoUI } from './configuracion';
import { cargarDesdePermalink } from './permalink/problema';
import Compartir from './components/Compartir';
import TablaFluidos from './components/TablaFluidos';
import TablaProcesos from './components/TablaProcesos';
import TablaAires from './components/TablaAires';
import Psicrometrico from './components/Psicrometrico';
import Diagrama from './components/Diagrama';
import DialogoFluido from './components/DialogoFluido';
import DialogoAire from './components/DialogoAire';

const { Option } = Select;

const FProperties = () => {
  const { menuActual, idFluidoActual, idAireActual, version, idioma, textosCargados } = useHookstate(configuracion);

  // Fluidos y aire húmedo son dos calculadoras distintas, no dos vistas de lo
  // mismo: un desplegable junto al título lo dice mejor que unas pestañas, y deja
  // la cabecera en una sola línea.
  const selectorMenu = (
    <Select
      value={menuActual.get()}
      onChange={(valor) => { menuActual.set(valor); }}
      style={{ minWidth: 160 }}
    >
      <Option key="fluidos" value="fluidos"><ExperimentOutlined /> {getTextoUI("tab_fluidos")}</Option>
      <Option key="aireHumedo" value="aireHumedo"><CloudOutlined /> {getTextoUI("tab_airehumedo")}</Option>
    </Select>
  );

  // Cargar textos json: solo al montar y al cambiar de idioma.
  // Llamarlo en el cuerpo del render encadenaba un fetch por render.
  const idiomaActual = idioma.get();
  useEffect(() => {
    cargarTextosUI();
  }, [idiomaActual]);

  // Un permalink trae el problema entero, incluido el idioma, así que se resuelve
  // una sola vez y en cuanto hay textos con los que informar del resultado.
  const permalinkResuelto = useRef(false);
  const hayTextos = textosCargados.get();
  useEffect(() => {
    if (!hayTextos || permalinkResuelto.current) return;
    permalinkResuelto.current = true;

    cargarDesdePermalink()
      .then((problema) => {
        if (problema === null) return;
        message.success(
          getTextoUI("msg_problema_cargado")
            .split('{estados}').join(problema.estados.length + problema.aires.length)
            .split('{procesos}').join(problema.procesos.length)
        );
      })
      .catch((error) => {
        const traducido = getTextoUI(error.message);
        message.error(traducido === '__' ? error.message : traducido);
      });
  }, [hayTextos]);

  function jsxSelectorIdioma() {
    if (textosCargados.get()) {
      return (
        <Select
          value={idioma.get()}
          onChange={value => {
            textosCargados.set(false);
            idioma.set(value);
          }}
        >
          <Option key="es" value="es"><img src="./img/es.svg" width="24" /> {" " + getTextoUI("lab_idioma_es")}</Option>
          <Option key="en" value="en"><img src="./img/en.svg" width="24" /> {" " + getTextoUI("lab_idioma_en")}</Option>
        </Select>
      );
    } else {
      return (<></>);
    }
  }


  return (
    <div className="contenido" >
      <div className='tablas'
        onClick={() => { idFluidoActual.set(null); idAireActual.set(null); }} >
        <p> </p>
        {/* Cabecera en una línea: título, selector de calculadora y, al otro
            extremo, compartir e idioma. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className='titulo'><a href="https://fproperties.jfcoronel.org" target="blank"><ExperimentOutlined /> {getTextoUI("lab_nombreApp")}</a></span>
          {textosCargados.get() && selectorMenu}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {textosCargados.get() && <Compartir />}
            {jsxSelectorIdioma()}
          </span>
        </div>
        <Divider style={{ margin: "12px 0" }} />

        {/* Las dos calculadoras tienen la misma forma: tabla de estados, tabla de
            procesos y diagrama. Los tres van dentro del mismo contenedor, que es
            la única manera de que las cajas compartan ancho y márgenes. */}
        {(menuActual.get() === 'fluidos') && <TablaFluidos />}
        {(menuActual.get() === 'fluidos') && <TablaProcesos />}
        {(menuActual.get() === 'fluidos') && <Diagrama />}
        {(menuActual.get() === 'aireHumedo') && <TablaAires />}
        {(menuActual.get() === 'aireHumedo') && <Psicrometrico />}

        <p>  </p>
      </div>

      <Divider />
      <div className='pie'>
        <span className='etiqueta'> {getTextoUI("lab_version")}: {version.get()},  <a href="http://jfc.us.es" target="blank">{getTextoUI("lab_copyright")} </a></span>
      </div>
      <DialogoFluido />
      <DialogoAire />

    </div >
  );
}

export default FProperties;