import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticate, requireRole } from '../middleware';
import { config } from '../config';
import { sendError, HttpError } from '../util';

export const uploadsRouter = Router();
uploadsRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.images.maxBytes },
});

// Upload a company photo/logo (mentor or admin). Returns a public URL that
// the caller then stores as the job's company_logo.
uploadsRouter.post('/image', requireRole('candidate', 'mentor', 'admin'), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      throw new HttpError(400, 'An image file is required (field name: "image")');
    }
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    if (!(config.images.allowedFormats as readonly string[]).includes(ext)) {
      throw new HttpError(
        422,
        `Unsupported image format ".${ext}". Supported: ${config.images.allowedFormats.join(', ')}`
      );
    }

    const filename = `logo_${req.user!.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(config.paths.imagesDir, filename), req.file.buffer);

    // Served statically from public/images.
    res.status(201).json({ url: `/images/${filename}` });
  } catch (err) {
    sendError(res, err);
  }
});
