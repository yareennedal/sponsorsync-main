import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRoles } from '../middleware/authorizeRoles.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  addEventMemberSchema,
  createEventSchema,
  createSponsorshipPackageSchema,
  eventIdParamsSchema,
  eventMemberParamsSchema,
  eventPackageParamsSchema,
  listEventMemberCandidatesQuerySchema,
  listEventsQuerySchema,
  transferEventLeaderSchema,
  updateEventSchema,
  updateEventStatusSchema,
  updateSponsorshipPackageSchema,
} from '../validators/eventValidators.js';
import {
  createEvent,
  getEventDetails,
  listEvents,
  transferEventLeader,
  updateEvent,
  updateEventStatus,
} from '../services/eventService.js';
import {
  addEventMember,
  listEventMemberCandidates,
  listEventMembers,
  removeEventMember,
} from '../services/eventMemberService.js';
import {
  createSponsorshipPackage,
  deactivateSponsorshipPackage,
  listSponsorshipPackages,
  updateSponsorshipPackage,
} from '../services/sponsorshipPackageService.js';

export const eventRouter = Router();

const adminOrLeader = [authenticate, authorizeRoles('ADMIN', 'LEADER')];

eventRouter.get(
  '/',
  authenticate,
  validateRequest({ query: listEventsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { data, meta } = await listEvents({ query: req.query, user: req.user });
    res.json({ success: true, data, meta });
  }),
);

eventRouter.post(
  '/',
  ...adminOrLeader,
  validateRequest({ body: createEventSchema }),
  asyncHandler(async (req, res) => {
    const event = await createEvent({ payload: req.body, user: req.user, requestId: req.id });
    res.status(201).json({ success: true, data: event });
  }),
);

eventRouter.get(
  '/:eventId',
  authenticate,
  validateRequest({ params: eventIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const event = await getEventDetails({ eventId: req.params.eventId, user: req.user });
    res.json({ success: true, data: event });
  }),
);

eventRouter.patch(
  '/:eventId',
  ...adminOrLeader,
  validateRequest({ params: eventIdParamsSchema, body: updateEventSchema }),
  asyncHandler(async (req, res) => {
    const event = await updateEvent({
      eventId: req.params.eventId,
      patch: req.body,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data: event });
  }),
);

eventRouter.patch(
  '/:eventId/status',
  ...adminOrLeader,
  validateRequest({ params: eventIdParamsSchema, body: updateEventStatusSchema }),
  asyncHandler(async (req, res) => {
    const event = await updateEventStatus({
      eventId: req.params.eventId,
      status: req.body.status,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data: event });
  }),
);

eventRouter.patch(
  '/:eventId/leader',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest({ params: eventIdParamsSchema, body: transferEventLeaderSchema }),
  asyncHandler(async (req, res) => {
    const event = await transferEventLeader({
      eventId: req.params.eventId,
      leaderId: req.body.leaderId,
      reason: req.body.reason,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data: event });
  }),
);

eventRouter.get(
  '/:eventId/member-candidates',
  ...adminOrLeader,
  validateRequest({ params: eventIdParamsSchema, query: listEventMemberCandidatesQuerySchema }),
  asyncHandler(async (req, res) => {
    const { data, meta } = await listEventMemberCandidates({
      eventId: req.params.eventId,
      query: req.query,
      user: req.user,
    });
    res.json({ success: true, data, meta });
  }),
);

eventRouter.get(
  '/:eventId/members',
  authenticate,
  validateRequest({ params: eventIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await listEventMembers({ eventId: req.params.eventId, user: req.user });
    res.json({ success: true, data });
  }),
);

eventRouter.post(
  '/:eventId/members',
  ...adminOrLeader,
  validateRequest({ params: eventIdParamsSchema, body: addEventMemberSchema }),
  asyncHandler(async (req, res) => {
    const { membership, created } = await addEventMember({
      eventId: req.params.eventId,
      memberUserId: req.body.userId,
      user: req.user,
      requestId: req.id,
    });
    res.status(created ? 201 : 200).json({ success: true, data: membership });
  }),
);

eventRouter.delete(
  '/:eventId/members/:userId',
  ...adminOrLeader,
  validateRequest({ params: eventMemberParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await removeEventMember({
      eventId: req.params.eventId,
      memberUserId: req.params.userId,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data });
  }),
);

eventRouter.get(
  '/:eventId/packages',
  authenticate,
  validateRequest({ params: eventIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await listSponsorshipPackages({ eventId: req.params.eventId, user: req.user });
    res.json({ success: true, data });
  }),
);

eventRouter.post(
  '/:eventId/packages',
  ...adminOrLeader,
  validateRequest({ params: eventIdParamsSchema, body: createSponsorshipPackageSchema }),
  asyncHandler(async (req, res) => {
    const data = await createSponsorshipPackage({
      eventId: req.params.eventId,
      payload: req.body,
      user: req.user,
      requestId: req.id,
    });
    res.status(201).json({ success: true, data });
  }),
);

eventRouter.patch(
  '/:eventId/packages/:packageId',
  ...adminOrLeader,
  validateRequest({ params: eventPackageParamsSchema, body: updateSponsorshipPackageSchema }),
  asyncHandler(async (req, res) => {
    const data = await updateSponsorshipPackage({
      eventId: req.params.eventId,
      packageId: req.params.packageId,
      patch: req.body,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data });
  }),
);

eventRouter.delete(
  '/:eventId/packages/:packageId',
  ...adminOrLeader,
  validateRequest({ params: eventPackageParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await deactivateSponsorshipPackage({
      eventId: req.params.eventId,
      packageId: req.params.packageId,
      user: req.user,
      requestId: req.id,
    });
    res.json({ success: true, data });
  }),
);
