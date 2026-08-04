import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import SaveIcon from '@mui/icons-material/SaveRounded';
import { motion } from 'framer-motion';
import { eventApi, userApi } from '../../api';
import { getErrorMessage } from '../../api/errorMessage';
import { useAuth } from '../auth/useAuth';
import {
  CREATE_STATUS_OPTIONS,
  EMPTY_EVENT_FORM,
  EVENT_CATEGORY_OPTIONS,
  EVENT_STATUS_LABELS,
} from './eventConstants';
import { buildEventPayload, eventToForm } from './eventFormatters';

export default function EventFormPage({ mode = 'create' }) {
  const { user } = useAuth();
  const { eventId } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const isAdminCreate = !isEdit && user.role === 'ADMIN';

  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(isEdit || isAdminCreate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [eventRes, leadersRes] = await Promise.all([
          isEdit ? eventApi.get(eventId) : Promise.resolve(null),
          isAdminCreate
            ? userApi.list({ page: 1, pageSize: 100, role: 'LEADER', status: 'active' })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (eventRes) setForm(eventToForm(eventRes.data.data));
        if (leadersRes) {
          const leaderRows = leadersRes.data.data;
          setLeaders(leaderRows);
          setForm((current) => ({
            ...current,
            leaderId: current.leaderId || leaderRows[0]?.id || '',
          }));
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'فشل تحميل بيانات الفعالية.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, isAdminCreate, isEdit]);

  const updateField = (field) => (e) => {
    setForm((current) => ({ ...current, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = buildEventPayload(form, {
        includeStatus: !isEdit,
        includeLeader: isAdminCreate,
      });
      const res = isEdit ? await eventApi.update(eventId, payload) : await eventApi.create(payload);
      navigate(`/app/events/${res.data.data.id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, isEdit ? 'فشل حفظ الفعالية.' : 'فشل إنشاء الفعالية.'));
    } finally {
      setSubmitting(false);
    }
  };

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
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {isEdit ? 'تعديل الفعالية' : 'فعالية جديدة'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {isEdit
              ? 'تحديث بيانات الفعالية الأساسية دون تغيير القيادة أو الحالة.'
              : 'تحديد بيانات الفعالية وهدف الرعاية والفريق المسؤول.'}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to={isEdit ? `/app/events/${eventId}` : '/app/events'}
          startIcon={<ArrowBackIcon />}
          sx={{ color: 'text.secondary' }}
        >
          رجوع
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                label="اسم الفعالية"
                fullWidth
                required
                disabled={loading}
                value={form.name}
                onChange={updateField('name')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                label="التصنيف"
                fullWidth
                required
                disabled={loading}
                value={form.category}
                onChange={updateField('category')}
              >
                {EVENT_CATEGORY_OPTIONS.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="الوصف"
                fullWidth
                multiline
                minRows={3}
                disabled={loading}
                value={form.description}
                onChange={updateField('description')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="تاريخ الفعالية"
                type="date"
                fullWidth
                required
                disabled={loading}
                value={form.eventDate}
                onChange={updateField('eventDate')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="موعد الرعاية"
                type="date"
                fullWidth
                disabled={loading}
                value={form.sponsorshipDeadline}
                onChange={updateField('sponsorshipDeadline')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="هدف الرعاية"
                type="number"
                fullWidth
                required
                disabled={loading}
                value={form.financialTarget}
                onChange={updateField('financialTarget')}
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="الموقع"
                fullWidth
                disabled={loading}
                value={form.location}
                onChange={updateField('location')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="القطاعات المستهدفة"
                fullWidth
                disabled={loading}
                placeholder="Technology، Education"
                value={form.targetSectorsText}
                onChange={updateField('targetSectorsText')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="المدن المستهدفة"
                fullWidth
                disabled={loading}
                placeholder="Amman، Irbid"
                value={form.targetCitiesText}
                onChange={updateField('targetCitiesText')}
              />
            </Grid>

            {!isEdit && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="الحالة الأولية"
                  fullWidth
                  required
                  disabled={loading}
                  value={form.status}
                  onChange={updateField('status')}
                >
                  {CREATE_STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>
                      {EVENT_STATUS_LABELS[status]}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {isAdminCreate && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="قائد الفعالية"
                  fullWidth
                  required
                  disabled={loading || leaders.length === 0}
                  value={form.leaderId}
                  onChange={updateField('leaderId')}
                >
                  <MenuItem value="" disabled>
                    اختر قائد الفعالية
                  </MenuItem>
                  {leaders.map((leader) => (
                    <MenuItem key={leader.id} value={leader.id}>
                      {leader.fullName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>

          <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
            <Button
              component={RouterLink}
              to={isEdit ? `/app/events/${eventId}` : '/app/events'}
              disabled={submitting}
              sx={{ color: 'text.secondary' }}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              loading={submitting}
              disabled={loading}
            >
              {isEdit ? 'حفظ التغييرات' : 'إنشاء الفعالية'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
