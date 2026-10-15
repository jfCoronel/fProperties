import { useState } from 'react';
import { Button, ColorPicker } from 'antd';
import { getTextoUI } from '../configuracion';
import { COLORES_PROCESOS } from '../procesos/listaProcesos';

// Los automáticos de los procesos y los que más se piden en un diagrama
const COLORES_HABITUALES = [
    ...COLORES_PROCESOS,
    '#000000', '#595959', '#EB2F96', '#2F54EB', '#A0D911', '#874D00'
];

// Paleta de colores habituales; el selector libre, solo si se pide
const SelectorColor = ({ value, onChange }) => {
    const [libre, setLibre] = useState(false);

    return (
        <ColorPicker
            value={value}
            disabledAlpha
            presets={[{ label: getTextoUI("lab_colores_habituales"), colors: COLORES_HABITUALES }]}
            onOpenChange={(abierto) => { if (!abierto) setLibre(false); }}
            onChange={(_, hex) => onChange(hex)}
            panelRender={(_, { components: { Picker, Presets } }) => (
                <div style={{ width: 234 }}>
                    <Presets />
                    {libre
                        ? <Picker />
                        : <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setLibre(true)}>
                            {getTextoUI("btn_otro_color")}
                        </Button>}
                </div>
            )}
        />
    );
};

export default SelectorColor;
