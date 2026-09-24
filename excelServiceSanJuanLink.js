/**
 * excelServiceSanJuanLink.js
 *
 * Genera el Excel individual de San Juan Link.
 *
 * Layout:
 * - Resumen principal
 * - Bloque ASIENTOS
 */


const XLSX = require("xlsx");
/***
 * LIBRERIA DE ESTILOS EXCEL
 */

const estiloEncabezado = {
    font: {
        bold: true
    },

    alignment: {
        horizontal: "center",
        vertical: "center"
    },

    border: {
        top: {
            style: "thin"
        },
        bottom: {
            style: "thin"
        },
        left: {
            style: "thin"
        },
        right: {
            style: "thin"
        }
    }
};

/**
 * ESTILO DEL BORDE DE LA TABLA
 */

const estiloBorde = {
    border: {
        top: {
            style: "thin"
        },
        bottom: {
            style: "thin"
        },
        left: {
            style: "thin"
        },
        right: {
            style: "thin"
        }
    }
};


/* ============================================================
   UTILIDADES
============================================================ */

function numeroSeguro(valor) {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;
}


function fechaComoTexto(fecha) {
    if (!fecha) {
        return "";
    }

    return String(fecha).trim();
}


/* ============================================================
   GENERAR EXCEL SAN JUAN LINK
============================================================ */

function generarExcelSanJuanLink(resultado) {
    if (!resultado) {
        throw new Error(
            "No se recibieron datos para generar el Excel San Juan Link."
        );
    }


    /* ========================================================
       DATOS DEL PARSER
    ======================================================== */

    const cabecera =
        resultado.cabecera || {};

    const totales =
        resultado.totales || {};

    const cierre =
        resultado.cierre || {};

    const controles =
        resultado.controles || {};


    /* ========================================================
       CAMPOS PRINCIPALES
    ======================================================== */

    const fecha =
        fechaComoTexto(
            cabecera.fecha
        );

    const cantidad =
        numeroSeguro(
            totales.cantidad
        );

    const importeCobrar =
        numeroSeguro(
            totales.importeCobrar
        );
    const importeNetoCobrar =
        numeroSeguro(
            totales.importeNetoCobrar
        );

    /*
     * Comisiones correspondientes
     * a otros bancos.
     */
    const comisionOtrosBancos =
        numeroSeguro(
            totales.comisionesPagadas
        );

    const ivaComisionOtrosBancos =
        numeroSeguro(
            totales.comisionesIVA
        );

    /*
     * Comisiones correspondientes
     * al Banco San Juan.
     */
    const comisionBancoSanJuan =
        numeroSeguro(
            cierre
                .comisionRetencionBancoSanJuan
        );

    const ivaComisionBancoSanJuan =
        numeroSeguro(
            cierre
                .comisionImportesNetosIVA
        );

    /*
     * Importe neto definitivo informado
     * por San Juan Link.
     */
    const importeNeto =
        numeroSeguro(
            cierre.totalNeto
        );


    /* ========================================================
       FILAS DEL EXCEL
    ======================================================== */

    const filas = [];


    /* ========================================================
       RESUMEN
    ======================================================== */

    filas.push([
        "SAN JUAN LINK"
    ]);

    filas.push([]);

    const filaEncabezado =
        filas.length;

    filas.push([
        "FECHA",
        "CANTIDAD",
        "IMPORTE A COBRAR",
        "COMISIÓN OTROS BANCOS",
        "IVA COMISIÓN",
        "COMISIÓN BCO SAN JUAN",
        "IVA COMISIÓN",
        "IMPORTE NETO",
        "CONTROL"
    ]);

    const filaDatos =
        filas.length;

    filas.push([
        fecha,
        cantidad,
        importeCobrar,
        comisionOtrosBancos,
        ivaComisionOtrosBancos,
        comisionBancoSanJuan,
        ivaComisionBancoSanJuan,
        importeNeto,
        ""
    ]);

    filas.push([
        "",
        "BCO SAN JUAN CTA CTE",
        "COMISION RED LINK",
        ""
    ]);


    /* ========================================================
       CREAR HOJA
    ======================================================== */

    const hoja =
        XLSX.utils.aoa_to_sheet(
            filas
        );


    /** ======================================================== 
     * ESTILO TABLA
     ======================================================== */
    for (
    let fila = filaEncabezado;
    fila <= filaDatos;
    fila++) 
    {
        for (let columna = 1;
            columna <= 8;
            columna++) 
        {
            const referencia =
                XLSX.utils.encode_cell({
                    r: fila,
                    c: columna
            });

            if (!hoja[referencia]) {
                continue;
            }

            hoja[referencia].s =
                fila === filaEncabezado
                    ? estiloEncabezado
                    : estiloBorde;
        }
    }




    /* ========================================================
       FECHA COMO TEXTO
    ======================================================== */

    const celdaFecha =
        XLSX.utils.encode_cell({
            r: filaDatos,
            c: 0
        });

    if (hoja[celdaFecha]) {
        hoja[celdaFecha].t = "s";
    }


    /* ========================================================
       CANTIDAD COMO ENTERO
    ======================================================== */

    const celdaCantidad =
        XLSX.utils.encode_cell({
            r: filaDatos,
            c: 1
        });

    if (hoja[celdaCantidad]) {
        hoja[celdaCantidad].t = "n";
        hoja[celdaCantidad].z = "0";
    }


    /* ========================================================
       FORMATO MONETARIO
    ======================================================== */

    const formatoMoneda =
        '$ #,##0.00;[Red]-$ #,##0.00';


    /*
     * Resumen principal:
     * columnas C hasta H.
     */
    for (
        let columna = 2;
        columna <= 7;
        columna++
    ) {
        const referencia =
            XLSX.utils.encode_cell({
                r: filaDatos,
                c: columna
            });

        const celda =
            hoja[referencia];

        if (
            celda &&
            typeof celda.v === "number"
        ) {
            celda.t = "n";
            celda.z =
                formatoMoneda;
        }
    }

    /* ========================================================
       ANCHOS DE COLUMNAS
    ======================================================== */

    hoja["!cols"] = [
        { wch: 16 },
        { wch: 14 },
        { wch: 20 },
        { wch: 25 },
        { wch: 18 },
        { wch: 25 },
        { wch: 18 },
        { wch: 24 },
        { wch: 22 },
        {wch: 14 }
    ];


    /* ========================================================
       COMBINACIONES
    ======================================================== */

    hoja["!merges"] = [
        {
            s: {
                r: 0,
                c: 0
            },
            e: {
                r: 0,
                c: 9
            }
        }
    ];


    /* ========================================================
       FILTRO
    ======================================================== */

    hoja["!autofilter"] = {
        ref:
            XLSX.utils.encode_range({
                s: {
                    r: filaEncabezado,
                    c: 0
                },

                e: {
                    r: filaDatos,
                    c: 9
                }
            })
    };


    /* ========================================================
       CREAR LIBRO
    ======================================================== */

    const libro =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "San Juan Link"
    );


    /* ========================================================
       PROPIEDADES
    ======================================================== */

    libro.Props = {
        Title:
            "Liquidación San Juan Link",

        Subject:
            "Conversión TXT a Excel",

        Author:
            "INTERREDES",

        Company:
            "INTERREDES"
    };


    /* ========================================================
       DEVOLVER BUFFER
    ======================================================== */

    return XLSX.write(
        libro,
        {
            type: "buffer",
            bookType: "xlsx",
            compression: true
        }
    );
}


/* ============================================================
   EXPORTACIÓN
============================================================ */

module.exports = {
    generarExcelSanJuanLink
};