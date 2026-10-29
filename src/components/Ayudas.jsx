// Tooltips que se adaptan a tablets y móviles. Con ratón son los de antd, al
// pasar por encima; en táctil, donde no hay hover, cada tipo cambia de gesto:
//
//  - TooltipAccion, sobre botones y tiradores: el toque ejecuta la acción, así
//    que la ayuda sale con una pulsación larga y esa pulsación no actúa.
//  - TooltipInfo, sobre iconos y textos cuyo tooltip ES la información: sale al
//    tocarlos.
import { cloneElement, useEffect, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import { ES_TACTIL } from '../util/tactil';

const ESPERA_PULSACION_LARGA = 500; // ms
const VISIBLE_TRAS_SOLTAR = 1500; // ms
// Un dedo nunca está quieto del todo: por debajo de esto no se cuenta como
// arrastre.
const TOLERANCIA_MOVIMIENTO = 10; // px

export function TooltipAccion({ title, children }) {
    if (!ES_TACTIL) {
        return <Tooltip title={title} mouseEnterDelay={1}>{children}</Tooltip>;
    }
    return <PulsacionLarga title={title}>{children}</PulsacionLarga>;
}

export function TooltipInfo({ title, mouseEnterDelay, children }) {
    return (
        <Tooltip title={title} mouseEnterDelay={mouseEnterDelay} trigger={ES_TACTIL ? 'click' : 'hover'}>
            {children}
        </Tooltip>
    );
}

// Los manejadores se añaden sobre el propio hijo (sin envolverlo en otro
// elemento) para no romper maquetaciones como Space.Compact, y se encadenan con
// los que ya tuviera: el tirador de altura usa los mismos eventos de puntero.
function PulsacionLarga({ title, children }) {
    const [abierto, setAbierto] = useState(false);
    const temporizador = useRef(null);
    const inicio = useRef(null);
    const fueLarga = useRef(false);
    const propios = children.props;

    const parar = () => {
        clearTimeout(temporizador.current);
        temporizador.current = null;
    };
    useEffect(() => parar, []);

    const encadenar = (nombre, manejador) => (evento) => {
        manejador(evento);
        propios[nombre]?.(evento);
    };

    const alPulsar = (evento) => {
        parar();
        setAbierto(false);
        fueLarga.current = false;
        inicio.current = { x: evento.clientX, y: evento.clientY };
        temporizador.current = setTimeout(() => {
            fueLarga.current = true;
            setAbierto(true);
        }, ESPERA_PULSACION_LARGA);
    };

    const alMover = (evento) => {
        if (inicio.current === null) return;
        const desplazamiento = Math.hypot(evento.clientX - inicio.current.x, evento.clientY - inicio.current.y);
        if (desplazamiento > TOLERANCIA_MOVIMIENTO) {
            inicio.current = null;
            parar();
            setAbierto(false);
        }
    };

    const alSoltar = () => {
        inicio.current = null;
        parar();
        if (fueLarga.current) {
            temporizador.current = setTimeout(() => setAbierto(false), VISIBLE_TRAS_SOLTAR);
        }
    };

    // El navegador puede rematar la pulsación larga con un clic: ese no cuenta.
    const alHacerClic = (evento) => {
        if (fueLarga.current) {
            fueLarga.current = false;
            evento.preventDefault();
            evento.stopPropagation();
            return;
        }
        propios.onClick?.(evento);
    };

    return (
        <Tooltip title={title} open={abierto}>
            {cloneElement(children, {
                onPointerDown: encadenar('onPointerDown', alPulsar),
                onPointerMove: encadenar('onPointerMove', alMover),
                onPointerUp: encadenar('onPointerUp', alSoltar),
                onPointerCancel: encadenar('onPointerCancel', alSoltar),
                onClick: alHacerClic,
                // Android abre el menú contextual con la pulsación larga
                onContextMenu: (evento) => {
                    evento.preventDefault();
                    propios.onContextMenu?.(evento);
                }
            })}
        </Tooltip>
    );
}
