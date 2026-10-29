// ¿El dispositivo principal no sabe "pasar por encima"? Es el caso de tablets y
// móviles: ahí no hay hover y la interfaz cambia la forma de dar las ayudas.
// Se decide una vez al cargar; fuera del navegador (tests) cuenta como ratón.
export const ES_TACTIL = typeof window !== 'undefined'
  && window.matchMedia?.('(hover: none)').matches === true;
