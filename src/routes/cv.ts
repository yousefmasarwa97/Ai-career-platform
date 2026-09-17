import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware';
import { authorize } from '../rbac';
import { sendError } from '../util';
import * as cvService from '../services/cv';

export const cvRouter = Router();
cvRouter.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Upload a CV version (candidate only, max 5 enforced in service).
cvRouter.post('/', upload.single('cv'), (req, res) => {
  try {
    authorize(req.user!, 'cv:upload');
    if (!req.file) {
      res.status(400).json({ error: 'A CV file is required (field name: "cv")' });
      return;
    }
    const version = cvService.uploadCv(
      req.user!.id,
      { originalname: req.file.originalname, buffer: req.file.buffer },
      req.body?.version_label
    );
    res.status(201).json(version);
  } catch (err) {
    sendError(res, err);
  }
});

// List own CV versions.
cvRouter.get('/', (req, res) => {
  try {
    authorize(req.user!, 'cv:read_own');
    res.json(cvService.listCvVersions(req.user!.id));
  } catch (err) {
    sendError(res, err);
  }
});

// Delete an own CV version.
cvRouter.delete('/:id', (req, res) => {
  try {
    authorize(req.user!, 'cv:upload');
    cvService.deleteCvVersion(req.user!.id, parseInt(req.params.id, 10));
    res.status(204).end();
  } catch (err) {
    sendError(res, err);
  }
});
