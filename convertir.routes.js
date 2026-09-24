const express = require('express');
const multer = require('multer');

const router = express.Router();

const {
    convertirLiquidacion,
    convertirLiquidacionesPdf
} = require('../controllers/convertir.controller');


// Los PDF quedan en memoria como Buffer
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 100
    },

    fileFilter: (req, file, cb) => {

        if (
            file.mimetype ===
            'application/pdf'
        ) {
            return cb(null, true);
        }

        cb(
            new Error(
                'Solo se permiten archivos PDF.'
            )
        );
    }
});


// Conversión HTML existente
router.post(
    '/',
    convertirLiquidacion
);


// Conversión múltiple PDF
router.post(
    '/pdfs',
    upload.array('archivos', 100),
    convertirLiquidacionesPdf
);


module.exports = router;