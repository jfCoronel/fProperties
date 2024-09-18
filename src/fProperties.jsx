import { Divider, Menu, Select } from 'antd';
import { ExperimentOutlined, CloudOutlined } from '@ant-design/icons';

import { useHookstate } from '@hookstate/core';
import { configuracion, cargarTextosUI, getTextoUI } from './configuracion';
import TablaFluidos from './components/TablaFluidos';
import TablaAires from './components/TablaAires';
import Psicrometrico from './components/Psicrometrico';
import DialogoFluido from './components/DialogoFluido';
import DialogoAire from './components/DialogoAire';

const { Option } = Select;

const FProperties = () => {
  const { menuActual, iFluidoActual, iAireActual, version, idioma, textosCargados, verPsicrometrico } = useHookstate(configuracion);

  const menuTabItems = [
    {
      label: getTextoUI("tab_fluidos"),
      key: 'fluidos',
      icon: <ExperimentOutlined />,
    },
    {
      label: getTextoUI("tab_airehumedo"),
      key: 'aireHumedo',
      icon: <CloudOutlined />,
    }
  ]

  // Cargar textos json
  cargarTextosUI();

  function jsxSelectorIdioma() {
    if (textosCargados.get()) {
      return (
        <Select
          value={idioma.get()}
          onChange={value => {
            textosCargados.set(false);
            idioma.set(value);
            cargarTextosUI();
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
        onClick={() => { iFluidoActual.set(-1); iAireActual.set(-1); }} >
        <p> </p>
        <span className='titulo'> <a href="http://fproperties.org" target="blank"><ExperimentOutlined /> {getTextoUI("lab_nombreApp")}</a> </span>
        <span style={{ float: "right" }}>
          {jsxSelectorIdioma()}
        </span>
        <Menu onClick={(e) => menuActual.set(e.key.toString())} selectedKeys={[menuActual.get()]} mode="horizontal" items={menuTabItems}>
        </Menu>

        {(menuActual.get() === 'fluidos') && <TablaFluidos />}
        {(menuActual.get() === 'aireHumedo') && <TablaAires />}

        <p>  </p>
      </div>

      {verPsicrometrico.get() && <Psicrometrico />}
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