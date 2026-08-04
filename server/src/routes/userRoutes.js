import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
  userIdParamsSchema,
} from '../validators/userValidators.js';
import {
  listUsers,
  createUser,
  updateUser,
  updateUserStatus,
  resetPassword,
} from '../services/userService.js';
import { safeUser } from '../utils/safeUser.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const userRouter = Router();

// All user-management routes require ADMIN.
const admin = [authenticate, authorizeRoles('ADMIN')];

userRouter.get(
  '/',
  ...admin,
  validateRequest({ query: listUsersQuerySchema }),
  asyncHandler(async (req, res) => {
    const { data, meta } = await listUsers(req.query);
    res.json({ success: true, data: data.map(safeUser), meta });
  }),
);

userRouter.post(
  '/',
  ...admin,
  validateRequest({ body: createUserSchema }),
  asyncHandler(async (req, res) => {
    const user = await createUser({ ...req.body, actor: { id: req.user.id, requestId: req.id } });
    res.status(201).json({ success: true, data: safeUser(user) });
  }),
);

userRouter.patch(
  '/:id',
  ...admin,
  validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
  asyncHandler(async (req, res) => {
    const user = await updateUser({
      id: req.params.id,
      patch: req.body,
      actor: { id: req.user.id, requestId: req.id },
    });
    res.json({ success: true, data: safeUser(user) });
  }),
);

userRouter.patch(
  '/:id/status',
  ...admin,
  validateRequest({ params: userIdParamsSchema, body: updateUserStatusSchema }),
  asyncHandler(async (req, res) => {
    const user = await updateUserStatus({
      id: req.params.id,
      isActive: req.body.isActive,
      actor: { id: req.user.id, requestId: req.id },
    });
    res.json({ success: true, data: safeUser(user) });
  }),
);

userRouter.post(
  '/:id/reset-password',
  ...admin,
  validateRequest({ params: userIdParamsSchema, body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    await resetPassword({
      id: req.params.id,
      temporaryPassword: req.body.temporaryPassword,
      actor: { id: req.user.id, requestId: req.id },
    });
    res.json({ success: true, data: null });
  }),
);
