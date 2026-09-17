import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { initSchema } from './db';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { cvRouter } from './routes/cv';
import { jobRouter } from './routes/jobs';
import { aiRouter } from './routes/ai';
import { adminRouter } from './routes/admin';
import { uploadsRouter } from './routes/uploads';

initSchema();

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/cv', cvRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/uploads', uploadsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', aiProvider: config.aiProvider, allowExternalLlm: config.allowExternalLlm });
});

// Static frontend
app.use(express.static(config.paths.publicDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(config.paths.publicDir, 'index.html'));
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`AI Career Platform running at http://localhost:${config.port}`);
  // eslint-disable-next-line no-console
  console.log(`AI provider: ${config.aiProvider} (external LLM allowed: ${config.allowExternalLlm})`);
});
