const fs = require('fs');
const path = require('path');

let currentLanguage = 'es'; // Idioma por defecto
const translationsPath = path.join(__dirname, 'translations.json');
const dataPath = path.join(__dirname, 'data.json');
const buildOrdersPath = path.join(__dirname, 'build-orders.json');
const extraTipsPath = path.join(__dirname, 'extra-tips.json');
let translations = {};
let civilizationsData = [];
let buildOrdersData = [];
let extraTipsData = [];

// Cargar traducciones
try {
  const jsonData = fs.readFileSync(translationsPath, 'utf8');
  translations = JSON.parse(jsonData);
} catch (err) {
  console.error('Error al cargar las traducciones:', err);
}

// Cargar datos de civilizaciones
try {
  const jsonData = fs.readFileSync(dataPath, 'utf8');
  civilizationsData = JSON.parse(jsonData);
} catch (err) {
  console.error('Error al cargar los datos de civilizaciones:', err);
}

// Cargar datos de build orders
try {
  const jsonData = fs.readFileSync(buildOrdersPath, 'utf8');
  buildOrdersData = JSON.parse(jsonData);
} catch (err) {
  console.error('Error al cargar los datos de build orders:', err);
}

// Cargar datos de extra tips
try {
  const jsonData = fs.readFileSync(extraTipsPath, 'utf8');
  extraTipsData = JSON.parse(jsonData);
} catch (err) {
  console.error('Error al cargar los datos de extra tips:', err);
}

// Función para actualizar el texto en la aplicación
function updateText() {
  document.title = translations[currentLanguage].title;
  document.getElementById('civilizaciones-tab').textContent = translations[currentLanguage].civilizations;
  document.getElementById('build-orders-tab').textContent = translations[currentLanguage].buildOrders;
  document.getElementById('extra-tips-tab').textContent = translations[currentLanguage].extraTips;
  document.getElementById('civilizacion-select').previousElementSibling.textContent = translations[currentLanguage].selectCivilization;
  document.getElementById('informacion-civilizacion').innerHTML = `<p>${translations[currentLanguage].selectTip}</p>`;
}

// Llamar a la función para actualizar el texto
updateText();

// Evento para cambiar el idioma
document.getElementById('language-select').addEventListener('change', (event) => {
  currentLanguage = event.target.value;
  updateText(); // Actualizar el texto al nuevo idioma
});

// Mostrar información de civilizaciones
document.getElementById('civilizaciones-tab').addEventListener('click', function() {
  document.getElementById('civilizaciones-content').style.display = 'block';
  document.getElementById('build-orders-content').style.display = 'none';
  document.getElementById('extra-tips-content').style.display = 'none';
});

// Mostrar información de build orders
document.getElementById('build-orders-tab').addEventListener('click', function() {
  document.getElementById('civilizaciones-content').style.display = 'none';
  document.getElementById('build-orders-content').style.display = 'block';
  document.getElementById('extra-tips-content').style.display = 'none';
});

// Mostrar información de extra tips
document.getElementById('extra-tips-tab').addEventListener('click', function() {
  document.getElementById('civilizaciones-content').style.display = 'none';
  document.getElementById('build-orders-content').style.display = 'none';
  document.getElementById('extra-tips-content').style.display = 'block';
});

// Mostrar información de civilizaciones
document.getElementById('civilizacion-select').addEventListener('change', () => {
  const selectedCiv = document.getElementById('civilizacion-select').value;

  if (!selectedCiv) {
    document.getElementById('informacion-civilizacion').innerHTML = '<p>Selecciona una civilización para ver sus estrategias.</p>';
    return;
  }

  const civData = civilizationsData.find(civ => civ.civilizacion === selectedCiv);

  if (civData) {
    document.getElementById('informacion-civilizacion').innerHTML = `
      <h2>${civData.civilizacion}</h2>
      <p><strong>Feudal:</strong> ${civData.estrategias.feudal}</p>
      <p><strong>Castillos:</strong> ${civData.estrategias.castillos}</p>
      <p><strong>Imperial:</strong> ${civData.estrategias.imperial}</p>
      <p><strong>Respuesta:</strong> ${civData.respuesta}</p>
    `;
  }
});

// Llenar el menú desplegable de civilizaciones
function populateCivilizationSelect() {
  const civilizationSelect = document.getElementById('civilizacion-select');
  civilizationsData.forEach(civ => {
    const option = document.createElement('option');
    option.value = civ.civilizacion;
    option.textContent = civ.civilizacion;
    civilizationSelect.appendChild(option);
  });
}

// Llamar a la función para llenar el menú desplegable
populateCivilizationSelect();
