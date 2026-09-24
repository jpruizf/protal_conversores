/**
 * Detecta el formato del archivo de tarjetas
 * basándose en el contenido de la cabecera.
 */
function detectarFormato(primeraLinea) {
    if (!primeraLinea) {
        return 'RDEBLIQD';
    }

    if (primeraLinea.includes('LDEBLIQD')) {
        return 'LDEBLIQD';
    }

    if (primeraLinea.includes('RDEBLIQD')) {
        return 'RDEBLIQD';
    }

    if (
        primeraLinea.includes('RDEBLIQC') ||
        primeraLinea.includes('DEBLIQC')
    ) {
        return 'DEBLIQC';
    }

    if (primeraLinea.includes('LIQC')) {
        return 'LIQC';
    }

    return 'RDEBLIQD';
}

module.exports = {
    detectarFormato
};