require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Servir el frontend directamente en la misma URL (http://localhost:3000)
app.use(express.static(path.join(__dirname, '../frontend')));

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.S3_BUCKET;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

// 1) Generar presigned URL para subir (Validez: 5 minutos / 300 segundos)
app.post('/api/upload-url', async (req, res) => {
  try {
    const { filename, contentType, sizeBytes } = req.body;

    // Validación en Backend (Requisito 38)
    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido. Solo JPG, PNG y WEBP.' });
    }
    if (sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
      return res.status(400).json({ error: 'Archivo demasiado grande. El límite es de 5 MB.' });
    }

    // Generar nombre seguro y único
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `originales/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    res.json({ uploadUrl: url, key });
  } catch (err) {
    console.error('Error al generar upload URL:', err);
    res.status(500).json({ error: 'Error interno al generar presigned URL' });
  }
});

// 2) Listar imágenes con presigned URLs de visualización (Validez: 15 minutos / 900 segundos)
app.get('/api/images', async (req, res) => {
  try {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: 'originales/'
      })
    );

    // Filtrar para ignorar la carpeta 'originales/' en sí misma si viene como objeto vacío
    const objects = (list.Contents || []).filter(
      obj => obj.Key !== 'originales/' && obj.Size > 0
    );

    const items = await Promise.all(
      objects.map(async obj => {
        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }),
          { expiresIn: 900 }
        );
        return {
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          url
        };
      })
    );

    res.json(items);
  } catch (err) {
    console.error('Error al listar imágenes:', err);
    res.status(500).json({ error: 'Error al obtener imágenes de S3' });
  }
});

// 3) Eliminar imagen
app.delete('/api/images/:key(*)', async (req, res) => {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: req.params.key
      })
    );
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error al eliminar imagen:', err);
    res.status(500).json({ error: 'Error al eliminar imagen de S3' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Servidor corriendo en: http://localhost:${PORT}`);
  console.log(` Bucket configurado: ${BUCKET}`);
  console.log(`===============================================`);
});
