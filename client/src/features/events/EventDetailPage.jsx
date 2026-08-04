import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/AddRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import PersonRemoveIcon from '@mui/icons-material/PersonRemoveOutlined';
import SaveIcon from '@mui/icons-material/SaveRounded';
import SearchIcon from '@mui/icons-material/SearchRounded';
import { motion } from 'framer-motion';
import { eventApi } from '../../api';
import { getErrorMessage } from '../../api/errorMessage';
import { ROLE_LABELS } from '../../constants/roles';
import { useAuth } from '../auth/useAuth';
import {
  EMPTY_PACKAGE_FORM,
  EVENT_CATEGORY_LABELS,
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
  MEMBER_CANDIDATE_ROLES,
} from './eventConstants';
import { formatDateOnly, formatMoney, packageToForm } from './eventFormatters';

const STATUS_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

function EventStatusChip({ status }) {
  const color = EVENT_STATUS_COLORS[status] ?? 'default';
  return (
    <Chip
      label={EVENT_STATUS_LABELS[status] ?? status}
      color={color === 'default' ? undefined : color}
      variant={status === 'ARCHIVED' || status === 'DRAFT' ? 'outlined' : 'filled'}
      size="small"
      sx={color === 'default' ? { color: 'text.secondary' } : undefined}
    />
  );
}

function nextStatuses(status, role) {
  if (status === 'ARCHIVED' && role !== 'ADMIN') return [];
  return STATUS_TRANSITIONS[status] ?? [];
}

function MemberChip({ member, canRemove, busy, onRemove }) {
  return (
    <Chip
      label={`${member.fullName} · ${ROLE_LABELS[member.role]}`}
      variant={member.role === 'SUPERVISOR' ? 'filled' : 'outlined'}
      onDelete={canRemove ? () => onRemove(member) : undefined}
      deleteIcon={canRemove ? <PersonRemoveIcon /> : undefined}
      disabled={busy}
    />
  );
}

export default function EventDetailPage() {
  const { user } = useAuth();
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [debouncedCandidateSearch, setDebouncedCandidateSearch] = useState('');
  const [candidateRole, setCandidateRole] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [memberBusyId, setMemberBusyId] = useState('');
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageForm, setPackageForm] = useState(EMPTY_PACKAGE_FORM);
  const [packageError, setPackageError] = useState('');
  const [packageSubmitting, setPackageSubmitting] = useState(false);
  const [packageBusyId, setPackageBusyId] = useState('');
  const candidateSeq = useRef(0);

  const canEdit = Boolean(event?.permissions?.canEdit);
  const canManageMembers = Boolean(event?.permissions?.canManageMembers);
  const canManagePackages = Boolean(event?.permissions?.canManagePackages);
  const availableStatuses = event ? nextStatuses(event.status, user.role) : [];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eventRes, packagesRes] = await Promise.all([
        eventApi.get(eventId),
        eventApi.listPackages(eventId),
      ]);
      setEvent(eventRes.data.data);
      setPackages(packagesRes.data.data);
      setNextStatus('');
    } catch (err) {
      setError(getErrorMessage(err, 'فشل تحميل تفاصيل الفعالية.'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const loadCandidates = useCallback(async () => {
    if (!canManageMembers) return;
    const seq = ++candidateSeq.current;
    setCandidatesLoading(true);
    setCandidateError('');
    try {
      const res = await eventApi.memberCandidates(eventId, {
        search: debouncedCandidateSearch,
        role: candidateRole,
        page: 1,
        pageSize: 20,
      });
      if (seq !== candidateSeq.current) return;
      setCandidates(res.data.data);
    } catch (err) {
      if (seq !== candidateSeq.current) return;
      setCandidateError(getErrorMessage(err, 'فشل تحميل المرشحين للفريق.'));
    } finally {
      if (seq === candidateSeq.current) setCandidatesLoading(false);
    }
  }, [canManageMembers, candidateRole, debouncedCandidateSearch, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedCandidateSearch(candidateSearch), 300);
    return () => clearTimeout(id);
  }, [candidateSearch]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;
    setStatusSaving(true);
    setError('');
    try {
      await eventApi.updateStatus(eventId, nextStatus);
      setToast('تم تحديث حالة الفعالية.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'فشل تحديث حالة الفعالية.'));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAddMember = async (candidate) => {
    setMemberBusyId(candidate.id);
    setCandidateError('');
    try {
      await eventApi.addMember(eventId, candidate.id);
      setToast(
        candidate.membershipStatus === 'INACTIVE' ? 'تمت إعادة تفعيل العضو.' : 'تمت إضافة العضو.',
      );
      await load();
      await loadCandidates();
    } catch (err) {
      setCandidateError(getErrorMessage(err, 'فشل إضافة العضو إلى الفعالية.'));
    } finally {
      setMemberBusyId('');
    }
  };

  const handleRemoveMember = async (member) => {
    setMemberBusyId(member.id);
    setError('');
    try {
      await eventApi.removeMember(eventId, member.id);
      setToast('تمت إزالة العضو من الفريق.');
      await load();
      await loadCandidates();
    } catch (err) {
      setError(getErrorMessage(err, 'فشل إزالة عضو الفريق.'));
    } finally {
      setMemberBusyId('');
    }
  };

  const openPackageDialog = (pkg = null) => {
    setEditingPackage(pkg);
    setPackageForm(packageToForm(pkg));
    setPackageError('');
    setPackageDialogOpen(true);
  };

  const closePackageDialog = () => {
    setPackageDialogOpen(false);
    setEditingPackage(null);
    setPackageForm(EMPTY_PACKAGE_FORM);
    setPackageError('');
  };

  const updatePackageField = (field) => (e) => {
    setPackageForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const handlePackageSubmit = async (e) => {
    e.preventDefault();
    setPackageSubmitting(true);
    setPackageError('');
    try {
      const payload = {
        name: packageForm.name,
        amount: packageForm.amount,
        benefits: packageForm.benefits,
        displayOrder: packageForm.displayOrder,
      };
      if (editingPackage) {
        await eventApi.updatePackage(eventId, editingPackage.id, payload);
        setToast('تم حفظ حزمة الرعاية.');
      } else {
        await eventApi.createPackage(eventId, payload);
        setToast('تمت إضافة حزمة الرعاية.');
      }
      closePackageDialog();
      await load();
    } catch (err) {
      setPackageError(getErrorMessage(err, 'فشل حفظ حزمة الرعاية.'));
    } finally {
      setPackageSubmitting(false);
    }
  };

  const handleDeactivatePackage = async (pkg) => {
    if (!window.confirm('إزالة هذه الحزمة من القائمة النشطة؟')) return;
    setPackageBusyId(pkg.id);
    setError('');
    try {
      await eventApi.deactivatePackage(eventId, pkg.id);
      setToast('تمت إزالة حزمة الرعاية من القائمة النشطة.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'فشل إزالة حزمة الرعاية.'));
    } finally {
      setPackageBusyId('');
    }
  };

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Skeleton variant="text" width={260} height={42} />
        <Skeleton variant="rectangular" height={180} />
        <Skeleton variant="rectangular" height={240} />
      </Stack>
    );
  }

  if (!event) {
    return (
      <Alert severity="error" role="alert">
        {error || 'تعذّر العثور على الفعالية.'}
      </Alert>
    );
  }

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.75 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              {event.name}
            </Typography>
            <EventStatusChip status={event.status} />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {EVENT_CATEGORY_LABELS[event.category] ?? event.category} ·{' '}
            {formatDateOnly(event.eventDate)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            to="/app/events"
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'text.secondary' }}
          >
            رجوع
          </Button>
          {canEdit && (
            <Button
              component={RouterLink}
              to={`/app/events/${event.id}/edit`}
              variant="contained"
              startIcon={<EditIcon />}
            >
              تعديل
            </Button>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2.5 }}>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  هدف الرعاية
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {formatMoney(event.financialTarget)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  الموعد النهائي
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.75 }}>
                  {formatDateOnly(event.sponsorshipDeadline)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  الموقع
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.75 }}>
                  {event.location || 'لا يوجد'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  قائد الفعالية
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.75 }}>
                  {event.leader?.fullName ?? 'غير محدد'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  القطاعات المستهدفة
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {(event.targetSectors?.length ? event.targetSectors : ['لا يوجد']).map(
                    (sector) => (
                      <Chip key={sector} label={sector} size="small" variant="outlined" />
                    ),
                  )}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  المدن المستهدفة
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {(event.targetCities?.length ? event.targetCities : ['لا يوجد']).map((city) => (
                    <Chip key={city} label={city} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Grid>
              {event.description && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    الوصف
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: 'pre-line' }}>
                    {event.description}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {event.permissions?.canChangeStatus && availableStatuses.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'center' }}
              >
                <TextField
                  select
                  label="تغيير الحالة إلى"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  size="small"
                  sx={{ minWidth: { sm: 220 } }}
                >
                  <MenuItem value="" disabled>
                    اختر الحالة
                  </MenuItem>
                  {availableStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {EVENT_STATUS_LABELS[status]}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  onClick={handleStatusUpdate}
                  loading={statusSaving}
                  disabled={!nextStatus}
                >
                  تحديث الحالة
                </Button>
              </Stack>
            </Paper>
          )}

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                  فريق الفعالية
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  الأعضاء والمشرفون المرتبطون بهذه الفعالية.
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {event.members?.length ? (
                event.members.map((member) => (
                  <MemberChip
                    key={member.id}
                    member={member}
                    canRemove={canManageMembers}
                    busy={memberBusyId === member.id}
                    onRemove={handleRemoveMember}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  لا يوجد أعضاء مضافون بعد.
                </Typography>
              )}
            </Stack>

            {canManageMembers && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      label="بحث عن عضو"
                      placeholder="الاسم أو البريد الإلكتروني"
                      fullWidth
                      size="small"
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <SearchIcon
                              sx={{ color: 'text.secondary', marginInlineEnd: 1 }}
                              fontSize="small"
                            />
                          ),
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      select
                      label="الدور"
                      fullWidth
                      size="small"
                      value={candidateRole}
                      onChange={(e) => setCandidateRole(e.target.value)}
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {MEMBER_CANDIDATE_ROLES.map((role) => (
                        <MenuItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
                {candidateError && (
                  <Alert severity="error" sx={{ mb: 2 }} role="alert">
                    {candidateError}
                  </Alert>
                )}
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>المرشح</TableCell>
                        <TableCell>الدور</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>الإجراء</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidatesLoading ? (
                        Array.from({ length: 3 }, (_, i) => (
                          <TableRow key={`candidate-skeleton-${i}`}>
                            {Array.from({ length: 4 }, (_, c) => (
                              <TableCell key={c}>
                                <Skeleton variant="text" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : candidates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ py: 3, borderBottom: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', textAlign: 'center' }}
                            >
                              لا يوجد مرشحون متاحون.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        candidates.map((candidate) => (
                          <TableRow key={candidate.id}>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {candidate.fullName}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {candidate.email}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>{ROLE_LABELS[candidate.role]}</TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  candidate.membershipStatus === 'INACTIVE' ? 'إعادة تفعيل' : 'جديد'
                                }
                                size="small"
                                variant={
                                  candidate.membershipStatus === 'INACTIVE' ? 'filled' : 'outlined'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                startIcon={<PersonAddIcon />}
                                onClick={() => handleAddMember(candidate)}
                                loading={memberBusyId === candidate.id}
                              >
                                إضافة
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                  حزم الرعاية
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  الحزم اختيارية وتستخدم كقوالب للعروض في المرحلة التالية.
                </Typography>
              </Box>
              {canManagePackages && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => openPackageDialog()}
                >
                  إضافة حزمة
                </Button>
              )}
            </Stack>

            {packages.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                لا توجد حزم رعاية نشطة لهذه الفعالية.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الحزمة</TableCell>
                      <TableCell>المبلغ</TableCell>
                      <TableCell>المزايا</TableCell>
                      <TableCell>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{pkg.name}</TableCell>
                        <TableCell>{formatMoney(pkg.amount)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {pkg.benefits}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {canManagePackages ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton
                                onClick={() => openPackageDialog(pkg)}
                                sx={{ color: 'text.secondary' }}
                                aria-label={`تعديل حزمة ${pkg.name}`}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                onClick={() => handleDeactivatePackage(pkg)}
                                sx={{ color: 'text.secondary' }}
                                aria-label={`إزالة حزمة ${pkg.name}`}
                                disabled={packageBusyId === pkg.id}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              قراءة فقط
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              أعمال الرعاية
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              قضايا الرعاية، تعيين الشركات، والمتابعات ستظهر هنا بعد تنفيذ خطة الرعاية التالية.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={packageDialogOpen}
        onClose={closePackageDialog}
        aria-labelledby="package-dialog-title"
        slotProps={{ paper: { sx: { minWidth: { sm: 460 } } } }}
      >
        <DialogTitle id="package-dialog-title" sx={{ fontWeight: 700 }}>
          {editingPackage ? 'تعديل حزمة الرعاية' : 'إضافة حزمة رعاية'}
        </DialogTitle>
        <Box component="form" onSubmit={handlePackageSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {packageError && (
              <Alert severity="error" role="alert">
                {packageError}
              </Alert>
            )}
            <TextField
              label="اسم الحزمة"
              fullWidth
              required
              value={packageForm.name}
              onChange={updatePackageField('name')}
            />
            <TextField
              label="المبلغ"
              type="number"
              fullWidth
              required
              value={packageForm.amount}
              onChange={updatePackageField('amount')}
              slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
            />
            <TextField
              label="ترتيب العرض"
              type="number"
              fullWidth
              value={packageForm.displayOrder}
              onChange={updatePackageField('displayOrder')}
            />
            <TextField
              label="المزايا"
              fullWidth
              required
              multiline
              minRows={4}
              value={packageForm.benefits}
              onChange={updatePackageField('benefits')}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={closePackageDialog}
              disabled={packageSubmitting}
              sx={{ color: 'text.secondary' }}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              loading={packageSubmitting}
            >
              حفظ
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
