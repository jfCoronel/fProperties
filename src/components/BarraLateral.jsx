import { useHookstate } from '@hookstate/core';
import { configuracion } from '../configuracion';
import FormularioFluido from './FormularioFluido';
import FormularioAire from './FormularioAire';


const BarraLateral = () => {
    const { iActual, menuActual } = useHookstate(configuracion);

    if (menuActual.get() === 'fluidos' && iActual.get() >= 0) {
        return (<div className="barra-lateral">
            <FormularioFluido />
        </div>);
    } else if (menuActual.get() === 'aireHumedo' && iActual.get() >= 0) {
        return (<div className="barra-lateral">
            <FormularioAire />
        </div>);
    } else {
        return (<div className="barra-lateral"></div>);
    }
}

export default BarraLateral;