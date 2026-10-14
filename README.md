# ☁️ CloudVault — Gestor de Imágenes Seguro en Amazon S3

<p align="center">
  <img src="https://img.shields.io/badge/AWS-S3-orange?style=for-the-badge&logo=amazons3" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Node.js-24.x-green?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-lightgrey?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Seguridad-Presigned_URLs-blue?style=for-the-badge&logo=security" alt="Presigned URLs" />
</p>

---

## 📹 Video Demostrativo del Proyecto

> [!TIP]
> **El video completo de demostración, explicación y sustentación del laboratorio está alojado en Google Drive:**
>
> ### 🔗 [▶️ Ver Video Demostrativo en Google Drive (Clic Aquí)](https://drive.google.com/file/d/TU_LINK_DE_DRIVE_AQUI/view?usp=sharing)
>
> *(Nota: Reemplaza el enlace por tu URL pública o de visualización de Drive).*
>
> **En el video se evidencian todas las funcionalidades y pruebas obligatorias:**
> 1. Inicio del servidor Node.js y conexión con AWS S3.
> 2. Subida de imágenes con Drag & Drop hacia Amazon S3 mediante **Presigned URLs**.
> 3. Carga en tiempo real de la galería y cálculo de métricas de almacenamiento.
> 4. Previsualización en **Lightbox**, descarga y eliminación de objetos en el bucket.
> 5. **Inspección con DevTools (F12):** Demostración de que la petición `PUT` va directamente a S3 sin pasar bytes por el backend y confirmación de que **no existen credenciales ni claves de AWS en el código del cliente**.
> 6. Validación de archivos (bloqueo por extensión no permitida y límite de 5 MB).

---

## 🏛️ Arquitectura del Sistema

El principio fundamental de seguridad es que **el bucket S3 es 100% privado** y **el navegador jamás tiene contacto con credenciales de AWS**. Las imágenes viajan de forma directa desde el navegador del cliente hacia Amazon S3 usando URLs prefirmadas de corta duración:

```
+-------------+      1) POST /api/upload-url       +-----------------+
|             | ---------------------------------> |                 |
|  Navegador  |  2) Presigned URL (PUT, 5 min)     |  Backend (API)  |
|  (Frontend) | <--------------------------------- |  (Node/Express) |
|             |                                    +-----------------+
|             |  3) PUT imagen directa a S3                 |
|             | -----------------------------\              | IAM Role con
+-------------+                              |              | permisos mínimos
                                             v              v
                                      +-------------------------------+
                                      |         Amazon S3             |
                                      |  Bucket: lab09-rivera-14102026|
                                      |  (Cifrado AES-256 + CORS)     |
                                      +-------------------------------+
```

---

## ✨ Características Principales

### 🖥️ Frontend (UI estilo Google Drive)
- **Top Navbar:** Búsqueda en tiempo real (`Ctrl + K`), cambio de vista (cuadrícula / lista) y avatar de usuario.
- **Sidebar de Navegación:** Pestañas de Mi Galería, Recientes, Destacados y Papelera.
- **Widget de Almacenamiento:** Cálculo dinámico de espacio usado y capacidad disponible.
- **Dashboard de Métricas:** Contador de imágenes, tamaño total en KB/MB, timestamp de última subida y vigencia de URLs.
- **Modal de Carga:** Zona interactiva de Drag & Drop con vista previa inmediata antes de subir.
- **Lightbox:** Visualizador inmersivo a pantalla completa con detalles del objeto.
- **Notificaciones Toast:** Feedback visual estilo Material Design para cada acción (éxito, error, advertencia).

### 🛡️ Seguridad & Cloud (AWS S3 + IAM)
- **Zero Frontend Credentials:** Las claves `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` solo residen en el backend en variables de entorno `.env`.
- **URLs Prefirmadas (Presigned URLs):**
  - Carga (`PUT`): Válida por **5 minutos (300 s)**.
  - Descarga / Visualización (`GET`): Válida por **15 minutos (900 s)**.
- **Principio de Mínimo Privilegio (IAM):** Usuario dedicado `app-imagenes-user` restringido únicamente a `GetObject`, `PutObject`, `DeleteObject` y `ListBucket`.
- **CORS Configurado:** Permite peticiones directas desde `http://localhost:3000` autorizando métodos `GET` y `PUT`.
- **Cifrado en Reposo:** Cifrado automático del lado del servidor habilitado con **SSE-S3 (AES-256)**.
- **Conexiones Seguras Obligatorias:** Política de bucket que deniega cualquier petición por protocolo HTTP simple forzando HTTPS mediante `aws:SecureTransport`.
- **Doble Validación:**
  - *Frontend:* Validación rápida de tipos MIME (`image/jpeg`, `image/png`, `image/webp`) y tamaño `< 5 MB`.
  - *Backend:* Revalidación estricta antes de firmar cualquier URL.

---

## 📁 Estructura del Proyecto

```text
s3-gallery/
├── demo.mp4               # 🎥 Video demostrativo de funcionamiento
├── .gitignore             # Protección de credenciales y dependencias
├── README.md              # Documentación técnica del proyecto
├── backend/
│   ├── .env.example       # Plantilla de variables de entorno
│   ├── .env               # Credenciales privadas (ignorado en Git)
│   ├── package.json       # Dependencias de Node.js
│   └── server.js          # Servidor Express y AWS SDK v3
└── frontend/
    ├── index.html         # Interfaz web interactiva tipo Google Drive
    ├── styles.css         # Sistema de diseño, layout y animaciones
    └── app.js             # Lógica cliente, consumo de API y subida a S3
```

---

## 🚀 Instalación y Despliegue Local

### 1. Clonar el repositorio
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd s3-gallery
```

### 2. Configurar variables de entorno
Dentro de la carpeta `backend/`, copia el archivo de ejemplo y coloca tus datos:
```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env`:
```env
AWS_REGION=us-east-1
S3_BUCKET=tu-nombre-de-bucket
AWS_ACCESS_KEY_ID=tu-access-key-id
AWS_SECRET_ACCESS_KEY=tu-secret-access-key
PORT=3000
```

### 3. Instalar dependencias
```bash
cd backend
npm install
```

### 4. Iniciar la aplicación
```bash
node server.js
```

La aplicación quedará disponible en:  
👉 **`http://localhost:3000`**

---

## 📡 Endpoints de la API

| Método | Endpoint | Descripción | Tiempo Expiración |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/upload-url` | Genera una URL prefirmada para subida directa a S3 | **5 minutos** (300s) |
| `GET` | `/api/images` | Lista los objetos del prefijo `originales/` con URLs prefirmadas | **15 minutos** (900s) |
| `DELETE` | `/api/images/:key` | Elimina permanentemente el objeto especificado en el bucket | Inmediato |

---

## 🧪 Pruebas Obligatorias Validadas

| N° | Prueba | Resultado Observado |
| :---: | :--- | :--- |
| **39** | Subida de imagen JPG válida | ✅ Archivo subido con éxito y renderizado en la galería. |
| **40** | Subida de `.exe` o `.pdf` | ✅ Bloqueado por el frontend con alerta de tipo no permitido. |
| **41** | Subida de archivo > 5 MB | ✅ Bloqueado por tamaño excedido tanto en cliente como en servidor. |
| **42** | Expiración de URL prefirmada | ✅ Al abrir la URL tras 16 minutos, AWS devuelve `Request has expired`. |
| **43** | Inspección de código fuente | ✅ Pestaña *Sources* confirma ausencia total de llaves `AKIA...` o secretos. |
| **44** | Inspección de red (Network) | ✅ Petición `PUT` apunta directamente al endpoint de S3 (`*.amazonaws.com`). |

---

## 👨‍💻 Autor
* **Estudiante:** Anderson Rivera
* **Curso:** Computación en la Nube / Cloud Solutions
* **Institución:** Tecsup / Universidad
