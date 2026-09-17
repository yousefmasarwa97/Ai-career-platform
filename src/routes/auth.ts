import { Router } from 'express';
import * as authService from '../services/auth';
import { sendError } from '../util';

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    const user = authService.register(email, password, role);
    res.status(201).json({ user });
  } catch (err) {
    sendError(res, err);
  }
});

authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = authService.login(email, password);
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});
