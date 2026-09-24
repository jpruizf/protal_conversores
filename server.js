const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 4000;

const proxyOptions = {
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 120000,
    timeout: 120000,
    on: {
        error(error, req, res) {
            console.error(
                `Error proxy para ${req.method} ${req.originalUrl}:`,
                error.message
            );

            if (!res.headersSent) {
                res.status(502).json({
                    ok: false,
                    mensaje: 'El conversor solicitado no está disponible.'
                });
            }
        }
    }
};

/*
 * Conversor de tarjetas
 * Ruta pública: /tarjetas/
 * Puerto interno: 3001
 */
app.use(
    '/tarjetas',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3001',
        pathRewrite: {
            '^/tarjetas': ''
        }
    })
);

/*
 * Red Link
 * Ruta pública: /link-pagos/
 * Puerto interno: 3002
 */
/*app.use(
    '/link-pagos',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3002',
        pathRewrite: {
            '^/link-pagos': ''
        }
    })
);*/

/*
 *
 * Ruta pública: /PAGO MIS CUENTAS/
 * Puerto interno: 3003
 */
app.use(
    '/conversor_pago_mis_cuentas',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3003',
        pathRewrite: {
            '^/conversor_pago_mis_cuentas': ''
        }
    })
);

/*
 * Pago Fácil
 * Ruta pública: /pago-facil/
 * Puerto interno: 3004
 */
app.use(
    '/pago-facil',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3004',
        pathRewrite: {
            '^/pago-facil': ''
        }
    })
);

/*
 * Informe de liquidación
 * Ruta pública: /liquidacion/
 * Puerto interno: 3005
 */
app.use(
    '/liquidacion',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3005',
        pathRewrite: {
            '^/liquidacion': ''
        }
    })
);

/*
 * PDF resumen de comisiones
 * Ruta pública: /pdf-comisiones/
 * Puerto interno: 3006
 */
app.use(
    '/pdf-a-Excel-Boletas-Servicios',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3006',
        pathRewrite: {
            '^/pdf-a-Excel-Boletas-Servicios': ''
        }
    })
);

app.use(
    '/conciliador',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3007',
        pathRewrite: {
            '^/conciliador': ''
        }
    })
);

app.use(
    '/PDF_a_Excel_Liquidacion_Tarjetas',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3008',
        pathRewrite: {
            '^/PDF_a_Excel_Liquidacion_Tarjetas': ''
        }
    })
);

app.use(
    '/PDF_Resumen_Visa_Galicia',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3009',
        pathRewrite: {
            '^/PDF_Resumen_Visa_Galicia': ''
        }
    })
);

app.use(
    '/Resumen_Comisiones',
    createProxyMiddleware({
        ...proxyOptions,
        target: 'http://127.0.0.1:3010',
        pathRewrite: {
            '^/Resumen_Comisiones': ''
        }
    })
);

const linkPagosPublic = path.join(
    __dirname,
    '..',
    'Conversores',
    'TXT_a_Excel_Link_pagos',
    'public'
);

app.use(
    '/link-pagos',
    express.static(linkPagosPublic)
);

app.get('/link-pagos/', (req, res) => {
    res.sendFile(
        path.join(linkPagosPublic, 'index.html')
    );
});

/*
 * El portal se publica después de los proxies.
 * Esto evita que Express intercepte primero las rutas
 * de los conversores.
 */
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/*
 * Respuesta para rutas desconocidas.
 */
app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

app.listen(PORT, HOST, () => {
    console.log('Portal INTERREDES iniciado');
    console.log(`Acceso local: http://127.0.0.1:${PORT}`);
    console.log(`Acceso de red: http://192.168.80.185:${PORT}`);
});