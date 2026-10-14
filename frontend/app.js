/* ================================================
   CloudVault - App Logic
   Google Drive-style S3 Image Manager
   ================================================ */

const API = window.location.origin;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BUCKET_NAME = 'lab09-rivera-14102026';

// ===== DOM Elements =====
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const uploadBtn = document.getElementById('uploadBtn');
const gallery = document.getElementById('gallery');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const refreshBtn = document.getElementById('refreshBtn');
const uploadOverlay = document.getElementById('uploadOverlay');
const uploadTrigger = document.getElementById('uploadTrigger');
const closeModal = document.getElementById('closeModal');
const cancelUpload = document.getElementById('cancelUpload');
const previewArea = document.getElementById('previewArea');
const previewImg = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const previewMeta = document.getElementById('previewMeta');
const previewRemove = document.getElementById('previewRemove');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const searchInput = document.getElementById('searchInput');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const viewToggle = document.getElementById('viewToggle');
const viewIcon = document.getElementById('viewIcon');
const dragOverlay = document.getElementById('dragOverlay');
const emptyUploadBtn = document.getElementById('emptyUploadBtn');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxName = document.getElementById('lightboxName');
const lightboxMeta = document.getElementById('lightboxMeta');
const lightboxClose = document.getElementById('lightboxClose');

let selectedFile = null;
let allImages = [];
let isListView = false;

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== Format Helpers =====
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : '?';
}

function getShortName(key) {
  const name = key.replace('originales/', '');
  // Remove the timestamp-hash prefix for cleaner display
  const match = name.match(/^\d+-[a-f0-9]+-(.+)$/);
  return match ? match[1] : name;
}

// ===== Sidebar Toggle =====
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// ===== View Toggle (Grid / List) =====
viewToggle.addEventListener('click', () => {
  isListView = !isListView;
  viewIcon.className = isListView ? 'fas fa-grip' : 'fas fa-list';
  gallery.classList.toggle('list-view', isListView);
});

// ===== Upload Modal =====
function openUploadModal() {
  uploadOverlay.classList.add('show');
  resetUploadState();
}

function closeUploadModal() {
  uploadOverlay.classList.remove('show');
  resetUploadState();
}

function resetUploadState() {
  selectedFile = null;
  fileInput.value = '';
  previewArea.style.display = 'none';
  uploadProgress.style.display = 'none';
  progressBar.style.width = '0%';
  uploadBtn.disabled = true;
  dropZone.style.display = 'block';
}

uploadTrigger.addEventListener('click', openUploadModal);
emptyUploadBtn && emptyUploadBtn.addEventListener('click', openUploadModal);
closeModal.addEventListener('click', closeUploadModal);
cancelUpload.addEventListener('click', closeUploadModal);

uploadOverlay.addEventListener('click', (e) => {
  if (e.target === uploadOverlay) closeUploadModal();
});

// ===== File Selection & Preview =====
function handleFileSelect(file) {
  if (!file) return;

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast('Tipo de archivo no permitido. Solo JPG, PNG o WEBP.', 'error');
    return;
  }

  // Validate size
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    showToast(`Archivo demasiado grande (${formatSize(file.size)}). Máximo ${MAX_SIZE_MB} MB.`, 'error');
    return;
  }

  selectedFile = file;
  dropZone.style.display = 'none';
  previewArea.style.display = 'block';
  uploadBtn.disabled = false;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => { previewImg.src = e.target.result; };
  reader.readAsDataURL(file);

  previewName.textContent = file.name;
  previewMeta.textContent = `${formatSize(file.size)} · ${getFileExtension(file.name)}`;
}

fileInput.addEventListener('change', (e) => {
  handleFileSelect(e.target.files[0]);
});

previewRemove.addEventListener('click', () => {
  resetUploadState();
  dropZone.style.display = 'block';
});

// Drop Zone events (inside modal)
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
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

// ===== Full Page Drag & Drop =====
let dragCounter = 0;

document.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  if (!uploadOverlay.classList.contains('show')) {
    dragOverlay.classList.add('show');
  }
});

document.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dragOverlay.classList.remove('show');
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dragOverlay.classList.remove('show');

  if (!uploadOverlay.classList.contains('show') && e.dataTransfer.files.length > 0) {
    openUploadModal();
    setTimeout(() => handleFileSelect(e.dataTransfer.files[0]), 100);
  }
});

// ===== UPLOAD TO S3 =====
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  try {
    uploadBtn.disabled = true;
    uploadProgress.style.display = 'block';
    progressBar.style.width = '30%';
    progressText.textContent = 'Solicitando URL segura al servidor...';

    // 1) Request presigned URL
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
      throw new Error(errData.error || 'Error del servidor');
    }

    const { uploadUrl } = await res.json();

    progressBar.style.width = '60%';
    progressText.textContent = 'Subiendo directamente a Amazon S3...';

    // 2) PUT directly to S3
    const s3Res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': selectedFile.type },
      body: selectedFile
    });

    if (!s3Res.ok) {
      throw new Error(`S3 rechazó la subida (HTTP ${s3Res.status})`);
    }

    progressBar.style.width = '100%';
    progressText.textContent = '¡Completado!';

    showToast('Imagen subida con éxito a Amazon S3', 'success');

    setTimeout(() => {
      closeUploadModal();
      loadGallery();
    }, 800);

  } catch (err) {
    console.error('Upload error:', err);
    showToast(`Error al subir: ${err.message}`, 'error');
    uploadProgress.style.display = 'none';
    uploadBtn.disabled = false;
  }
});

// ===== LOAD GALLERY =====
async function loadGallery() {
  try {
    loading.style.display = 'block';
    emptyState.style.display = 'none';
    gallery.innerHTML = '';

    // Spin refresh button
    refreshBtn.classList.add('spinning');
    setTimeout(() => refreshBtn.classList.remove('spinning'), 800);

    const res = await fetch(`${API}/api/images`);
    if (!res.ok) throw new Error('Error al obtener imágenes');

    allImages = await res.json();
    loading.style.display = 'none';

    updateStats(allImages);
    renderGallery(allImages);

  } catch (err) {
    loading.style.display = 'none';
    console.error('Gallery error:', err);
    showToast('No se pudieron cargar las imágenes', 'error');
  }
}

function renderGallery(items) {
  gallery.innerHTML = '';

  if (items.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  gallery.innerHTML = items.map((item, index) => {
    const shortName = getShortName(item.key);
    const ext = getFileExtension(item.key);
    const size = formatSize(item.size);
    const date = formatDate(item.lastModified);
    const encodedKey = encodeURIComponent(item.key);

    return `
      <div class="file-card" style="animation-delay: ${index * 0.05}s" onclick="openLightbox('${item.url.replace(/'/g, "\\'")}', '${shortName.replace(/'/g, "\\'")}', '${size} · ${date}')">
        <img class="file-thumb" src="${item.url}" alt="${shortName}" loading="lazy">
        <div class="file-actions" onclick="event.stopPropagation()">
          <button class="action-btn" title="Descargar" onclick="downloadImage('${item.url}', '${shortName.replace(/'/g, "\\'")}')">
            <i class="fas fa-download"></i>
          </button>
          <button class="action-btn delete" title="Eliminar" onclick="deleteImage('${encodedKey}', '${shortName.replace(/'/g, "\\'")}')">
            <i class="fas fa-trash-can"></i>
          </button>
        </div>
        <div class="file-info">
          <span class="file-name" title="${item.key}">${shortName}</span>
          <div class="file-meta">
            <span class="file-type-badge">${ext}</span>
            <span>${size}</span>
            <span>${date}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== UPDATE STATS =====
function updateStats(items) {
  const totalFiles = items.length;
  const totalBytes = items.reduce((sum, item) => sum + (item.size || 0), 0);
  const lastModified = items.length > 0
    ? formatDate(items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))[0].lastModified)
    : '--';

  document.getElementById('totalFiles').textContent = totalFiles;
  document.getElementById('totalSize').textContent = formatSize(totalBytes);
  document.getElementById('lastUpload').textContent = lastModified;
  document.getElementById('fileCount').textContent = `${totalFiles} archivo${totalFiles !== 1 ? 's' : ''}`;
  document.getElementById('bucketName').textContent = BUCKET_NAME;

  // Storage widget (fake 5GB limit for visual)
  const maxStorage = 5 * 1024 * 1024 * 1024; // 5 GB
  const percent = Math.min((totalBytes / maxStorage) * 100, 100);
  document.getElementById('storageFill').style.width = `${Math.max(percent, 0.5)}%`;
  document.getElementById('storageText').textContent = `${formatSize(totalBytes)} de 5 GB usados`;
}

// ===== DELETE IMAGE =====
window.deleteImage = async function(encodedKey, displayName) {
  if (!confirm(`¿Eliminar "${displayName}" de Amazon S3?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  try {
    showToast('Eliminando archivo...', 'info');
    const res = await fetch(`${API}/api/images/${encodedKey}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar');

    showToast(`"${displayName}" eliminado correctamente`, 'success');
    loadGallery();
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Error al eliminar el archivo', 'error');
  }
};

// ===== DOWNLOAD IMAGE =====
window.downloadImage = async function(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast(`Descargando "${filename}"`, 'info');
  } catch (err) {
    showToast('Error al descargar', 'error');
  }
};

// ===== LIGHTBOX =====
window.openLightbox = function(url, name, meta) {
  lightboxImg.src = url;
  lightboxName.textContent = name;
  lightboxMeta.textContent = meta;
  lightbox.classList.add('show');
  document.body.style.overflow = 'hidden';
};

lightboxClose.addEventListener('click', closeLightbox);
document.querySelector('.lightbox-overlay').addEventListener('click', closeLightbox);

function closeLightbox() {
  lightbox.classList.remove('show');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (lightbox.classList.contains('show')) closeLightbox();
    if (uploadOverlay.classList.contains('show')) closeUploadModal();
  }
});

// ===== SEARCH =====
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    renderGallery(allImages);
    return;
  }
  const filtered = allImages.filter(item =>
    item.key.toLowerCase().includes(query)
  );
  renderGallery(filtered);
});

// Ctrl+K shortcut
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
});

// ===== REFRESH =====
refreshBtn.addEventListener('click', () => {
  loadGallery();
});

// ===== INIT =====
loadGallery();
