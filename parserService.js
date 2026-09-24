export function convertirImporte(texto) {
    if (!texto) {
        return 0;
    }

    return Number(
        texto
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
    );
}

export function parsearLineaResumen(linea) {
    /*
        Busca:
        - Nombre del banco
        - Cantidad
        - Ocho columnas monetarias
    */
    const patron =
        /^(.+?)\s+(\d+)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/;

    const coincidencia = linea.match(patron);

    if (!coincidencia) {
        return null;
    }

    return {
        bancoEmisor: coincidencia[1].trim(),
        cantidad: Number(coincidencia[2]),
        importeCobrar: convertirImporte(coincidencia[3]),
        comisionesPagadas: convertirImporte(coincidencia[4]),
        ivaComisiones: convertirImporte(coincidencia[5]),
        percepcion: convertirImporte(coincidencia[6]),
        retencionIVA: convertirImporte(coincidencia[7]),
        retencionGanancias: convertirImporte(coincidencia[8]),
        retencionIIBB: convertirImporte(coincidencia[9]),
        importeNeto: convertirImporte(coincidencia[10])
    };
}

export function parsearFechaResumen(contenido) {
    const coincidencia = contenido.match(
        /FECHA\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i
    );

    if (!coincidencia) {
        return "";
    }

    const [, dia, mes, anio] = coincidencia;

    return `${dia}/${mes}/${anio}`;
}

export function parsearTotalesResumen(linea) {
    const patron =
        /T\s*O\s*T\s*A\s*L\s*E\s*S\s+(\d+)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i;

    const coincidencia = linea.match(patron);

    if (!coincidencia) {
        return null;
    }

    return {
        cantidad: Number(coincidencia[1]),
        importeCobrar: convertirImporte(coincidencia[2]),
        comisionesPagadas: convertirImporte(coincidencia[3]),
        ivaComisiones: convertirImporte(coincidencia[4]),
        percepcion: convertirImporte(coincidencia[5]),
        retencionIVA: convertirImporte(coincidencia[6]),
        retencionGanancias: convertirImporte(coincidencia[7]),
        retencionIIBB: convertirImporte(coincidencia[8]),
        importeNeto: convertirImporte(coincidencia[9])
    };
}

export function parsearBancoAdherente(linea) {
    const importes = linea.match(/[\d.]+,\d{2}/g);

    if (!importes || importes.length < 2) {
        return null;
    }

    return {
        comisionBancoAdherente: convertirImporte(importes[0]),
        ivaBancoAdherente: convertirImporte(importes[1])
    };
}

export function parsearTotalNeto(linea) {
    const coincidencia = linea.match(
        /TOTAL\s+NETO\s+([\d.]+,\d{2})/i
    );

    return coincidencia
        ? convertirImporte(coincidencia[1])
        : null;
}