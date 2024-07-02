import { Menu, Tooltip, Button } from 'antd';
import { ExperimentOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';

import { useState } from '@hookstate/core';
import { configuracion } from './configuracion';
import TablaFluidos from './components/TablaFluidos';
import TablaAires from './components/TablaAires';
import BarraLateral from './components/BarraLateral'


const fProperties = () => {
  const { menuActual, iActual, year, version, verBarraLateral } = useState(configuracion);

  const margen = (verBarraLateral.get()) ? '350px' : '0px';

  return (
    <div className="contenido" >
      <div className='tablas'
        style={{ marginRight: margen }}
        onClick={() => { iActual.set(-1) }} >
        <p> </p>
        <span className='titulo'> <a href="https://personal.us.es/jfc/PropiedadesDeFluidos/descripcion" target="blank"><ExperimentOutlined /> PropiedadesDeFluidos</a> </span>
        <span style={{ float: "right" }}>
          {verBarraLateral.get() ?
            (<Tooltip title="Barra lateral">
              <Button type="primary" shape="circle" icon={<ArrowRightOutlined />}
                onClick={() => { verBarraLateral.set(false) }}
              />
            </Tooltip>)
            :
            (<Tooltip title="Barra lateral">
              <Button type="primary" shape="circle" icon={<ArrowLeftOutlined />}
                onClick={() => { verBarraLateral.set(true) }}
              />
            </Tooltip>)}
        </span>
        <Menu onClick={(e) => menuActual.set(e.key.toString())} selectedKeys={[menuActual.get()]} mode="horizontal">
          <Menu.Item key="fluidos">
            Fluidos
          </Menu.Item>
          <Menu.Item key="aireHumedo">
            Aire Húmedo
          </Menu.Item>
        </Menu>

        {(menuActual.get() === 'fluidos') && <TablaFluidos />}
        {(menuActual.get() === 'aireHumedo') && <TablaAires />}

        <p>  </p>
        <a href="https://personal.us.es/jfc/PropiedadesDeFluidos/descripcion" target="blank">PropiedadesDeFluidos</a> es un calculadora de propiedades de fluidos basada en <a href="http://www.coolprop.org" target="blank">Coolprop</a>
        <p><a href="http://jfc.us.es" target="blank">©jfc</a>-{year.get()}, Versión: {version.get()} </p>
      </div>
      {verBarraLateral.get() && <BarraLateral />}
    </div>
  );
}

export default fProperties;