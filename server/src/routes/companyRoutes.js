import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  archiveCompanyContact,
  createCompanyContact,
  listCompanyContacts,
  makeCompanyContactPrimary,
  updateCompanyContact,
} from '../services/companyContactService.js';
import {
  archiveCompany,
  createCompany,
  getCompanyDetails,
  listCompanies,
  listCompanyDuplicates,
  updateCompany,
} from '../services/companyService.js';
import {
  archiveCompanyContactSchema,
  archiveCompanySchema,
  companyContactParamsSchema,
  companyIdParamsSchema,
  createCompanyContactSchema,
  createCompanySchema,
  duplicateCompaniesQuerySchema,
  listCompaniesQuerySchema,
  updateCompanyContactSchema,
  updateCompanySchema,
} from '../validators/companyValidators.js';

export const companyRouter = Router();

const adminOrLeader = [authenticate, authorizeRoles('ADMIN', 'LEADER')];

companyRouter.get(
  '/',
  authenticate,
  validateRequest({ query: listCompaniesQuerySchema }),
  asyncHandler(async (req, res) => {
    const { data, meta } = await listCompanies({ query: req.query, user: req.user });
    res.json({ success: true, data, meta });
  }),
);

companyRouter.get(
  '/duplicates',
  authenticate,
  validateRequest({ query: duplicateCompaniesQuerySchema }),
  asyncHandler(async (req, res) => {
    const data = await listCompanyDuplicates({ query: req.query, user: req.user });
    res.json({ success: true, data });
  }),
);

companyRouter.post(
  '/',
  ...adminOrLeader,
  validateRequest({ body: createCompanySchema }),
  asyncHandler(async (req, res) => {
    const data = await createCompany({
      payload: req.body,
      user: req.user,
      requestId: req.id,
    });
    res.status(201).json({ success: true, data });
  }),
);

companyRouter.get(
  '/:companyId',
  authenticate,
  validateRequest({ params: companyIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await getCompanyDetails({ companyId: req.params.companyId, user: req.user });
    res.json({ success: true, data });
  }),
);

companyRouter.patch(
  '/:companyId',
  ...adminOrLeader,
  validateRequest({ params: companyIdParamsSchema, body: updateCompanySchema }),
  asyncHandler(async (req, res) => {
    const data = await updateCompany({
      companyId: req.params.companyId,
      patch: req.body,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data });
  }),
);

companyRouter.patch(
  '/:companyId/archive',
  ...adminOrLeader,
  validateRequest({ params: companyIdParamsSchema, body: archiveCompanySchema }),
  asyncHandler(async (req, res) => {
    const data = await archiveCompany({
      companyId: req.params.companyId,
      archived: req.body.archived,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data });
  }),
);

companyRouter.get(
  '/:companyId/contacts',
  authenticate,
  validateRequest({ params: companyIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await listCompanyContacts({ companyId: req.params.companyId, user: req.user });
    res.json({ success: true, data });
  }),
);

companyRouter.post(
  '/:companyId/contacts',
  ...adminOrLeader,
  validateRequest({ params: companyIdParamsSchema, body: createCompanyContactSchema }),
  asyncHandler(async (req, res) => {
    const data = await createCompanyContact({
      companyId: req.params.companyId,
      payload: req.body,
      user: req.user,
      requestId: req.id,
    });
    res.status(201).json({ success: true, data });
  }),
);

companyRouter.patch(
  '/:companyId/contacts/:contactId',
  ...adminOrLeader,
  validateRequest({ params: companyContactParamsSchema, body: updateCompanyContactSchema }),
  asyncHandler(async (req, res) => {
    const data = await updateCompanyContact({
      companyId: req.params.companyId,
      contactId: req.params.contactId,
      patch: req.body,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data });
  }),
);

companyRouter.patch(
  '/:companyId/contacts/:contactId/archive',
  ...adminOrLeader,
  validateRequest({ params: companyContactParamsSchema, body: archiveCompanyContactSchema }),
  asyncHandler(async (req, res) => {
    const data = await archiveCompanyContact({
      companyId: req.params.companyId,
      contactId: req.params.contactId,
      archived: req.body.archived,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data });
  }),
);

companyRouter.post(
  '/:companyId/contacts/:contactId/make-primary',
  ...adminOrLeader,
  validateRequest({ params: companyContactParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await makeCompanyContactPrimary({
      companyId: req.params.companyId,
      contactId: req.params.contactId,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data });
  }),
);
