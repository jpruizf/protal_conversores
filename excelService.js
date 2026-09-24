const XLSX = window.XLSX;

export function generarExcelWeb(
    datos,
    resumenReporte = null,
    nombreArchivo = "Reporte_Pagos_Link.xlsx"
) {
    console.log("Entró a generarExcelWeb");

    if (!XLSX) {
        throw new Error(
            "No se pudo cargar la librería XLSX. Verificá la conexión o el archivo local de la librería."
        );
    }

    if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error("No hay registros para exportar.");
    }

    const datosMapeados = datos.map((registro) => ({
        "FECHA": registro.fecha || "",
        "BANCO EMISOR": registro.bancoEmisor || "",
        "CANTIDAD": registro.cantidad || 0,
        "IMP. A COBRAR": registro.importeCobrar || 0,
        "COMISIONES PAGADAS": registro.comisionesPagadas || 0,
        "IVA COMISIONES": registro.ivaComisiones || 0,
        "PERCEPCION": registro.percepcion || 0,
        "RETENCION IVA": registro.retencionIVA || 0,
        "RETENCION GANANCIAS": registro.retencionGanancias || 0,
        "RETENCION IIBB": registro.retencionIIBB || 0,
        "IMPORTE NETO": registro.importeNeto || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosMapeados);

    /*
     * Agregar resumen al final de la tabla.
     */
    if (resumenReporte) {
        let filaActual = datosMapeados.length + 3;

        const filasResumen = [
            [],
            ["RESUMEN DEL REPORTE"],
            ["Fecha", resumenReporte.fecha || ""]
        ];

        if (resumenReporte.totales) {
            filasResumen.push(
                [],
                ["TOTALES GENERALES"],
                ["Cantidad total", resumenReporte.totales.cantidad || 0],
                [
                    "Importe a cobrar",
                    resumenReporte.totales.importeCobrar || 0
                ],
                [
                    "Comisiones pagadas",
                    resumenReporte.totales.comisionesPagadas || 0
                ],
                [
                    "IVA comisiones",
                    resumenReporte.totales.ivaComisiones || 0
                ],
                [
                    "Percepción",
                    resumenReporte.totales.percepcion || 0
                ],
                [
                    "Retención IVA",
                    resumenReporte.totales.retencionIVA || 0
                ],
                [
                    "Retención ganancias",
                    resumenReporte.totales.retencionGanancias || 0
                ],
                [
                    "Retención IIBB",
                    resumenReporte.totales.retencionIIBB || 0
                ],
                [
                    "Importe neto emisores",
                    resumenReporte.totales.importeNeto || 0
                ]
            );
        }

        if (resumenReporte.bancoAdherente) {
            filasResumen.push(
                [],
                ["BANCO ADHERENTE"],
                [
                    "Comisión Banco Adherente",
                    resumenReporte.bancoAdherente
                        .comisionBancoAdherente || 0
                ],
                [
                    "IVA Banco Adherente",
                    resumenReporte.bancoAdherente
                        .ivaBancoAdherente || 0
                ]
            );
        }

        if (
            resumenReporte.totalNeto !== null &&
            resumenReporte.totalNeto !== undefined
        ) {
            filasResumen.push(
                [],
                ["TOTAL NETO", resumenReporte.totalNeto]
            );
        }

        XLSX.utils.sheet_add_aoa(
            worksheet,
            filasResumen,
            {
                origin: `A${filaActual}`
            }
        );
    }

    /*
     * Formato de importes.
     */
    aplicarFormatoMoneda(
        worksheet,
        datosMapeados.length,
        [
            3, 4, 5, 6, 7, 8, 9, 10
        ]
    );

    /*
     * Ajuste del ancho de las columnas.
     */
    worksheet["!cols"] = [
        { wch: 14 },
        { wch: 32 },
        { wch: 12 },
        { wch: 18 },
        { wch: 20 },
        { wch: 16 },
        { wch: 15 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 }
    ];

    /*
     * Aplicar autofiltro a la tabla principal.
     */
    worksheet["!autofilter"] = {
        ref: `A1:K${datosMapeados.length + 1}`
    };

    /*
     * Congelar encabezados.
     */
    worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1
    };

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Pagos Link"
    );

    XLSX.writeFile(
        workbook,
        nombreArchivo
    );
}

function aplicarFormatoMoneda(
    worksheet,
    cantidadRegistros,
    columnasMonetarias
) {
    /*
     * Los datos comienzan en la fila 2 porque
     * la fila 1 contiene los encabezados.
     */
    for (
        let fila = 2;
        fila <= cantidadRegistros + 1;
        fila++
    ) {
        for (const columna of columnasMonetarias) {
            const referencia = XLSX.utils.encode_cell({
                r: fila - 1,
                c: columna
            });

            if (worksheet[referencia]) {
                worksheet[referencia].t = "n";
                worksheet[referencia].z =
                    '$ #,##0.00';
            }
        }
    }
}