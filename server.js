const express = require('express');
const convertirRoutes = require('./routes/convertir.routes');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    next();
});
app.use('/convertir', convertirRoutes);

app.listen(PORT, '127.0.0.1', () => {
    console.log(
        `Servidor corriendo en http://127.0.0.1:${PORT}`
    );
});