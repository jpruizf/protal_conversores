
function normalizarFecha(valor) {
    if (!valor) {
        return null;
    }

    /*
     * Si ya es un objeto Date válido.
     */
    if (
        valor instanceof Date &&
        !Number.isNaN(valor.getTime())
    ) {
        const anio = valor.getFullYear();

        const mes = String(
            valor.getMonth() + 1
        ).padStart(2, "0");

        const dia = String(
            valor.getDate()
        ).padStart(2, "0");

        return `${anio}-${mes}-${dia}`;
    }

    /*
     * Fechas en formato:
     *
     * DD/MM/AA
     * DD/MM/AAAA
     */
    const texto =
        String(valor).trim();

    const coincidencia =
        texto.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/
        );

    if (coincidencia) {
        const dia = Number(
            coincidencia[1]
        );

        const mes = Number(
            coincidencia[2]
        );

        let anio = Number(
            coincidencia[3]
        );

        /*
         * 26 → 2026
         */
        if (anio < 100) {
            anio += 2000;
        }

        const fecha =
            new Date(
                anio,
                mes - 1,
                dia
            );

        /*
         * Evita aceptar fechas imposibles,
         * por ejemplo 31/02/26.
         */
        if (
            fecha.getFullYear() !== anio ||
            fecha.getMonth() !== mes - 1 ||
            fecha.getDate() !== dia
        ) {
            throw new Error(
                `Fecha inválida encontrada: ${valor}`
            );
        }

        return [
            anio,
            String(mes).padStart(2, "0"),
            String(dia).padStart(2, "0")
        ].join("-");
    }

    /*
     * Mantener compatibilidad con otros
     * formatos que JavaScript ya reconoce.
     */
    const fecha =
        new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        throw new Error(
            `Fecha inválida encontrada: ${valor}`
        );
    }

    const anio =
        fecha.getFullYear();

    const mes =
        String(
            fecha.getMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            fecha.getDate()
        ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function aCentavos(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return 0;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        throw new Error(
            `Importe inválido encontrado: ${valor}`
        );
    }

    return Math.round(numero * 100);
}


module.exports = {
    normalizarFecha,
    aCentavos
};