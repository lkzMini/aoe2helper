const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const { remote } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  // Elementos DOM
  const civsBtn = document.getElementById('civs-btn');
  const buildsBtn = document.getElementById('builds-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const civsSection = document.getElementById('civs-section');
  const buildsSection = document.getElementById('builds-section');
  const settingsSection = document.getElementById('settings-section');
  const selectCivilizacion = document.getElementById('civilizacion-select');
  const selectBuildOrder = document.getElementById('build-order-select');
  const infoBoxCiv = document.getElementById('informacion-civilizacion');
  const infoBoxBuild = document.getElementById('informacion-build');
  const shortcutButtons = document.querySelectorAll('.shortcut-btn');
  const transparencySlider = document.getElementById('opacity-slider');
  const transparencyValue = document.querySelector('.opacity-value');

  // Rutas de datos
  const dataPath = path.join(__dirname, '..', 'data.json');
  const buildOrdersPath = path.join(__dirname, '..', 'build-orders.json');

  // Estado de la aplicación
  let isCompactMode = false;
  let isInteractionEnabled = true;
  let isPaused = false;
  let isListeningForShortcut = false;
  let config = {
    shortcuts: {
      toggleMode: { key: "'", ctrl: false, alt: false, shift: false },
      toggleInteraction: { key: "¡", ctrl: false, alt: false, shift: false },
      togglePause: { key: "p", ctrl: true, alt: false, shift: false },
      hideApp: { key: "0", ctrl: false, alt: false, shift: false }
    },
    compactMode: {
      backgroundTransparency: 0.15,
      contentOpacity: 0.85,
      defaultInteractive: true
    },
    isPaused: false
  };

  // Manejador global de atajos
  window.addEventListener('keydown', (e) => {
    if (isListeningForShortcut) return;

    // Verificar atajo para ocultar la aplicación
    if (matchShortcut(e, config.shortcuts.hideApp)) {
      e.preventDefault();
      hideApp();
      return;
    }

    // Siempre permitir el atajo de pausa
    if (matchShortcut(e, config.shortcuts.togglePause)) {
      e.preventDefault();
      togglePause();
      return;
    }

    // Si la app está pausada, no procesar otros atajos
    if (isPaused) return;

    if (matchShortcut(e, config.shortcuts.toggleMode)) {
      e.preventDefault();
      toggleDisplayMode();
    }
    
    if (isCompactMode && matchShortcut(e, config.shortcuts.toggleInteraction)) {
      e.preventDefault();
      toggleInteraction();
    }
  });

  function matchShortcut(event, shortcut) {
    if (!shortcut) return false;
    return event.key.toLowerCase() === shortcut.key.toLowerCase() &&
           event.ctrlKey === shortcut.ctrl &&
           event.altKey === shortcut.alt &&
           event.shiftKey === shortcut.shift;
  }

  function initShortcutConfiguration() {
    shortcutButtons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const action = this.dataset.action;
        listenForNewShortcut(this, action);
      });
      
      // Mostrar atajos actuales
      const action = btn.dataset.action;
      updateShortcutButtonText(btn, config.shortcuts[action]);
    });
  }

  function updateShortcutButtonText(button, shortcut) {
    button.textContent = shortcut ? formatShortcut(shortcut) : 'Click para configurar';
  }

  function formatShortcut(shortcut) {
    if (!shortcut) return 'No configurado';
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  }

  function listenForNewShortcut(button, action) {
    if (isListeningForShortcut) return;
    
    isListeningForShortcut = true;
    const originalText = button.textContent;
    button.textContent = 'Presiona tecla...';
    button.classList.add('listening');

    function handleKeyPress(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

      const newShortcut = {
        key: e.key,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        description: config.shortcuts[action]?.description || ''
      };

      config.shortcuts[action] = newShortcut;
      updateShortcutButtonText(button, newShortcut);
      saveConfig();
      
      cleanup();
    }

    function cleanup() {
      isListeningForShortcut = false;
      button.classList.remove('listening');
      window.removeEventListener('keydown', handleKeyPress);
    }

    window.addEventListener('keydown', handleKeyPress);

    // Timeout después de 5 segundos
    setTimeout(() => {
      if (isListeningForShortcut) {
        cleanup();
        updateShortcutButtonText(button, config.shortcuts[action]);
      }
    }, 5000);
  }

  // Función para cambiar entre modos
  function toggleDisplayMode() {
    isCompactMode = !isCompactMode;
    document.body.classList.toggle('compact-mode', isCompactMode);
    
    if (isCompactMode) {
      isInteractionEnabled = config.compactMode.defaultInteractive;
      document.body.classList.toggle('interaction-enabled', isInteractionEnabled);
      
      // Aplicar transparencia de ventana en modo compacto
      ipcRenderer.send('update-window-transparency', config.compactMode.backgroundTransparency);
    } else {
      document.body.classList.remove('interaction-enabled');
      // Restaurar opacidad normal en modo normal
      ipcRenderer.send('update-window-transparency', 0);
    }
    
    ipcRenderer.send('toggle-compact-mode', {
      isCompact: isCompactMode,
      isInteractive: isInteractionEnabled
    });
    
    const modeText = isCompactMode ? 'compacto' : 'normal';
    showModeNotification(modeText);
  }

  // Función para alternar la interacción
  function toggleInteraction() {
    if (!isCompactMode) return; // Solo funciona en modo compacto
    
    isInteractionEnabled = !isInteractionEnabled;
    document.body.classList.toggle('interaction-enabled', isInteractionEnabled);
    
    ipcRenderer.send(isInteractionEnabled ? 'temp-enable-interactions' : 'temp-disable-interactions');
    
    showModeNotification(isInteractionEnabled ? 'Interacción habilitada' : 'Interacción deshabilitada');
  }

  // Función para mostrar notificación
  function showModeNotification(mode) {
    const notification = document.createElement('div');
    notification.className = 'mode-notification';
    notification.textContent = `Modo ${mode} activado`;
    document.body.appendChild(notification);

    // Remover notificación después de 2 segundos
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 2000);
  }

  // Función para cambiar secciones
  function switchSection(activeBtn, activeSection) {
    // Resetear todos los botones y secciones
    [civsBtn, buildsBtn, settingsBtn].forEach(btn => btn.classList.remove('active'));
    [civsSection, buildsSection, settingsSection].forEach(section => section.classList.add('hidden'));
    
    // Activar la sección seleccionada
    activeBtn.classList.add('active');
    activeSection.classList.remove('hidden');
  }

  // Event listeners para navegación
  civsBtn.addEventListener('click', () => switchSection(civsBtn, civsSection));
  buildsBtn.addEventListener('click', () => switchSection(buildsBtn, buildsSection));
  settingsBtn.addEventListener('click', () => switchSection(settingsBtn, settingsSection));

  // Actualizar el valor mostrado del slider de transparencia
  if (transparencySlider) {
    transparencySlider.addEventListener('input', (e) => {
      updateTransparency(parseFloat(e.target.value));
    });
  }

  // Cargar datos de civilizaciones
  try {
    const jsonData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(jsonData);

    data.sort((a, b) => a.civilizacion.localeCompare(b.civilizacion, 'es'));

    data.forEach(civ => {
      const option = document.createElement('option');
      option.value = civ.civilizacion;
      option.textContent = civ.civilizacion;
      selectCivilizacion.appendChild(option);
    });

    selectCivilizacion.addEventListener('change', () => {
      const selectedCiv = selectCivilizacion.value;

      if (!selectedCiv) {
        infoBoxCiv.innerHTML = '<p>Selecciona una civilización para ver sus estrategias.</p>';
        return;
      }

      const civData = data.find(civ => civ.civilizacion === selectedCiv);

      if (civData) {
        infoBoxCiv.innerHTML = `
          <h2>${civData.civilizacion}</h2>
          <p><strong>Feudal:</strong> ${civData.estrategias.feudal}</p>
          <p><strong>Castillos:</strong> ${civData.estrategias.castillos}</p>
          <p><strong>Imperial:</strong> ${civData.estrategias.imperial}</p>
          <p><strong>Respuesta:</strong> ${civData.respuesta}</p>
        `;
      }
    });
  } catch (err) {
    console.error('Error al cargar los datos de civilizaciones:', err);
    infoBoxCiv.innerHTML = '<p>Error al cargar las civilizaciones.</p>';
  }

  // Cargar datos de Build Orders
  try {
    const buildOrdersData = fs.readFileSync(buildOrdersPath, 'utf8');
    const buildOrders = JSON.parse(buildOrdersData);

    buildOrders.forEach(build => {
      const option = document.createElement('option');
      option.value = build.nombre;
      option.textContent = build.nombre;
      selectBuildOrder.appendChild(option);
    });

    selectBuildOrder.addEventListener('change', () => {
      const selectedBuild = selectBuildOrder.value;

      if (!selectedBuild) {
        infoBoxBuild.innerHTML = '<p>Selecciona un Build Order para ver los pasos.</p>';
        return;
      }

      const buildData = buildOrders.find(build => build.nombre === selectedBuild);

      if (buildData) {
        infoBoxBuild.innerHTML = `
          <h2>${buildData.nombre}</h2>
          <p><strong>Descripción:</strong> ${buildData.descripcion}</p>
          <h3>Pasos:</h3>
          <ol>
            ${buildData.pasos.map(paso => `<li>${paso}</li>`).join('')}
          </ol>
          ${buildData.notas ? `<p><strong>Notas:</strong> ${buildData.notas}</p>` : ''}
        `;
      }
    });
  } catch (err) {
    console.error('Error al cargar los datos de Build Orders:', err);
    infoBoxBuild.innerHTML = '<p>Error al cargar los Build Orders.</p>';
  }

  // Función para actualizar la transparencia
  function updateTransparency(value) {
    // Convertimos el valor de transparencia a opacidad (invertimos el valor)
    const opacity = 1 - value;
    config.compactMode.opacity = opacity;
    document.documentElement.style.setProperty('--compact-opacity', opacity);
    
    // Actualizar el valor mostrado como transparencia
    const transparencyValue = document.querySelector('.opacity-value');
    if (transparencyValue) {
      transparencyValue.textContent = `${Math.round(value * 100)}%`;
    }
    
    saveConfig();
  }

  // Función para pausar/reanudar la app
  function togglePause() {
    isPaused = !isPaused;
    document.body.classList.toggle('app-paused', isPaused);
    ipcRenderer.send('toggle-pause', isPaused);
    showModeNotification(isPaused ? 'Aplicación pausada' : 'Aplicación reanudada');
    
    // Guardar estado en config
    config.isPaused = isPaused;
    saveConfig();
  }

  // Actualizar el HTML para incluir el nuevo atajo
  const settingsHtml = `
    <div class="shortcut-item">
      <span>Pausar/Reanudar aplicación:</span>
      <button class="shortcut-btn" data-action="togglePause">
        ${formatShortcut(config.shortcuts.togglePause)}
      </button>
    </div>
  `;
  document.querySelector('.shortcuts-container').insertAdjacentHTML('beforeend', settingsHtml);

  // Cargar configuración al iniciar
  loadConfig();
  initShortcutConfiguration();

  const backgroundSlider = document.getElementById('background-transparency');
  const contentSlider = document.getElementById('content-opacity');
  
  if (backgroundSlider) {
    backgroundSlider.addEventListener('input', (e) => {
      updateBackgroundTransparency(parseFloat(e.target.value));
    });
  }
  
  if (contentSlider) {
    contentSlider.addEventListener('input', (e) => {
      updateContentOpacity(parseFloat(e.target.value));
    });
  }

  // Escuchar el evento para actualizar transparencia y opacidad
  ipcRenderer.on('update-transparency-opacity', (event, { transparency, opacity }) => {
    document.documentElement.style.setProperty('--background-transparency', transparency);
    document.documentElement.style.setProperty('--content-opacity', opacity);

    // Aplicar opacidad a todos los elementos
    const allElements = document.querySelectorAll('body *');
    allElements.forEach(element => {
      element.style.opacity = opacity;
    });
  });

  // Guardar configuración al mover los sliders
  const opacitySlider = document.getElementById('opacity-slider');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (event) => {
      const newOpacity = parseFloat(event.target.value);
      ipcRenderer.send('update-opacity', newOpacity);
    });
  }

  // Escuchar el evento para actualizar la opacidad
  ipcRenderer.on('update-opacity', (event, newOpacity) => {
    document.documentElement.style.setProperty('--content-opacity', newOpacity);
    const allElements = document.querySelectorAll('body *');
    allElements.forEach(element => {
      element.style.opacity = newOpacity;
    });
  });

  // Habilitar arrastre de la ventana solo desde el contenedor arrastrable
  const draggableContainer = document.getElementById('draggable-container');

  if (draggableContainer) {
    draggableContainer.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // Solo arrastrar con el botón izquierdo
        remote.getCurrentWindow().startDrag(); // Iniciar el arrastre
      }
    });
  }
});

function loadConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
    
    // Aplicar configuración pero mantener modo normal al inicio
    document.documentElement.style.setProperty('--background-transparency', config.compactMode.backgroundTransparency);
    document.documentElement.style.setProperty('--content-opacity', config.compactMode.contentOpacity);
    
    // Actualizar sliders
    const backgroundSlider = document.getElementById('background-transparency');
    const contentSlider = document.getElementById('content-opacity');
    const backgroundValue = document.querySelector('.background-transparency-value');
    const contentValue = document.querySelector('.content-opacity-value');
    
    if (backgroundSlider) backgroundSlider.value = config.compactMode.backgroundTransparency;
    if (contentSlider) contentSlider.value = config.compactMode.contentOpacity;
    if (backgroundValue) backgroundValue.textContent = `${Math.round(config.compactMode.backgroundTransparency * 100)}%`;
    if (contentValue) contentValue.textContent = `${Math.round(config.compactMode.contentOpacity * 100)}%`;
    
    // Iniciar siempre en modo normal
    isCompactMode = false;
    document.body.classList.remove('compact-mode');
    ipcRenderer.send('toggle-compact-mode', {
      isCompact: false,
      isInteractive: true
    });
    
  } catch (err) {
    console.error('Error al cargar la configuración:', err);
  }
}

function saveConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Error al guardar la configuración:', err);
  }
}

function updateBackgroundTransparency(value) {
  config.compactMode.backgroundTransparency = value;

  // Aplicar la transparencia en modo compacto
  document.documentElement.style.setProperty('--background-transparency', value);
  ipcRenderer.send('update-window-transparency', value);

  // Actualizar el valor mostrado
  const transparencyValue = document.querySelector('.background-transparency-value');
  if (transparencyValue) {
    transparencyValue.textContent = `${Math.round(value * 100)}%`;
  }

  saveConfig();
}

function updateContentOpacity(value) {
  config.compactMode.contentOpacity = value;

  // Aplicar la opacidad en modo compacto
  document.documentElement.style.setProperty('--content-opacity', value);

  const contentElements = document.querySelectorAll('.info-box *, h1, h2, h3, p, select, label');
  contentElements.forEach(element => {
    element.style.opacity = value;
  });

  const opacityValue = document.querySelector('.content-opacity-value');
  if (opacityValue) {
    opacityValue.textContent = `${Math.round(value * 100)}%`;
  }

  saveConfig();
}

// Función para ocultar la aplicación
function hideApp() {
  ipcRenderer.send('hide-app');
} 