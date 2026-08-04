import { Router } from 'express';
import { sequelize } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    if (!sequelize) {
      return res.status(503).json({
        success: false,
        error: { code: 'DB_NOT_CONFIGURED', message: 'Database is not configured.', details: null },
      });
    }
    try {
      await sequelize.authenticate();
      return res.status(200).json({ success: true, data: { status: 'ok', database: 'connected' } });
    } catch {
      return res.status(503).json({
        success: false,
        error: { code: 'DB_UNREACHABLE', message: 'Database is not reachable.', details: null },
      });
    }
  }),
);
