/* ========================================================
   CONCILIADOR DE PAGOS
======================================================== */


/* ========================================================
   CONFIGURACIÓN
======================================================== */

const RANGOS_BUSQUEDA = [
    0,
    1,
    2,
    3,
    5,
    7
];


/*
 * Máxima cantidad de asientos consecutivos
 * del Mayor que pueden formar un grupo.
 */
const MAX_ASIENTOS_GRUPO = 10;


/*
 * Máxima cantidad de liquidaciones utilizadas
 * para construir el bruto de un grupo.
 */
const MAX_LIQUIDACIONES_GRUPO = 30;


/*
 * Diferencia admitida para Banco.
 *
 * 5 centavos permite casos como:
 *
 * Neto liquidaciones = 10.709.455,01
 * Banco              = 10.709.454,99
 *
 * Diferencia = 0,02
 */
const TOLERANCIA_BANCO_CENTAVOS = 5;


/* ========================================================
   FECHAS
======================================================== */

function fechaADate(fecha) {

    const [
        anio,
        mes,
        dia
    ] =
        fecha
            .split("-")
            .map(Number);


    return new Date(
        anio,
        mes - 1,
        dia
    );
}


/**
 * Diferencia absoluta entre dos fechas.
 */
function diferenciaDias(
    fechaA,
    fechaB
) {

    const a =
        fechaADate(
            fechaA
        );

    const b =
        fechaADate(
            fechaB
        );


    const diferencia =
        Math.abs(
            a.getTime() -
            b.getTime()
        );


    return Math.round(
        diferencia /
        (
            1000 *
            60 *
            60 *
            24
        )
    );
}


/**
 * Calcula la distancia entre una fecha
 * y un intervalo.
 *
 * Si la fecha está dentro del intervalo,
 * devuelve 0.
 */
function distanciaAIntervalo(
    fecha,
    fechaDesde,
    fechaHasta
) {

    const fechaDate =
        fechaADate(
            fecha
        );

    const desde =
        fechaADate(
            fechaDesde
        );

    const hasta =
        fechaADate(
            fechaHasta
        );


    if (
        fechaDate >= desde &&
        fechaDate <= hasta
    ) {
        return 0;
    }


    if (
        fechaDate < desde
    ) {
        return diferenciaDias(
            fecha,
            fechaDesde
        );
    }


    return diferenciaDias(
        fecha,
        fechaHasta
    );
}






/* ========================================================
   BÚSQUEDA GENÉRICA DE COMBINACIONES
======================================================== */

/**
 * Busca una combinación de elementos cuyo monto
 * alcance el objetivo.
 *
 * obtenerMonto:
 * función que devuelve el importe en centavos.
 *
 * tolerancia:
 * diferencia máxima permitida.
 */
function buscarCombinacionMontos(
    elementos,
    objetivoCentavos,
    obtenerMonto,
    maxElementos,
    tolerancia = 0
) {

    const disponibles =
        elementos
            .filter(
                elemento => {

                    const monto =
                        obtenerMonto(
                            elemento
                        );


                    return (
                        monto > 0 &&
                        monto <=
                            objetivoCentavos +
                            tolerancia
                    );
                }
            )
            .sort(
                (a, b) =>
                    obtenerMonto(b) -
                    obtenerMonto(a)
            );


    /*
     * Primero buscamos coincidencia directa.
     */
    for (
        const elemento
        of disponibles
    ) {

        const diferencia =
            Math.abs(
                obtenerMonto(
                    elemento
                ) -
                objetivoCentavos
            );


        if (
            diferencia <=
            tolerancia
        ) {

            return [
                elemento
            ];
        }
    }


    const sumaRestante =
        new Array(
            disponibles.length + 1
        ).fill(0);


    for (
        let i =
            disponibles.length - 1;
        i >= 0;
        i--
    ) {

        sumaRestante[i] =
            sumaRestante[i + 1] +
            obtenerMonto(
                disponibles[i]
            );
    }


    const seleccion = [];

    let mejor =
        null;

    let mejorDiferencia =
        Infinity;


    const estadosVisitados =
        new Set();


    function buscar(
        indice,
        sumaActual
    ) {

        const diferencia =
            Math.abs(
                objetivoCentavos -
                sumaActual
            );


        /*
         * Encontramos una combinación
         * dentro de la tolerancia.
         */
        if (
            diferencia <=
            tolerancia
        ) {

            if (
                diferencia <
                    mejorDiferencia ||
                (
                    diferencia ===
                        mejorDiferencia &&
                    (
                        !mejor ||
                        seleccion.length <
                            mejor.length
                    )
                )
            ) {

                mejor =
                    [
                        ...seleccion
                    ];

                mejorDiferencia =
                    diferencia;
            }

            return;
        }


        if (
            sumaActual >
            objetivoCentavos +
                tolerancia
        ) {
            return;
        }


        if (
            indice >=
            disponibles.length
        ) {
            return;
        }


        if (
            seleccion.length >=
            maxElementos
        ) {
            return;
        }


        if (
            sumaActual +
                sumaRestante[indice] <
            objetivoCentavos -
                tolerancia
        ) {
            return;
        }


        const clave =
            `${indice}|${sumaActual}|${seleccion.length}`;


        if (
            estadosVisitados.has(
                clave
            )
        ) {
            return;
        }


        estadosVisitados.add(
            clave
        );


        const elemento =
            disponibles[indice];

        const monto =
            obtenerMonto(
                elemento
            );


        /*
         * Usar.
         */
        if (
            sumaActual + monto <=
            objetivoCentavos +
                tolerancia
        ) {

            seleccion.push(
                elemento
            );


            buscar(
                indice + 1,
                sumaActual + monto
            );


            seleccion.pop();
        }


        /*
         * Omitir.
         */
        buscar(
            indice + 1,
            sumaActual
        );
    }


    buscar(
        0,
        0
    );


    return mejor;


}





/* ========================================================
   MAYOR ↔ LIQUIDACIONES
======================================================== */

/**
 * Nueva lógica:
 *
 * VARIOS asientos del Mayor
 * =
 * VARIAS liquidaciones
 *
 * Los asientos se agrupan respetando
 * estrictamente el orden temporal.
 */
function conciliarMayorLiquidaciones(
    mayor,
    liquidaciones
) {

    const mayorOrdenado =
        [...mayor]
            .sort(
                (a, b) =>
                    a.fecha.localeCompare(
                        b.fecha
                    )
            );


    const liquidacionesTrabajo =
        liquidaciones.map(
            liquidacion => ({
                ...liquidacion,
                utilizada: false
            })
        );


    const resultados = [];

    const mayorSinConciliar = [];


    let indiceMayor = 0;

    let numeroGrupo = 1;


    while (
        indiceMayor <
        mayorOrdenado.length
    ) {

        let coincidenciaGrupo =
            null;


        /*
         * Probamos grupos progresivos:
         *
         * 1 asiento
         * 2 asientos
         * 3 asientos
         * ...
         */
        for (
            let cantidadAsientos = 1;
            cantidadAsientos <=
                MAX_ASIENTOS_GRUPO;
            cantidadAsientos++
        ) {

            const fin =
                indiceMayor +
                cantidadAsientos;


            if (
                fin >
                mayorOrdenado.length
            ) {
                break;
            }


            const grupoMayor =
                mayorOrdenado.slice(
                    indiceMayor,
                    fin
                );


            const totalMayorCentavos =
                grupoMayor.reduce(
                    (
                        acumulado,
                        registro
                    ) =>
                        acumulado +
                        registro
                            .debeCentavos,

                    0
                );


            const fechaDesde =
                grupoMayor[0]
                    .fecha;


            const fechaHasta =
                grupoMayor[
                    grupoMayor.length - 1
                ].fecha;


            /*
             * Expandimos progresivamente
             * la ventana temporal.
             */
            for (
                const rango
                of RANGOS_BUSQUEDA
            ) {

                const candidatas =
    liquidacionesTrabajo
        .filter(
            liquidacion => {

                if (
                    liquidacion.utilizada
                ) {
                    return false;
                }

                const distancia =
                    distanciaAIntervalo(
                        liquidacion.fecha,
                        fechaDesde,
                        fechaHasta
                    );

                return (
                    distancia <= rango
                );
            }
        );


                if (
                    candidatas.length === 0
                ) {
                    continue;
                }

                
            console.log(
                `[PRUEBA GRUPO] ` +
                `DESDE=${fechaDesde} | ` +
                `HASTA=${fechaHasta} | ` +
                `ASIENTOS=${grupoMayor.length} | ` +
                `TOTAL_MAYOR=${(
                    totalMayorCentavos / 100
                ).toFixed(2)} | ` +
                `RANGO=${rango} | ` +
                `CANDIDATAS=${candidatas.length}`
            );


                const combinacion =
                    buscarCombinacionMontos(

                        candidatas,

                        totalMayorCentavos,

                        liquidacion =>
                            liquidacion
                                .brutoCentavos,

                        MAX_LIQUIDACIONES_GRUPO,

                        0
                    );


                if (!combinacion) {
                    continue;
                }


                const totalBrutoEncontrado =
                combinacion.reduce(
                (acumulado, liquidacion) =>
                    acumulado +
                    liquidacion.brutoCentavos,0);


                console.log(
                `[GRUPO ENCONTRADO] ` +
                `DESDE=${fechaDesde} | ` +
                `HASTA=${fechaHasta} | ` +
                `ASIENTOS=${grupoMayor.length} | ` +
                `MAYOR=${( totalMayorCentavos / 100
                ).toFixed(2)} | ` +
                `BRUTO=${(
                    totalBrutoEncontrado / 100
                ).toFixed(2)} | ` +
                `LIQ=${combinacion.length} | ` +
                `RANGO=${rango}`);


                coincidenciaGrupo = {

                    grupoMayor,

                    combinacion,

                    totalMayorCentavos,

                    fechaDesde,

                    fechaHasta,

                    rango
                };


                break;
            }


            if (
                coincidenciaGrupo
            ) {
                break;
            }
        }


        /* ====================================================
           NO SE ENCONTRÓ GRUPO
        ==================================================== */

        if (
            !coincidenciaGrupo
        ) {

            const registroMayor =
                mayorOrdenado[
                    indiceMayor
                ];


            mayorSinConciliar.push(
                registroMayor
            );


            resultados.push({

                grupo:
                    null,

                asiento:
                    registroMayor.asiento,

                asientos: [
                    registroMayor.asiento
                ],

                cantidadAsientos:
                    1,

                fecha:
                    registroMayor.fecha,

                fechaDesdeMayor:
                    registroMayor.fecha,

                fechaHastaMayor:
                    registroMayor.fecha,

                detalle:
                    registroMayor.detalle,

                mayorCentavos:
                    registroMayor
                        .debeCentavos,

                brutoLiquidacionesCentavos:
                    0,

                netoLiquidacionesCentavos:
                    0,

                cantidadLiquidaciones:
                    0,

                rangoDias:
                    null,

                liquidaciones:
                    [],

                estado:
                    "SIN_LIQUIDACION"
            });


            indiceMayor++;

            continue;
        }


        /* ====================================================
           GRUPO ENCONTRADO
        ==================================================== */

        const {
            grupoMayor,
            combinacion,
            totalMayorCentavos,
            fechaDesde,
            fechaHasta,
            rango
        } =
            coincidenciaGrupo;


        const idsSeleccionados =
            new Set(
                combinacion.map(
                    liquidacion =>
                        liquidacion.id
                )
            );


        for (
            const liquidacion
            of liquidacionesTrabajo
        ) {

            if (
                idsSeleccionados.has(
                    liquidacion.id
                )
            ) {

                liquidacion.utilizada =
                    true;
            }
        }


        const totalBruto =
            combinacion.reduce(
                (
                    acumulado,
                    liquidacion
                ) =>
                    acumulado +
                    liquidacion
                        .brutoCentavos,

                0
            );


        const totalNeto =
            combinacion.reduce(
                (
                    acumulado,
                    liquidacion
                ) =>
                    acumulado +
                    liquidacion
                        .netoCentavos,

                0
            );


        const asientos =
            grupoMayor.map(
                item =>
                    item.asiento
            );


        resultados.push({

            grupo:
                numeroGrupo,

            /*
             * Se mantienen estos campos
             * para compatibilidad con el
             * Excel actual.
             */
            asiento:
                asientos.join(
                    " + "
                ),

            fecha:
                fechaDesde,

            detalle:
                grupoMayor
                    .map(
                        item =>
                            item.detalle
                    )
                    .filter(Boolean)
                    .join(" | "),

            mayorCentavos:
                totalMayorCentavos,

            brutoLiquidacionesCentavos:
                totalBruto,

            netoLiquidacionesCentavos:
                totalNeto,

            cantidadLiquidaciones:
                combinacion.length,

            rangoDias:
                rango,

            liquidaciones:
                combinacion,


            /*
             * Nuevos campos de grupo.
             */
            asientos,

            cantidadAsientos:
                grupoMayor.length,

            fechaDesdeMayor:
                fechaDesde,

            fechaHastaMayor:
                fechaHasta,

            registrosMayor:
                grupoMayor,

            estado:
                "MAYOR_LIQUIDACION_OK"
        });


        indiceMayor +=
            grupoMayor.length;


        numeroGrupo++;
    }


    const liquidacionesSinUsar =
        liquidacionesTrabajo
            .filter(
                liquidacion =>
                    !liquidacion.utilizada
            );


    return {

        resultados,

        mayorSinConciliar,

        liquidacionesSinUsar
    };
}


/* ========================================================
   GRUPO CONCILIADO ↔ BANCO
======================================================== */

/**
 * El banco se compara contra el NETO
 * de las liquidaciones que formaron
 * cada grupo Mayor ↔ Liquidaciones.
 */
function conciliarGruposBanco(
    gruposMayorLiquidaciones,
    banco
) {

    const bancoTrabajo =
        banco.map(
            (
                movimiento,
                indice
            ) => ({

                ...movimiento,

                idBanco:
                    indice,

                utilizada:
                    false
            })
        );


    const resultados = [];


    for (
        const grupo
        of gruposMayorLiquidaciones
    ) {

        /*
         * Si el grupo ni siquiera pudo
         * conciliar Mayor ↔ Liquidaciones,
         * no intentamos Banco.
         */
        if (
            grupo.estado !==
            "MAYOR_LIQUIDACION_OK"
        ) {
            continue;
        }


        const objetivoNeto =
            grupo
                .netoLiquidacionesCentavos;


        let combinacionBanco =
            null;

        let rangoBanco =
            null;


        for (
            const rango
            of RANGOS_BUSQUEDA
        ) {

            const candidatas =
                bancoTrabajo
                    .filter(
                        movimiento => {

                            if (
                                movimiento
                                    .utilizada
                            ) {
                                return false;
                            }


                            const distancia =
                                distanciaAIntervalo(
                                    movimiento.fecha,

                                    grupo
                                        .fechaDesdeMayor,

                                    grupo
                                        .fechaHastaMayor
                                );


                            return (
                                distancia <=
                                rango
                            );
                        }
                    );


            if (
                candidatas.length === 0
            ) {
                continue;
            }


            combinacionBanco =
                buscarCombinacionMontos(

                    candidatas,

                    objetivoNeto,

                    movimiento =>
                        movimiento
                            .creditoCentavos,

                    20,

                    TOLERANCIA_BANCO_CENTAVOS
                );


            if (
                combinacionBanco
            ) {

                rangoBanco =
                    rango;

                break;
            }
        }


        /* ====================================================
           SIN BANCO
        ==================================================== */

        if (
            !combinacionBanco
        ) {

            resultados.push({

                grupo:
                    grupo.grupo,

                fecha:
                    grupo.fecha,

                fechaDesdeMayor:
                    grupo
                        .fechaDesdeMayor,

                fechaHastaMayor:
                    grupo
                        .fechaHastaMayor,

                netoLiquidacionesCentavos:
                    objetivoNeto,

                bancoCentavos:
                    0,

                diferenciaCentavos:
                    objetivoNeto,

                cantidadLiquidaciones:
                    grupo
                        .cantidadLiquidaciones,

                cantidadMovimientosBanco:
                    0,

                rangoDias:
                    null,

                movimientosBanco:
                    [],

                estado:
                    "FALTA_BANCO"
            });


            continue;
        }


        /* ====================================================
           BANCO ENCONTRADO
        ==================================================== */

        const idsBanco =
            new Set(
                combinacionBanco.map(
                    movimiento =>
                        movimiento
                            .idBanco
                )
            );


        for (
            const movimiento
            of bancoTrabajo
        ) {

            if (
                idsBanco.has(
                    movimiento.idBanco
                )
            ) {

                movimiento.utilizada =
                    true;
            }
        }


        const totalBanco =
            combinacionBanco.reduce(
                (
                    acumulado,
                    movimiento
                ) =>
                    acumulado +
                    movimiento
                        .creditoCentavos,

                0
            );


        const diferencia =
            Math.abs(
                objetivoNeto -
                totalBanco
            );


        resultados.push({

            grupo:
                grupo.grupo,

            fecha:
                grupo.fecha,

            fechaDesdeMayor:
                grupo
                    .fechaDesdeMayor,

            fechaHastaMayor:
                grupo
                    .fechaHastaMayor,

            netoLiquidacionesCentavos:
                objetivoNeto,

            bancoCentavos:
                totalBanco,

            diferenciaCentavos:
                diferencia,

            cantidadLiquidaciones:
                grupo
                    .cantidadLiquidaciones,

            cantidadMovimientosBanco:
                combinacionBanco.length,

            rangoDias:
                rangoBanco,

            movimientosBanco:
                combinacionBanco,

            estado:
                diferencia <=
                    TOLERANCIA_BANCO_CENTAVOS
                    ? "CONCILIADO"
                    : "REVISAR"
        });

        console.log(
        `[BANCO PRUEBA] ` +
        `GRUPO=${grupo.grupo} | ` +
        `DESDE=${grupo.fechaDesdeMayor} | ` +
        `HASTA=${grupo.fechaHastaMayor} | ` +
        `NETO_OBJETIVO=${(
            grupo.netoLiquidacionesCentavos / 100
        ).toFixed(2)}`);
    }


    const bancoSinUsar =
        bancoTrabajo.filter(
            movimiento =>
                !movimiento.utilizada
        );

    console.log(
    `[BANCO CANDIDATAS] ` +
    `GRUPO=${grupo.grupo} | ` +
    `RANGO=${rango} | ` +
    `CANTIDAD=${candidatas.length}`
);


    return {

        resultados,

        bancoSinUsar
    };
}


/* ========================================================
   PROCESO GENERAL
======================================================== */

function conciliar(
    mayor,
    liquidaciones,
    banco,
    resumenLiquidaciones
) {

    /* ====================================================
       FASE 2
       GRUPOS MAYOR ↔ LIQUIDACIONES
    ==================================================== */

    const conciliacionMayor =
        conciliarMayorLiquidaciones(
            mayor,
            liquidaciones
        );

    const conciliacionBanco =
        conciliarResumenBanco(
        resumenLiquidaciones,
        banco
    );

    /* ====================================================
       DIAGNÓSTICO MAYOR ↔ LIQUIDACIONES
    ==================================================== */

    console.log(
        "\n========================================"
    );

    console.log(
        "DIAGNÓSTICO GRUPOS MAYOR ↔ LIQUIDACIONES"
    );

    console.log(
        "========================================"
    );


    const gruposOK =
        conciliacionMayor
            .resultados
            .filter(
                item =>
                    item.estado ===
                    "MAYOR_LIQUIDACION_OK"
            );


    const gruposSinConciliar =
        conciliacionMayor
            .resultados
            .filter(
                item =>
                    item.estado ===
                    "SIN_LIQUIDACION"
            );


    console.log(
        `[GRUPOS] Resultados: ${
            conciliacionMayor
                .resultados
                .length
        }`
    );

    console.log(
        `[GRUPOS] Conciliados: ${
            gruposOK.length
        }`
    );

    console.log(
        `[GRUPOS] Sin conciliación: ${
            gruposSinConciliar.length
        }`
    );

    console.log(
        `[GRUPOS] Liquidaciones sin usar: ${
            conciliacionMayor
                .liquidacionesSinUsar
                .length
        }`
    );


    for (
        const grupo
        of gruposOK
    ) {

        console.log(
            `[GRUPO OK] ` +
            `GRUPO=${grupo.grupo} | ` +
            `DESDE=${grupo.fechaDesdeMayor} | ` +
            `HASTA=${grupo.fechaHastaMayor} | ` +
            `ASIENTOS=${grupo.cantidadAsientos} | ` +
            `MAYOR=${(
                grupo.mayorCentavos / 100
            ).toFixed(2)} | ` +
            `BRUTO=${(
                grupo.brutoLiquidacionesCentavos /
                100
            ).toFixed(2)} | ` +
            `NETO=${(
                grupo.netoLiquidacionesCentavos /
                100
            ).toFixed(2)} | ` +
            `LIQ=${grupo.cantidadLiquidaciones} | ` +
            `RANGO=${grupo.rangoDias}`
        );
    }


    /* ====================================================
       FASE 3
       GRUPOS ↔ BANCO
    ==================================================== */

    

/* ====================================================
   DIAGNÓSTICO BANCO
==================================================== */

console.log(
    "\n========================================"
);

console.log(
    "DIAGNÓSTICO RESUMEN ↔ BANCO"
);

console.log(
    "========================================"
);


console.log(
    `[BANCO] Resúmenes procesados: ${
        conciliacionBanco
            .resultados
            .length
    }`
);


for (
    const item
    of conciliacionBanco
        .resultados
) {

    console.log(
        `[BANCO] ` +
        `FECHA=${item.fecha} | ` +
        `BRUTO=${(
            item.brutoLiquidacionCentavos /
            100
        ).toFixed(2)} | ` +
        `NETO=${(
            item.netoLiquidacionCentavos /
            100
        ).toFixed(2)} | ` +
        `BANCO=${(
            item.bancoCentavos /
            100
        ).toFixed(2)} | ` +
        `DIF=${(
            item.diferenciaCentavos /
            100
        ).toFixed(2)} | ` +
        `MOV=${item.cantidadMovimientosBanco} | ` +
        `RANGO=${item.rangoDias ?? "-"} | ` +
        `ESTADO=${item.estado}`
    );
}
 


    return {

        mayorLiquidaciones:
            conciliacionMayor
                .resultados,

        mayorSinConciliar:
            conciliacionMayor
                .mayorSinConciliar,

        liquidacionesSinUsar:
            conciliacionMayor
                .liquidacionesSinUsar,

        banco:
            conciliacionBanco
                .resultados,

        bancoSinUsar:
            conciliacionBanco
                .bancoSinUsar
    };
}


function conciliarResumenBanco(
    resumenLiquidaciones,
    banco
) {

    const bancoTrabajo =
        banco.map(
            (
                movimiento,
                indice
            ) => ({
                ...movimiento,
                idBanco: indice,
                utilizada: false
            })
        );


    const resultados = [];


    for (
        const resumen
        of resumenLiquidaciones
    ) {

        const objetivoNeto =
            resumen.netoCentavos;


        let combinacionBanco =
            null;

        let rangoBanco =
            null;


        for (
            const rango
            of RANGOS_BUSQUEDA
        ) {

            const candidatas =
                bancoTrabajo
                    .filter(
                        movimiento => {

                            if (
                                movimiento.utilizada
                            ) {
                                return false;
                            }


                            const diferencia =
                                diferenciaDias(
                                    resumen.fecha,
                                    movimiento.fecha
                                );


                            return (
                                diferencia <= rango
                            );
                        }
                    );


            if (
                candidatas.length === 0
            ) {
                continue;
            }


            combinacionBanco =
                buscarCombinacionMontos(
                    candidatas,
                    objetivoNeto,
                    movimiento =>
                        movimiento.creditoCentavos,
                    20,
                    TOLERANCIA_BANCO_CENTAVOS
                );


            if (
                combinacionBanco
            ) {

                rangoBanco =
                    rango;

                break;
            }
        }


        if (
            !combinacionBanco
        ) {

            resultados.push({

                fecha:
                    resumen.fecha,

                brutoLiquidacionCentavos:
                    resumen.brutoCentavos,

                netoLiquidacionCentavos:
                    objetivoNeto,

                bancoCentavos:
                    0,

                diferenciaCentavos:
                    objetivoNeto,

                cantidadMovimientosBanco:
                    0,

                rangoDias:
                    null,

                movimientosBanco:
                    [],

                estado:
                    "FALTA_BANCO"
            });


            continue;
        }


        const idsBanco =
            new Set(
                combinacionBanco.map(
                    movimiento =>
                        movimiento.idBanco
                )
            );


        for (
            const movimiento
            of bancoTrabajo
        ) {

            if (
                idsBanco.has(
                    movimiento.idBanco
                )
            ) {

                movimiento.utilizada =
                    true;
            }
        }


        const totalBanco =
            combinacionBanco.reduce(
                (
                    acumulado,
                    movimiento
                ) =>
                    acumulado +
                    movimiento.creditoCentavos,

                0
            );


        const diferencia =
            Math.abs(
                objetivoNeto -
                totalBanco
            );


        resultados.push({

            fecha:
                resumen.fecha,

            brutoLiquidacionCentavos:
                resumen.brutoCentavos,

            netoLiquidacionCentavos:
                objetivoNeto,

            bancoCentavos:
                totalBanco,

            diferenciaCentavos:
                diferencia,

            cantidadMovimientosBanco:
                combinacionBanco.length,

            rangoDias:
                rangoBanco,

            movimientosBanco:
                combinacionBanco,

            estado:
                diferencia <=
                    TOLERANCIA_BANCO_CENTAVOS
                    ? "CONCILIADO"
                    : "REVISAR"
        });
    }


    const bancoSinUsar =
        bancoTrabajo.filter(
            movimiento =>
                !movimiento.utilizada
        );


    return {

        resultados,

        bancoSinUsar
    };
}

/* ========================================================
   EXPORTS
======================================================== */

module.exports = {

    conciliar,

    conciliarMayorLiquidaciones,

    conciliarResumenBanco
};