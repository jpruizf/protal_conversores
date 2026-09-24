// Nuevas posiciones calibradas con precisión de caracteres (Índice basado en 0)
export const LAYOUT_CUERPO = {
    tipo:         { inicio: 0,  fin: 1 },   // Toma el '1' inicial
    idPrincipal:  { inicio: 3,  fin: 8 },   // Toma exactamente '25500'
    idSecundario: { inicio: 19, fin: 24 },  // Salta los ceros y toma '61769'
    monto:        { inicio: 28, fin: 40 },  // Captura '000003070000'
    fecha:        { inicio: 40, fin: 48 },  // Captura exactamente '20260702'
    control:      { inicio: 48, fin: 55 }   // Captura el código del final '9072658'
};

export const TIPO_REGISTRO = {
    HEADER: '0',
    DETALLE: '1',
    CIERRE: '2'
};
export const LAYOUT_CIERRE = {
    idPrincipal: { inicio: 0, fin: 1 },
    totalRegistros: { inicio: 1, fin: 7 },
    totalConsolidado: { inicio: 7, fin: 23 }
};