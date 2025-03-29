const http = require('http');
const url = require('url');

const tokml = require('tokml');
const shpwrite = require('shp-write');
const JSZip = require('jszip');

const { buscarGeoJSON, listarTabelas } = require('./consultas');

// 🔤 Remove acentos dos textos (ex: João → Joao)
const normalizeProperties = (geojson) => {
    const newFeatures = geojson.features.map((feature) => {
        const cleanProps = {};
        for (const key in feature.properties) {
            const cleanKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '_'); // remove acentos e símbolos
            const value = feature.properties[key];
            if (typeof value === 'string') {
                cleanProps[cleanKey] = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            } else {
                cleanProps[cleanKey] = value;
            }
        }

        return {
            ...feature,
            properties: cleanProps
        };
    });

    return {
        ...geojson,
        features: newFeatures
    };
};

// 🔄 Converte MultiPolygon → Polygon e MultiPoint → Point (caso tenha só um)
function normalizarGeoJSON(geojson) {
    const result = {
        type: "FeatureCollection",
        features: []
    };

    geojson.features.forEach(feature => {
        if (!feature.geometry || !feature.geometry.type) return;

        const { type, coordinates } = feature.geometry;

        if (type === "MultiPolygon") {
            coordinates.forEach(polygonCoords => {
                result.features.push({
                    type: "Feature",
                    properties: feature.properties,
                    geometry: {
                        type: "Polygon",
                        coordinates: polygonCoords
                    }
                });
            });
        } else if (type === "MultiPoint" && coordinates.length === 1) {
            result.features.push({
                type: "Feature",
                properties: feature.properties,
                geometry: {
                    type: "Point",
                    coordinates: coordinates[0]
                }
            });
        } else {
            result.features.push(feature);
        }
    });

    return result;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { pathname, query } = url.parse(req.url, true);

    if (pathname === '/tabelas' && req.method === 'GET') {
        try {
            const tabelas = await listarTabelas();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(tabelas));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ erro: 'Erro ao listar tabelas' }));
        }

    } else if (pathname === '/geojson' && req.method === 'GET') {
        const tabela = query.tabela;
        if (!tabela) {
            res.writeHead(400);
            return res.end(JSON.stringify({ erro: 'Informe a tabela no parâmetro ?tabela=' }));
        }

        try {
            const geojson = await buscarGeoJSON(tabela);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(geojson, null, 2));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ erro: 'Erro ao buscar dados da tabela' }));
        }

    } else if (pathname === '/export/kmz' && req.method === 'GET') {
        const tabela = query.tabela;
        if (!tabela) {
            res.writeHead(400);
            return res.end(JSON.stringify({ erro: 'Informe a tabela no parâmetro ?tabela=' }));
        }

        try {
            const geojson = await buscarGeoJSON(tabela);
            const kml = tokml(geojson);
            const zip = new JSZip();
            zip.file(`${tabela}.kml`, kml);

            const kmz = await zip.generateAsync({ type: "nodebuffer" });

            res.writeHead(200, {
                'Content-Type': 'application/vnd.google-earth.kmz',
                'Content-Disposition': `attachment; filename="${tabela}.kmz"`
            });
            res.end(kmz);
        } catch (err) {
            res.writeHead(500);
            res.end('Erro ao exportar KMZ');
            console.error(err);
        }

    } else if (pathname === '/export/shp' && req.method === 'GET') {
        const tabela = query.tabela;
        if (!tabela) {
            res.writeHead(400);
            return res.end(JSON.stringify({ erro: 'Informe a tabela no parâmetro ?tabela=' }));
        }

        try {
            const geojsonOriginal = await buscarGeoJSON(tabela);
            const geojsonLimpo = normalizeProperties(normalizarGeoJSON(geojsonOriginal));

            if (!geojsonLimpo.features.length) {
                res.writeHead(400);
                return res.end('GeoJSON vazio. Nada para exportar.');
            }

            const originalZip = shpwrite.zip(geojsonLimpo);

            // Tenta carregar o ZIP gerado pelo shpwrite
            let zip;
            try {
                zip = await JSZip.loadAsync(originalZip);
            } catch (err) {
                console.error("Erro ao carregar ZIP do shpwrite:", err);
                res.writeHead(500);
                return res.end('Erro ao carregar arquivo ZIP.');
            }

            // Lista os arquivos dentro do ZIP
            console.log("📦 Arquivos no ZIP original:", Object.keys(zip.files));

            const renamedZip = new JSZip();

            for (const filename of Object.keys(zip.files)) {
                if (filename.endsWith('/')) continue;

                const file = zip.file(filename);
                if (!file) continue;

                try {
                    const ext = filename.split('.').pop();
                    const newName = `${tabela}.${ext}`;
                    const content = await file.async('nodebuffer');
                    renamedZip.file(newName, content);
                } catch (err) {
                    console.error(`Erro ao processar ${filename}:`, err);
                }
            }

            const finalZipBuffer = await renamedZip.generateAsync({ type: 'nodebuffer' });

            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${tabela}.zip"`
            });
            res.end(finalZipBuffer);

        } catch (err) {
            res.writeHead(500);
            res.end('Erro ao exportar SHP');
            console.error("Erro geral no export SHP:", err);
        }

    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ erro: 'Rota não encontrada. Tente: /geojson?tabela=...' }));
    }
});

server.listen(3001, () => console.log('✅ API rodando em http://localhost:3001'));
