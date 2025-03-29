// Criar o mapa
const map = L.map('map').setView([-23.2805, -46.0135], 12); // Centraliza o mapa no ponto desejado

// Adicionar camada base (OpenStreetMap) 
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',).addTo(map);

// Modificar a atribuição do Leaflet com sua atribuição personalizada
map.attributionControl.setPrefix(''); // Remove a atribuição padrão do Leaflet
map.attributionControl.addAttribution('&copy; <a href="https://leafletjs.com/" target="_blank"> Leaflet</a> | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors |');

// URLs dos arquivos GeoJSON
const geojsonUrl3 = 'http://localhost:3000/geojson?tabela=Equipamentos_educacao';

// Função para carregar e adicionar o GeoJSON ao mapa
function loadGeoJSON(url) {
  fetch(url)
    .then(response => response.json())
    .then(data => {
      L.geoJSON(data).addTo(map);
    })
    .catch(error => console.error('Erro ao carregar o GeoJSON:', error));
}

// Carregar os GeoJSONs
loadGeoJSON(geojsonUrl3);

function loadGeoJSON(url) {
  fetch(url)
      .then(response => response.json())
      .then(data => {
          L.geoJSON(data, {
              onEachFeature: function (feature, layer) {
                  if (feature.properties) {
                      // Monta o conteúdo do popup com as propriedades da feição
                      let popupContent = '<b>Informações:</b><br>';
                      for (const key in feature.properties) {
                          popupContent += `<b>${key}:</b> ${feature.properties[key]}<br>`;
                      }
                      layer.bindPopup(popupContent);
                  }
              }
          }).addTo(map);
      })
      .catch(error => console.error('Erro ao carregar o GeoJSON:', error));
}