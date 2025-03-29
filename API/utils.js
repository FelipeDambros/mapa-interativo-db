// Remove a coordenada Z de qualquer geometria GeoJSON
function removeZCoordinate(geom) {
    if (geom.type === 'MultiPolygon') {
        geom.coordinates = geom.coordinates.map(polygon =>
            polygon.map(ring =>
                ring.map(([x, y]) => [x, y]) // remove Z
            )
        )
    }
    return geom
}

module.exports = { removeZCoordinate }