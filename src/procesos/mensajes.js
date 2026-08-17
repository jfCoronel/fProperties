// Traduce los mensajes {clave, datos} que devuelve el motor a texto localizado.
// El motor no sabe de idiomas: emite claves, y la interpolación ocurre aquí.
import { getTextoUI } from '../configuracion';
import { PROPIEDADES_FLUIDOS, UNIDADES_FLUIDOS } from '../propFluidos/fluidos';
import { PROPIEDADES_AIRES, UNIDADES_AIRES } from '../propFluidos/aires';
import formatear from '../util/formatear';

export function textoMensaje(mensaje, nCifras = 4) {
  const datos = { ...mensaje.datos };

  // Los avisos sobre una magnitud traen su clave interna ("P"); la plantilla
  // quiere el símbolo y la unidad que ve el usuario.
  //
  // Se consultan los dos dominios porque el mensaje no dice de cuál viene, y no
  // hace falta que lo diga: las claves que comparten (T, p, h, s) significan lo
  // mismo y se escriben igual en los dos, y las que no —w, T_h, ϕ— solo existen
  // en uno.
  if (datos.magnitud) {
    datos.simbolo = PROPIEDADES_FLUIDOS[datos.magnitud]
      ?? PROPIEDADES_AIRES[datos.magnitud] ?? datos.magnitud;
    datos.unidad = UNIDADES_FLUIDOS[datos.magnitud] ?? UNIDADES_AIRES[datos.magnitud] ?? '';
  }

  // Los errores de parámetros traen claves i18n, no nombres: el motor no sabe
  // en qué idioma se le está leyendo.
  if (datos.parametro) {
    datos.parametro = getTextoUI(datos.parametro);
  }
  if (Array.isArray(datos.parametros)) {
    datos.parametros = datos.parametros.map((clave) => getTextoUI(clave)).join(' / ');
  }

  let texto = getTextoUI(mensaje.clave);
  Object.entries(datos).forEach(([clave, valor]) => {
    const representacion = typeof valor === 'number' ? formatear(valor, nCifras) : String(valor);
    texto = texto.split(`{${clave}}`).join(representacion);
  });
  return texto;
}
