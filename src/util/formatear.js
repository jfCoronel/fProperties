export default function formatear(valor, ncifras = 4) {
	if (typeof valor === 'string') {
		return valor;
	} else {

		let valorAbs = Math.abs(valor);
		let i;

		for (i = ncifras - 1; i > -4; i--) {
			if (valorAbs > Math.pow(10, ncifras)) { // Sin decimales
				return parseFloat(valor.toFixed(ncifras - i - 1)).toString();
			}
		}
		if (valorAbs === 0.0) { // Cero redondo
			return "0";
		} else {
			return parseFloat(valor.toPrecision(ncifras)).toString();
		}
	}
}