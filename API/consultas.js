const pool = require('./db');
const { removeZCoordinate } = require('./utils');

async function buscarGeoJSON(tabela) {
    // 1. Buscar colunas da tabela (exceto a geometria)
    const colunasQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name != 'geom';
    `;
    const colunasRes = await pool.query(colunasQuery, [tabela]);

    // 2. Adicionar aspas duplas nos nomes das colunas
    const colunas = colunasRes.rows.map(row => `"${row.column_name}"`);

    const selectColunas = colunas.join(', ');

    const query = `
        SELECT ${selectColunas}, ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geom 
        FROM "${tabela}"
    `;

    // 3. Executar query e montar GeoJSON
    const { rows } = await pool.query(query);

    const features = rows.map(row => {
        const properties = {};
        colunas.forEach(coluna => {
            const cleanColumn = coluna.replace(/"/g, ''); // Remove as aspas duplas no JSON final
            properties[cleanColumn] = row[cleanColumn];
        });

        return {
            type: 'Feature',
            properties,
            geometry: removeZCoordinate(JSON.parse(row.geom))
        };
    });

    return {
        type: 'FeatureCollection',
        features
    };
}

async function listarTabelas() {
    const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public';
    `;

    const res = await pool.query(query);
    return res.rows.map(row => row.table_name);
}

module.exports = { buscarGeoJSON, listarTabelas };
