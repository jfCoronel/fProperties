// InputNumber de antd que en tablets y móviles pide el teclado numérico. La
// excepción es el iPhone en los campos que admiten negativos: su teclado decimal
// no tiene signo menos, y una temperatura de −10 ºC sería imposible de escribir.
// Ahí se queda el teclado completo. El del iPad sí trae el menos.
import { InputNumber } from 'antd';

const ES_IPHONE = typeof navigator !== 'undefined' && /iPhone|iPod/.test(navigator.userAgent);

export default function CampoNumero(props) {
    const admiteNegativos = !(Number.isFinite(props.min) && props.min >= 0);
    const teclado = ES_IPHONE && admiteNegativos ? undefined : 'decimal';
    return <InputNumber inputMode={teclado} {...props} />;
}
