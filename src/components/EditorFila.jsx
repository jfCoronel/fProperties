import { useHookstate } from '@hookstate/core';
import { configuracion } from '../configuracion';
import FormularioFluido from './FormularioFluido';
import FormularioAire from './FormularioAire';


const EditorFila = () => {
    const { iActual, menuActual } = useHookstate(configuracion);

    if (menuActual.get() === 'fluidos' && iActual.get() >= 0) {
        return (<FormularioFluido />);
    } else if (menuActual.get() === 'aireHumedo' && iActual.get() >= 0) {
        return (<FormularioAire />);
    } else {
        return (<></>);
    }
}

export default EditorFila;