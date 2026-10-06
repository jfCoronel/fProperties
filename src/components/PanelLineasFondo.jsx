import { useHookstate } from '@hookstate/core';
import { Switch, Radio, Input, Button, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { configuracion, getTextoUI } from '../configuracion';
import {
    configuracionFamilias, parsearValores, formatearValores, TRAZOS
} from '../diagramas/familiasFondo';

// Pestaña "Líneas de fondo" del diálogo de configuración de los diagramas. Lee y
// escribe configuracion.lineasFondo, que es por tipo de diagrama (no por fluido)
// y viaja en el permalink. Ver DOCUMENTACION.md §1.3.
//
// Los cambios se aplican al momento —el diagrama se redibuja detrás del diálogo—
// salvo la lista de valores propios, que se aplica al salir del campo o con
// Intro: cada redibujado son cientos de llamadas a CoolProp y no puede ir con
// cada tecla.

// Muestra del trazo de cada familia, para que el diálogo sirva de leyenda.
const MuestraTrazo = ({ familia }) => (
    <svg width="36" height="10" style={{ verticalAlign: 'middle', marginRight: 8 }} aria-hidden="true">
        <line
            x1="0" y1="5" x2="36" y2="5"
            stroke={familia.color} strokeWidth="2"
            strokeDasharray={(TRAZOS[familia.trazo] ?? []).join(' ')}
        />
    </svg>
);

// Campo de valores propios con su propio borrador: se edita libremente y solo se
// lleva a la configuración al confirmarlo.
const CampoValores = ({ valores, idioma, alConfirmar }) => {
    const [borrador, setBorrador] = useState(formatearValores(valores, idioma));
    useEffect(() => { setBorrador(formatearValores(valores, idioma)); }, [valores, idioma]);
    const confirmar = () => alConfirmar(parsearValores(borrador));
    return (
        <Input
            size="small"
            value={borrador}
            onChange={(evento) => setBorrador(evento.target.value)}
            onBlur={confirmar}
            onPressEnter={confirmar}
        />
    );
};

const PanelLineasFondo = ({ diagrama, valoresAutomaticos }) => {
    const { lineasFondo, idioma } = useHookstate(configuracion);
    const guardada = lineasFondo.get({ noproxy: true });
    const familias = configuracionFamilias(diagrama, guardada);

    const cambiarFamilia = (clave, cambios) => {
        const actual = lineasFondo.get({ noproxy: true });
        const delDiagrama = actual[diagrama] ?? {};
        lineasFondo.set({
            ...actual,
            [diagrama]: { ...delDiagrama, [clave]: { ...delDiagrama[clave], ...cambios } }
        });
    };

    const restablecer = () => {
        const resto = { ...lineasFondo.get({ noproxy: true }) };
        delete resto[diagrama];
        lineasFondo.set(resto);
    };

    return (<div>
        <p className="comentario" style={{ marginTop: 0 }}>{getTextoUI("fondo_ayuda")}</p>
        {familias.map((familia) => {
            const automaticos = familia.valores === null;
            return (
                <div key={familia.clave} className="fila-familia-fondo">
                    <div className="cabecera-familia-fondo">
                        <Switch
                            size="small"
                            checked={familia.activa}
                            onChange={(activa) => cambiarFamilia(familia.clave, { activa })}
                        />
                        <span style={{ marginLeft: 8 }}>
                            <MuestraTrazo familia={familia} />
                            {getTextoUI(`fondo_${familia.clave}`)} [{familia.unidad}]
                        </span>
                    </div>
                    {familia.activa && <div className="valores-familia-fondo">
                        <Radio.Group
                            size="small"
                            value={automaticos ? 'automaticos' : 'propios'}
                            onChange={(evento) => cambiarFamilia(familia.clave, {
                                // Al pasar a propios se parte de los automáticos,
                                // que es lo que se estaba viendo
                                valores: evento.target.value === 'automaticos'
                                    ? null : valoresAutomaticos(familia)
                            })}
                        >
                            <Radio.Button value="automaticos">{getTextoUI("fondo_automaticos")}</Radio.Button>
                            <Radio.Button value="propios">{getTextoUI("fondo_propios")}</Radio.Button>
                        </Radio.Group>
                        {automaticos
                            ? <Input
                                size="small"
                                disabled
                                value={formatearValores(valoresAutomaticos(familia), idioma.get())}
                            />
                            : <Tooltip title={getTextoUI("fondo_ayuda_valores")} mouseEnterDelay={0.5}>
                                <span style={{ flex: 1 }}>
                                    <CampoValores
                                        valores={familia.valores}
                                        idioma={idioma.get()}
                                        alConfirmar={(valores) => cambiarFamilia(familia.clave, { valores })}
                                    />
                                </span>
                            </Tooltip>}
                    </div>}
                </div>
            );
        })}
        <Button size="small" onClick={restablecer} style={{ marginTop: 8 }}>
            {getTextoUI("fondo_restablecer")}
        </Button>
    </div>);
};

export default PanelLineasFondo;
