import { useCallback, useEffect, useState } from 'react';
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
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/AddRounded';
import ArchiveIcon from '@mui/icons-material/ArchiveOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import SaveIcon from '@mui/icons-material/SaveRounded';
import StarIcon from '@mui/icons-material/StarRounded';
import { motion } from 'framer-motion';
import { companyApi } from '../../api';
import { getErrorMessage } from '../../api/errorMessage';
import {
  COMPANY_SECTOR_LABELS,
  CONTACT_METHOD_LABELS,
  CONTACT_METHOD_OPTIONS,
  EMPTY_CONTACT_FORM,
} from './companyConstants';
import { buildContactPayload, contactToForm } from './companyFormatters';

function InfoItem({ label, value, dir }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.75 }} dir={dir}>
        {value || 'لا يوجد'}
      </Typography>
    </Box>
  );
}

export default function CompanyDetailPage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);
  const [contactError, setContactError] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [busyContactId, setBusyContactId] = useState('');
  const [archiveSaving, setArchiveSaving] = useState(false);

  const contacts = company?.contacts ?? [];
  const canEdit = Boolean(company?.permissions?.canEdit);
  const canManageContacts = Boolean(company?.permissions?.canManageContacts);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await companyApi.get(companyId);
      setCompany(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err, 'فشل تحميل تفاصيل الشركة.'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const openContactDialog = (contact = null) => {
    setEditingContact(contact);
    setContactForm(contactToForm(contact));
    setContactError('');
    setDialogOpen(true);
  };

  const closeContactDialog = () => {
    setDialogOpen(false);
    setEditingContact(null);
    setContactForm(EMPTY_CONTACT_FORM);
    setContactError('');
  };

  const updateContactField = (field) => (event) => {
    setContactForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateContactPrimary = (event) => {
    setContactForm((current) => ({ ...current, isPrimary: event.target.checked }));
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    setContactSubmitting(true);
    setContactError('');
    try {
      const payload = buildContactPayload(contactForm);
      if (editingContact) {
        await companyApi.updateContact(companyId, editingContact.id, payload);
        setToast('تم حفظ جهة التواصل.');
      } else {
        await companyApi.createContact(companyId, payload);
        setToast('تمت إضافة جهة التواصل.');
      }
      closeContactDialog();
      await load();
    } catch (err) {
      setContactError(getErrorMessage(err, 'فشل حفظ جهة التواصل.'));
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleArchiveContact = async (contact) => {
    if (!window.confirm('أرشفة جهة التواصل هذه؟')) return;
    setBusyContactId(contact.id);
    setError('');
    try {
      await companyApi.archiveContact(companyId, contact.id, true);
      setToast('تمت أرشفة جهة التواصل.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'فشل أرشفة جهة التواصل.'));
    } finally {
      setBusyContactId('');
    }
  };

  const handleMakePrimary = async (contact) => {
    setBusyContactId(contact.id);
    setError('');
    try {
      await companyApi.makePrimary(companyId, contact.id);
      setToast('تم تعيين جهة التواصل الأساسية.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'فشل تعيين جهة التواصل الأساسية.'));
    } finally {
      setBusyContactId('');
    }
  };

  const handleCompanyArchive = async () => {
    const nextArchived = !company.archivedAt;
    if (nextArchived && !window.confirm('أرشفة هذه الشركة؟')) return;
    setArchiveSaving(true);
    setError('');
    try {
      await companyApi.archive(companyId, nextArchived);
      setToast(nextArchived ? 'تمت أرشفة الشركة.' : 'تمت استعادة الشركة.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, nextArchived ? 'فشل أرشفة الشركة.' : 'فشل استعادة الشركة.'));
    } finally {
      setArchiveSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Skeleton variant="text" width={260} height={42} />
        <Skeleton variant="rectangular" height={180} />
        <Skeleton variant="rectangular" height={260} />
      </Stack>
    );
  }

  if (!company) {
    return (
      <Alert severity="error" role="alert">
        {error || 'تعذّر العثور على الشركة.'}
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
              {company.name}
            </Typography>
            <Chip
              label={company.archivedAt ? 'مؤرشفة' : 'نشطة'}
              color={company.archivedAt ? undefined : 'success'}
              variant={company.archivedAt ? 'outlined' : 'filled'}
              size="small"
            />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {COMPANY_SECTOR_LABELS[company.sector] ?? company.sector}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            to="/app/companies"
            startIcon={<ArrowBackIcon />}
            sx={{ color: 'text.secondary' }}
          >
            رجوع
          </Button>
          {canEdit && (
            <Button
              component={RouterLink}
              to={`/app/companies/${company.id}/edit`}
              variant="contained"
              startIcon={<EditIcon />}
            >
              تعديل
            </Button>
          )}
          {company.archivedAt
            ? company.permissions?.canRestore && (
                <Button
                  variant="outlined"
                  onClick={handleCompanyArchive}
                  loading={archiveSaving}
                  startIcon={<ArchiveIcon />}
                >
                  استعادة
                </Button>
              )
            : company.permissions?.canArchive && (
                <Button
                  variant="outlined"
                  onClick={handleCompanyArchive}
                  loading={archiveSaving}
                  startIcon={<ArchiveIcon />}
                >
                  أرشفة
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
              <Grid size={{ xs: 12, md: 4 }}>
                <InfoItem
                  label="القطاع"
                  value={COMPANY_SECTOR_LABELS[company.sector] ?? company.sector}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <InfoItem label="المدينة" value={company.city} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <InfoItem
                  label="النطاق"
                  value={company.websiteDomain || company.website}
                  dir="ltr"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <InfoItem label="البريد العام" value={company.generalEmail} dir="ltr" />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <InfoItem label="الهاتف" value={company.phone} dir="ltr" />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <InfoItem label="جهة التواصل الأساسية" value={company.primaryContact?.fullName} />
              </Grid>
              {(company.address || company.notes) && (
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ mb: 2 }} />
                  {company.address && <InfoItem label="العنوان" value={company.address} />}
                  {company.notes && (
                    <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
                      {company.notes}
                    </Typography>
                  )}
                </Grid>
              )}
            </Grid>
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
                  جهات التواصل
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  الأشخاص الذين يمكن التواصل معهم داخل هذه الشركة.
                </Typography>
              </Box>
              {canManageContacts && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => openContactDialog()}
                >
                  إضافة جهة تواصل
                </Button>
              )}
            </Stack>

            {contacts.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                لا توجد جهات تواصل نشطة لهذه الشركة.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {contacts.map((contact) => (
                  <Paper key={contact.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      spacing={1.5}
                    >
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {contact.fullName}
                          </Typography>
                          {contact.isPrimary && (
                            <Chip label="أساسية" color="primary" size="small" />
                          )}
                        </Stack>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {contact.position || 'لا يوجد منصب'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} dir="ltr">
                          {contact.email || contact.phone}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: 'block' }}
                        >
                          {CONTACT_METHOD_LABELS[contact.preferredContactMethod] ??
                            contact.preferredContactMethod}
                        </Typography>
                      </Box>
                      {canManageContacts && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {!contact.isPrimary && (
                            <IconButton
                              onClick={() => handleMakePrimary(contact)}
                              aria-label={`تعيين ${contact.fullName} كجهة أساسية`}
                              disabled={busyContactId === contact.id}
                              sx={{ color: 'text.secondary' }}
                            >
                              <StarIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            onClick={() => openContactDialog(contact)}
                            aria-label={`تعديل ${contact.fullName}`}
                            sx={{ color: 'text.secondary' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => handleArchiveContact(contact)}
                            aria-label={`أرشفة ${contact.fullName}`}
                            disabled={busyContactId === contact.id}
                            sx={{ color: 'text.secondary' }}
                          >
                            <ArchiveIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              سجل الرعاية
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              سجل الرعاية سيظهر هنا بعد تنفيذ قضايا الرعاية في الخطة التالية.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={dialogOpen}
        onClose={closeContactDialog}
        aria-labelledby="contact-dialog-title"
        slotProps={{ paper: { sx: { minWidth: { sm: 460 } } } }}
      >
        <DialogTitle id="contact-dialog-title" sx={{ fontWeight: 700 }}>
          {editingContact ? 'تعديل جهة التواصل' : 'إضافة جهة تواصل'}
        </DialogTitle>
        <Box component="form" onSubmit={handleContactSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {contactError && (
              <Alert severity="error" role="alert">
                {contactError}
              </Alert>
            )}
            <TextField
              label="اسم جهة التواصل"
              fullWidth
              required
              value={contactForm.fullName}
              onChange={updateContactField('fullName')}
            />
            <TextField
              label="المنصب"
              fullWidth
              value={contactForm.position}
              onChange={updateContactField('position')}
            />
            <TextField
              label="البريد الإلكتروني"
              fullWidth
              value={contactForm.email}
              onChange={updateContactField('email')}
              dir="ltr"
            />
            <TextField
              label="الهاتف"
              fullWidth
              value={contactForm.phone}
              onChange={updateContactField('phone')}
              dir="ltr"
            />
            <TextField
              select
              label="طريقة التواصل المفضلة"
              fullWidth
              value={contactForm.preferredContactMethod}
              onChange={updateContactField('preferredContactMethod')}
            >
              {CONTACT_METHOD_OPTIONS.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="ملاحظات"
              fullWidth
              multiline
              minRows={3}
              value={contactForm.notes}
              onChange={updateContactField('notes')}
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={contactForm.isPrimary}
                onChange={updateContactPrimary}
                inputProps={{ 'aria-label': 'جهة التواصل الأساسية' }}
              />
              <Typography variant="body2">جهة التواصل الأساسية</Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={closeContactDialog}
              disabled={contactSubmitting}
              sx={{ color: 'text.secondary' }}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              loading={contactSubmitting}
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
