module.exports = {
    apps: [
        {
            name: 'portal-interredes',
            cwd: './Portal principal',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                HOST: '0.0.0.0',
                PORT: 4000
            }
        },
        {
            name: 'conversor-tarjetas',
            cwd: './Conversores/TXT_REPORTES_TARJETAS_A_EXCEL',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            }
        },

        {
            name: 'conversor_pago_mis_cuentas',
            cwd: './Conversores/conversor_pago_mis_cuentas',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3003
            }
        },

        {
            name: 'conversor-pago-facil',
            cwd: './Conversores/TXT_a_Excel_pago_facil',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3004
            }
        },

        {
            name: 'conversor-liquidacion',
            cwd: './Conversores/INFORME_liquidacion_TXT_a_Excel',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3005
            }
        },

        {
            name: 'PDF_a_Excel_Boletas_Servicios',
            cwd: './Conversores/PDF_a_Excel_Boletas_Servicios',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3006
            }
        },

       

        {
            name: 'conciliador',
            cwd: './Conversores/conciliador',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3007
            }
        },

        {
            name: 'PDF_a_Excel_Liquidacion_Tarjetas',
            cwd: './Conversores/PDF_a_Excel_Liquidacion_Tarjetas',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3008
            }
        },

        {
            name: 'PDF_Resumen_Visa_Galicia',
            cwd: './Conversores/PDF_Resumen_Visa_Galicia',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3009
            } 
        },

        {
            name: 'Resumen_Comisiones',
            cwd: './Conversores/Resumen_Comisiones',
            script: 'server.js',
            interpreter: 'node',
            env: {
                NODE_ENV: 'production',
                PORT: 3010
            }
        }
    ]
};