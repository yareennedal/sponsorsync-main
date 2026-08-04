import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import SaveIcon from '@mui/icons-material/SaveRounded';
import { motion } from 'framer-motion';
import { companyApi } from '../../api';
import { getErrorMessage } from '../../api/errorMessage';
import {
  COMPANY_SECTOR_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  DUPLICATE_CONFIDENCE_COLORS,
  DUPLICATE_CONFIDENCE_LABELS,
  EMPTY_COMPANY_FORM,
} from './companyConstants';
import { buildCompanyPayload, companyToForm } from './companyFormatters';

function DuplicateMatches({ matches }) {
  if (!matches.length) return null;
  return (
    <Alert severity="warning" sx={{ mb: 3 }} role="alert">
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          توجد شركات مشابهة
        </Typography>
        {matches.map((match) => (
          <Stack
            key={`${match.companyId}-${match.confidence}`}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {match.name}
            </Typography>
            <Chip
              label={DUPLICATE_CONFIDENCE_LABELS[match.confidence] ?? match.confidence}
              color={DUPLICATE_CONFIDENCE_COLORS[match.confidence] ?? undefined}
              size="small"
              variant={match.confidence === 'LOW' ? 'outlined' : 'filled'}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {match.reasons.join('، ')}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Alert>
  );
}

export default function CompanyFormPage({ mode = 'create' }) {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(EMPTY_COMPANY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [conflictMatches, setConflictMatches] = useState([]);
  const duplicateSeq = useRef(0);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await companyApi.get(companyId);
        if (!cancelled) setForm(companyToForm(res.data.data));
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'فشل تحميل بيانات الشركة.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId, isEdit]);

  useEffect(() => {
    const hasIdentity =
      form.name.trim() ||
      form.website.trim() ||
      form.generalEmail.trim() ||
      form.phone.trim() ||
      form.city.trim();
    if (!hasIdentity) {
      setDuplicateMatches([]);
      return undefined;
    }

    const seq = ++duplicateSeq.current;
    const id = setTimeout(async () => {
      try {
        const res = await companyApi.duplicates({
          name: form.name,
          website: form.website,
          generalEmail: form.generalEmail,
          phone: form.phone,
          city: form.city,
          ...(isEdit ? { excludeCompanyId: companyId } : {}),
        });
        if (seq === duplicateSeq.current) setDuplicateMatches(res.data.data);
      } catch {
        if (seq === duplicateSeq.current) setDuplicateMatches([]);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [companyId, form.city, form.generalEmail, form.name, form.phone, form.website, isEdit]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateContactPrimary = (event) => {
    setForm((current) => ({ ...current, contactIsPrimary: event.target.value === 'true' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setConflictMatches([]);
    try {
      const payload = buildCompanyPayload(form, { includeContact: !isEdit });
      const res = isEdit
        ? await companyApi.update(companyId, payload)
        : await companyApi.create(payload);
      navigate(`/app/companies/${res.data.data.id}`, { replace: true });
    } catch (err) {
      const serverError = err?.response?.data?.error;
      const matches = serverError?.details?.matches ?? [];
      if (serverError?.code === 'COMPANY_DUPLICATE_HIGH_CONFIDENCE' && matches.length) {
        setConflictMatches(matches);
      }
      setError(getErrorMessage(err, isEdit ? 'فشل حفظ الشركة.' : 'فشل إنشاء الشركة.'));
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
            {isEdit ? 'تعديل الشركة' : 'شركة جديدة'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {isEdit
              ? 'تحديث بيانات الشركة مع الحفاظ على اسم العرض الأصلي.'
              : 'إضافة شركة قابلة لإعادة الاستخدام مع جهة تواصل أولية عند الحاجة.'}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to={isEdit ? `/app/companies/${companyId}` : '/app/companies'}
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
      <DuplicateMatches matches={conflictMatches.length ? conflictMatches : duplicateMatches} />

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                label="اسم الشركة"
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
                label="القطاع"
                fullWidth
                required
                disabled={loading}
                value={form.sector}
                onChange={updateField('sector')}
              >
                {COMPANY_SECTOR_OPTIONS.map((sector) => (
                  <MenuItem key={sector.value} value={sector.value}>
                    {sector.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="المدينة"
                fullWidth
                disabled={loading}
                value={form.city}
                onChange={updateField('city')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="الموقع الإلكتروني"
                fullWidth
                disabled={loading}
                value={form.website}
                onChange={updateField('website')}
                dir="ltr"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="البريد العام"
                fullWidth
                disabled={loading}
                value={form.generalEmail}
                onChange={updateField('generalEmail')}
                dir="ltr"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="الهاتف"
                fullWidth
                disabled={loading}
                value={form.phone}
                onChange={updateField('phone')}
                dir="ltr"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                label="العنوان"
                fullWidth
                disabled={loading}
                value={form.address}
                onChange={updateField('address')}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="ملاحظات"
                fullWidth
                multiline
                minRows={3}
                disabled={loading}
                value={form.notes}
                onChange={updateField('notes')}
              />
            </Grid>

            {!isEdit && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                    جهة تواصل أولية
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    يمكن ترك هذا القسم فارغاً وإضافة جهات التواصل من صفحة الشركة لاحقاً.
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="اسم جهة التواصل"
                    fullWidth
                    disabled={loading}
                    value={form.contactFullName}
                    onChange={updateField('contactFullName')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="المنصب"
                    fullWidth
                    disabled={loading}
                    value={form.contactPosition}
                    onChange={updateField('contactPosition')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="طريقة التواصل المفضلة"
                    fullWidth
                    disabled={loading}
                    value={form.contactPreferredContactMethod}
                    onChange={updateField('contactPreferredContactMethod')}
                  >
                    {CONTACT_METHOD_OPTIONS.map((method) => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="بريد جهة التواصل"
                    fullWidth
                    disabled={loading}
                    value={form.contactEmail}
                    onChange={updateField('contactEmail')}
                    dir="ltr"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="هاتف جهة التواصل"
                    fullWidth
                    disabled={loading}
                    value={form.contactPhone}
                    onChange={updateField('contactPhone')}
                    dir="ltr"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="جهة أساسية"
                    fullWidth
                    disabled={loading}
                    value={form.contactIsPrimary ? 'true' : 'false'}
                    onChange={updateContactPrimary}
                  >
                    <MenuItem value="true">نعم</MenuItem>
                    <MenuItem value="false">لا</MenuItem>
                  </TextField>
                </Grid>
              </>
            )}

            {(conflictMatches.length > 0 || form.overrideReason) && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="سبب التجاوز"
                  fullWidth
                  required={conflictMatches.length > 0}
                  multiline
                  minRows={2}
                  value={form.overrideReason}
                  onChange={updateField('overrideReason')}
                />
              </Grid>
            )}
          </Grid>

          <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
            <Button
              component={RouterLink}
              to={isEdit ? `/app/companies/${companyId}` : '/app/companies'}
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
              {isEdit ? 'حفظ التغييرات' : 'إنشاء الشركة'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
