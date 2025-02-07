const fs = require('fs');
const path = require('path');

window.addEventListener('DOMContentLoaded', () => {
  const selectCivilizacion = document.getElementById('civilizacion-select');
  const infoBox = document.getElementById('informacion-civilizacion');
  const dataPath = path.join(__dirname, '..', 'data.json');

  console.log('Ruta del archivo:', dataPath); // Para debugging

  // Cargar los datos del archivo JSON
  try {
    const jsonData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(jsonData);

    // Ordenar el array de civilizaciones alfabéticamente
    data.sort((a, b) => a.civilizacion.localeCompare(b.civilizacion, 'es'));

    // Rellenar el menú desplegable con las civilizaciones ordenadas
    data.forEach(civ => {
      const option = document.createElement('option');
      option.value = civ.civilizacion;
      option.textContent = civ.civilizacion;
      selectCivilizacion.appendChild(option);
    });

    // Mostrar la información al seleccionar una civilización
    selectCivilizacion.addEventListener('change', () => {
      const selectedCiv = selectCivilizacion.value;

      if (!selectedCiv) {
        infoBox.innerHTML = '<p>Selecciona una civilización para ver sus estrategias.</p>';
        return;
      }

      const civData = data.find(civ => civ.civilizacion === selectedCiv);

      if (civData) {
        infoBox.innerHTML = `
          <h2>${civData.civilizacion}</h2>
          <p><strong>Feudal:</strong> ${civData.estrategias.feudal}</p>
          <p><strong>Castillos:</strong> ${civData.estrategias.castillos}</p>
          <p><strong>Imperial:</strong> ${civData.estrategias.imperial}</p>
          <p><strong>Respuesta:</strong> ${civData.respuesta}</p>
        `;
      }
    });
  } catch (err) {
    console.error('Error al cargar los datos:', err);
    infoBox.innerHTML = '<p>Error al cargar las civilizaciones.</p>';
  }
});
