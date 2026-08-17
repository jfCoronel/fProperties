// Formato serializado del problema: la misma unidad viaja en el permalink, en el
// JSON descargado y en la importación. Versionado desde el primer enlace
// publicado, porque un enlace compartido sobrevive a la versión que lo generó
// (DOCUMENTACION.md §2).
//
// Este fichero es puro: no toca hookstate, ni el DOM, ni CoolProp. Solo convierte
// entre el objeto problema y su representación textual, y normaliza lo que llega
// de fuera. Todo lo que entra por un enlace es entrada no fiable: normalizar
// campo a campo evita que un hash manipulado inyecte claves arbitrarias en el
// estado de la aplicación.

export const ESQUEMA_PROBLEMA = 1;

// El permalink va en el fragmento (#): no viaja al servidor y no necesita
// rewrites en GitHub Pages.
export const CLAVE_HASH = 'p';

const MARCA_COMPRIMIDO = 'z';
const MARCA_PLANO = 'j';

// Claves de configuración que forman parte del enunciado compartido. La lista es
// explícita a propósito: lo que no esté aquí (selecciones, diálogos abiertos,
// textos cargados) es estado de sesión y no debe viajar.
//
// Quitar una clave de aquí es compatible hacia atrás sin subir la versión del
// esquema: normalizarConfiguracion solo copia las que están en la lista, así que
// un enlace antiguo que traiga claves ya retiradas —las del panel del
// psicrométrico, que desapareció al unificar los dos diagramas— se abre igual y
// simplemente las ignora.
export const CLAVES_CONFIGURACION = [
  'menuActual',
  'idioma',
  'nCifras',
  'columnasTablaFluidos',
  'columnasTablaAires',
  'tipoDiagrama',
  'fluidoDiagrama',
  'tipoPsicrometrico',
  'opcionPsicrometrico',
  'valorOpcionPsicrometrico'
];

const hayCompresion =
  typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

function bytesABase64url(bytes) {
  let binario = '';
  for (let i = 0; i < bytes.length; i++) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64urlABytes(texto) {
  const base64 = texto.replaceAll('-', '+').replaceAll('_', '/');
  const resto = base64.length % 4;
  const relleno = resto === 0 ? '' : '='.repeat(4 - resto);
  const binario = atob(base64 + relleno);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

async function pasarPorFlujo(bytes, transformador) {
  const flujo = new Blob([bytes]).stream().pipeThrough(transformador);
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

/**
 * Objeto problema → carga útil textual, apta para un fragmento de URL.
 *
 * Deflate-raw es nativo en los navegadores modernos, así que no añade
 * dependencia. La marca inicial ('z' comprimido, 'j' plano) permite degradar
 * donde CompressionStream no exista sin romper la decodificación.
 */
export async function codificarProblema(problema) {
  const bytes = new TextEncoder().encode(JSON.stringify(problema));
  if (!hayCompresion) {
    return MARCA_PLANO + bytesABase64url(bytes);
  }
  const comprimido = await pasarPorFlujo(bytes, new CompressionStream('deflate-raw'));
  return MARCA_COMPRIMIDO + bytesABase64url(comprimido);
}

export async function decodificarProblema(carga) {
  let texto;
  try {
    const marca = carga.slice(0, 1);
    const bytes = base64urlABytes(carga.slice(1));
    if (marca === MARCA_COMPRIMIDO) {
      const plano = await pasarPorFlujo(bytes, new DecompressionStream('deflate-raw'));
      texto = new TextDecoder().decode(plano);
    } else if (marca === MARCA_PLANO) {
      texto = new TextDecoder().decode(bytes);
    } else {
      throw new Error('marca desconocida');
    }
  } catch {
    throw new Error('error_problema_ilegible');
  }
  return normalizarProblema(JSON.parse(texto));
}

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

function normalizarEstadoFluido(estado) {
  if (!esObjeto(estado)) return null;
  if (typeof estado.id !== 'string' || typeof estado.fluido !== 'string') return null;
  return {
    id: estado.id,
    nombre: String(estado.nombre ?? estado.id),
    fluido: estado.fluido,
    in1Id: String(estado.in1Id ?? 'T'),
    in2Id: String(estado.in2Id ?? 'P'),
    in1Val: Number(estado.in1Val),
    in2Val: Number(estado.in2Val),
    // Campo añadido después de la 2.1.0. Se lee como "visible salvo que diga
    // que no", así que los enlaces anteriores siguen abriéndose con todo
    // dibujado y no hace falta subir la versión del esquema.
    enDiagrama: estado.enDiagrama !== false
  };
}

function normalizarEstadoAire(estado) {
  if (!esObjeto(estado)) return null;
  if (typeof estado.id !== 'string') return null;
  return {
    id: estado.id,
    nombre: String(estado.nombre ?? estado.id),
    in1Id: String(estado.in1Id ?? 'A'),
    in2Id: String(estado.in2Id ?? 'T'),
    in3Id: String(estado.in3Id ?? 'HR'),
    in1Val: Number(estado.in1Val),
    in2Val: Number(estado.in2Val),
    in3Val: Number(estado.in3Val),
    // Igual que en los estados de fluido: "visible salvo que diga que no", de
    // modo que los enlaces anteriores a la 2.3.0 se abren con todo dibujado.
    enDiagrama: estado.enDiagrama !== false
  };
}

// Los parámetros son numéricos y opcionales: un valor no numérico se descarta en
// vez de propagarse hasta el resolvedor.
function normalizarParametros(parametros) {
  const limpios = {};
  if (!esObjeto(parametros)) return limpios;
  Object.entries(parametros).forEach(([clave, valor]) => {
    const numero = Number(valor);
    if (Number.isFinite(numero)) {
      limpios[clave] = numero;
    }
  });
  return limpios;
}

function normalizarProceso(proceso) {
  if (!esObjeto(proceso)) return null;
  if (typeof proceso.id !== 'string' || typeof proceso.tipo !== 'string') return null;

  const origenes = Array.isArray(proceso.origenes) ? proceso.origenes : [];
  const estilo = esObjeto(proceso.estilo) ? proceso.estilo : {};

  return {
    id: proceso.id,
    origenes: origenes.map((id) => (typeof id === 'string' ? id : null)),
    destino: typeof proceso.destino === 'string' ? proceso.destino : null,
    tipo: proceso.tipo,
    modoDestino: proceso.modoDestino === 'calculado' ? 'calculado' : 'manual',
    parametros: normalizarParametros(proceso.parametros),
    enDiagrama: proceso.enDiagrama !== false,
    estilo: {
      color: String(estilo.color ?? '#1890FF'),
      grosor: Number.isFinite(Number(estilo.grosor)) ? Number(estilo.grosor) : 2,
      trazo: estilo.trazo === 'dashed' ? 'dashed' : 'solid'
    }
  };
}

function normalizarConfiguracion(configuracion) {
  const limpia = {};
  if (!esObjeto(configuracion)) return limpia;
  CLAVES_CONFIGURACION.forEach((clave) => {
    if (configuracion[clave] !== undefined) {
      limpia[clave] = configuracion[clave];
    }
  });
  return limpia;
}

/**
 * Valida y limpia un problema recién parseado. Lanza con una clave i18n si el
 * esquema no encaja: un enlace generado por una versión futura debe dar un
 * mensaje claro, no un fallo a medias.
 */
export function normalizarProblema(datos) {
  if (!esObjeto(datos)) {
    throw new Error('error_problema_ilegible');
  }
  if (datos.v !== ESQUEMA_PROBLEMA) {
    throw new Error('error_problema_version');
  }

  const filtrar = (lista, normalizar) =>
    (Array.isArray(lista) ? lista : []).map(normalizar).filter((elemento) => elemento !== null);

  return {
    v: ESQUEMA_PROBLEMA,
    estados: filtrar(datos.estados, normalizarEstadoFluido),
    aires: filtrar(datos.aires, normalizarEstadoAire),
    procesos: filtrar(datos.procesos, normalizarProceso),
    configuracion: normalizarConfiguracion(datos.configuracion)
  };
}
