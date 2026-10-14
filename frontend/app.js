// Configuración
const API = window.location.origin; // Usa el mismo host y puerto (ej. http://localhost:3000)
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Elementos del DOM
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileName = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const statusDiv = document.getElementById('status');
const gallery = document.getElementById('gallery');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');

let selectedFile = null;

// Mensajes de estado
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status-msg ${type}`;
}

function clearStatus() {
  statusDiv.textContent = '';
  statusDiv.className = 'status-msg';
}

// Manejar selección de archivo
function handleFileSelect(file) {
  clearStatus();
  if (!file) return;

  // Validación 1: Tipo MIME (Requisito 37)
  if (!ALLOWED_TYPES.includes(file.type)) {
    showStatus('❌ Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG o WEBP.', 'error');
    selectedFile = null;
    uploadBtn.disabled = true;
    fileName.textContent = 'Archivo no permitido';
    return;
  }

  // Validación 2: Tamaño máximo 5 MB (Requisito 37)
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    showStatus(`❌ Archivo demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)} MB). El límite es de 5 MB.`, 'error');
    selectedFile = null;
    uploadBtn.disabled = true;
    fileName.textContent = 'Archivo demasiado grande';
    return;
  }

  selectedFile = file;
  fileName.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  uploadBtn.disabled = false;
  showStatus('Archivo listo para subir.', 'info');
}

// Eventos de selección y Drag & Drop
fileInput.addEventListener('change', (e) => {
  handleFileSelect(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    fileInput.files = e.dataTransfer.files;
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

// SUBIR ARCHIVO A S3
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  try {
    uploadBtn.disabled = true;
    showStatus('1/2 Solicitando Presigned URL al backend...', 'info');

    // 1) Solicitar Presigned URL al backend (Requisito 33)
    const res = await fetch(`${API}/api/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        sizeBytes: selectedFile.size
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Error del backend');
    }

    const { uploadUrl, key } = await res.json();
    showStatus('2/2 Subiendo archivo directamente a Amazon S3...', 'info');

    // 2) PUT directo a S3 (el navegador habla directo con Amazon S3, NO pasa por el backend)
    const s3Res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': selectedFile.type
      },
      body: selectedFile
    });

    if (!s3Res.ok) {
      throw new Error(`S3 rechazó la subida. Status HTTP: ${s3Res.status}`);
    }

    showStatus('✅ ¡Imagen subida con éxito directamente a S3!', 'success');
    fileInput.value = '';
    selectedFile = null;
    fileName.textContent = 'Ningún archivo seleccionado';
    uploadBtn.disabled = true;

    // Recargar galería
    setTimeout(loadGallery, 1000);
  } catch (err) {
    console.error('Error al subir:', err);
    showStatus(`❌ Error en la carga: ${err.message}`, 'error');
    uploadBtn.disabled = false;
  }
});

// LISTAR IMÁGENES DE S3 (Requisito 34)
async function loadGallery() {
  try {
    loading.style.display = 'block';
    emptyState.style.display = 'none';
    gallery.innerHTML = '';

    const res = await fetch(`${API}/api/images`);
    if (!res.ok) throw new Error('No se pudo cargar la galería');

    const items = await res.json();
    loading.style.display = 'none';

    if (items.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    gallery.innerHTML = items.map(item => {
      const shortKey = item.key.replace('originales/', '');
      const date = item.lastModified ? new Date(item.lastModified).toLocaleString() : '';
      const sizeKB = item.size ? (item.size / 1024).toFixed(1) + ' KB' : '';

      return `
        <div class="card">
          <img src="${item.url}" alt="${shortKey}" loading="lazy">
          <div class="card-body">
            <div>
              <p class="card-title" title="${item.key}">${shortKey}</p>
              <p class="card-meta">${sizeKB} • ${date}</p>
            </div>
            <button class="btn-delete" onclick="deleteImage('${encodeURIComponent(item.key)}')">🗑️ Eliminar</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    loading.style.display = 'none';
    console.error('Error al cargar galería:', err);
    showStatus('❌ No se pudieron cargar las imágenes de S3.', 'error');
  }
}

// ELIMINAR IMAGEN (Requisito 35)
window.deleteImage = async function(encodedKey) {
  const key = decodeURIComponent(encodedKey);
  if (!confirm(`¿Estás seguro de que deseas eliminar este archivo de S3?\n\n${key}`)) {
    return;
  }

  try {
    showStatus('Eliminando archivo de S3...', 'info');
    const res = await fetch(`${API}/api/images/${encodedKey}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Error al eliminar');

    showStatus('✅ Imagen eliminada de S3 con éxito.', 'success');
    loadGallery();
  } catch (err) {
    console.error('Error al eliminar:', err);
    showStatus('❌ Error al eliminar la imagen.', 'error');
  }
};

// Evento botón actualizar
refreshBtn.addEventListener('click', loadGallery);

// Carga inicial al abrir la página
loadGallery();
