import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
// MUI v6: the default Grid export is still the legacy API (item + xs/sm/md). Grid2 is the
// one that takes size={{...}}. Importing plain Grid with size props silently drops every
// width, which collapses the layout.
import Grid from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/AddRounded';
import LockResetIcon from '@mui/icons-material/LockResetRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import SearchIcon from '@mui/icons-material/SearchRounded';
import { motion } from 'framer-motion';
import { userApi } from '../../api';
import { getErrorMessage } from '../../api/errorMessage';
import { ROLE_LABELS } from '../../constants/roles';
import StatusChip from '../../components/StatusChip';

const emptyForm = { fullName: '', email: '', role: 'MEMBER', temporaryPassword: '' };

export default function UsersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createError, setCreateError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState('');
  const [resetError, setResetError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { page, pageSize } = meta;

  // Debounced so typing filters the table directly. The previous version needed
  // an «تطبيق» button that nothing signposted, and Enter did not submit either.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Any filter change resets to page 1 — otherwise a narrower result set leaves
  // you stranded on a page that no longer exists.
  useEffect(() => {
    setMeta((m) => (m.page === 1 ? m : { ...m, page: 1 }));
  }, [debouncedSearch, role, status]);

  // The page reset and the fetch both react to a filter change, so two requests fly: one
  // with the old page, one with page 1. Whichever RESOLVES last used to win, and load()
  // also wrote the server's echoed meta.page back into state — so a stale page-3 response
  // could replace real page-1 matches with an empty list and snap the pager back to 3.
  // A monotonic token means only the newest response is allowed to touch state, and `page`
  // stays client-owned.
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const res = await userApi.list({ search: debouncedSearch, role, status, page, pageSize });
      if (seq !== requestSeq.current) return;
      setRows(res.data.data);
      setMeta((m) => ({
        ...m,
        total: res.data.meta.total,
        totalPages: res.data.meta.totalPages,
      }));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(getErrorMessage(err, 'فشل تحميل قائمة المستخدمين.'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, role, status, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = Boolean(debouncedSearch || role || status);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setSubmitting(true);
    try {
      await userApi.create(createForm);
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setToast('تم إنشاء المستخدم.');
      await load();
    } catch (err) {
      setCreateError(getErrorMessage(err, 'فشل إنشاء المستخدم.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setSubmitting(true);
    try {
      await userApi.update(editing.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        role: editForm.role,
      });
      setEditing(null);
      setToast('تم حفظ التغييرات.');
      await load();
    } catch (err) {
      setEditError(getErrorMessage(err, 'فشل تحديث بيانات المستخدم.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Patches the single row from the response instead of refetching the whole
  // table for a one-field change.
  const handleStatus = async (user) => {
    setError('');
    try {
      const res = await userApi.updateStatus(user.id, !user.isActive);
      const updated = res.data.data;
      setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
      setToast(updated.isActive ? 'تم تفعيل الحساب.' : 'تم تعطيل الحساب.');
    } catch (err) {
      setError(getErrorMessage(err, 'فشل تغيير حالة الحساب.'));
    }
  };

  const closeReset = () => {
    setResetTarget(null);
    setResetPw('');
    setResetError('');
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateForm(emptyForm);
    setCreateError('');
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError('');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setSubmitting(true);
    try {
      await userApi.resetPassword(resetTarget.id, resetPw);
      setResetTarget(null);
      setResetPw('');
      setToast('تم تعيين كلمة مرور مؤقتة جديدة.');
    } catch (err) {
      setResetError(getErrorMessage(err, 'فشل إعادة تعيين كلمة المرور.'));
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
            إدارة المستخدمين
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            إضافة وإدارة حسابات فريق عمل SponsorSync والصلاحيات الممنوحة.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ px: 2.5, py: 1, flexShrink: 0 }}
        >
          إضافة مستخدم جديد
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="بحث"
              placeholder="ابحث بالاسم أو البريد الإلكتروني"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
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

          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              fullWidth
              label="الدور"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              size="small"
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              fullWidth
              label="الحالة"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="small"
            >
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="active">نشط</MenuItem>
              <MenuItem value="disabled">معطل</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>
      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>المستخدم</TableCell>
              <TableCell>البريد الإلكتروني</TableCell>
              <TableCell>الدور المسند</TableCell>
              <TableCell>حالة الحساب</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Skeleton in the shape of the real rows, not a spinner or a text
              // line — the layout does not jump when the data lands.
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 5 }, (_, c) => (
                    <TableCell key={c}>
                      <Skeleton variant="text" width={c === 1 ? '80%' : '55%'} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 6, borderBottom: 0 }}>
                  {/* Two distinct states: "your filters matched nothing" is a
                      different problem from "there is nobody here yet", and only
                      one of them is solved by creating a user. */}
                  <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {hasFilters ? 'لا نتائج مطابقة' : 'لا يوجد مستخدمون بعد'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380 }}>
                      {hasFilters
                        ? 'جرّب تعديل كلمة البحث أو إزالة عوامل التصفية.'
                        : 'ابدأ بإضافة أعضاء فريق العمل وتحديد صلاحياتهم.'}
                    </Typography>
                    {hasFilters ? (
                      <Button
                        onClick={() => {
                          setSearch('');
                          setRole('');
                          setStatus('');
                        }}
                      >
                        إزالة عوامل التصفية
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                      >
                        إضافة مستخدم جديد
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 150ms',
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{row.fullName}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{row.email}</TableCell>
                  <TableCell>
                    <Chip label={ROLE_LABELS[row.role]} size="small" />
                  </TableCell>
                  <TableCell>
                    <StatusChip isActive={row.isActive} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton
                        onClick={() => {
                          setEditing(row);
                          setEditForm({ fullName: row.fullName, email: row.email, role: row.role });
                        }}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                        }}
                        aria-label={`تعديل بيانات ${row.fullName}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => setResetTarget(row)}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                        }}
                        aria-label={`إعادة تعيين كلمة مرور ${row.fullName}`}
                      >
                        <LockResetIcon fontSize="small" />
                      </IconButton>
                      {/* success, not primary: the toggle's on-state means the same
                          thing as the green «نشط» chip beside it. The accent stays
                          reserved for actions and navigation. */}
                      <Switch
                        color="success"
                        checked={row.isActive}
                        onChange={() => handleStatus(row)}
                        aria-label={`${row.isActive ? 'تعطيل' : 'تفعيل'} حساب ${row.fullName}`}
                      />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={meta.total}
          page={meta.page - 1}
          onPageChange={(_, p) => setMeta((m) => ({ ...m, page: p + 1 }))}
          rowsPerPage={meta.pageSize}
          // Must include the initial pageSize (20, matching the server's default in
          // listUsersQuerySchema). MUI's default options are [10, 25, 50, 100], so 20 was
          // out of range: the select rendered blank and logged a warning on every mount.
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="صفوف لكل صفحة"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
          onRowsPerPageChange={(e) =>
            setMeta((m) => ({ ...m, pageSize: parseInt(e.target.value, 10), page: 1 }))
          }
          sx={{ color: 'text.secondary', borderTop: '1px solid', borderColor: 'divider' }}
        />
      </TableContainer>
      <Dialog
        open={createOpen}
        onClose={closeCreate}
        aria-labelledby="create-user-title"
        slotProps={{ paper: { sx: { minWidth: { sm: 440 } } } }}
      >
        <DialogTitle id="create-user-title" sx={{ fontWeight: 700 }}>
          إضافة مستخدم جديد
        </DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              label="الاسم الكامل"
              fullWidth
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              required
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              fullWidth
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
            />
            <TextField
              select
              label="الدور"
              fullWidth
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              required
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="كلمة المرور المؤقتة"
              type="password"
              autoComplete="new-password"
              fullWidth
              value={createForm.temporaryPassword}
              onChange={(e) => setCreateForm({ ...createForm, temporaryPassword: e.target.value })}
              required
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeCreate} disabled={submitting} sx={{ color: 'text.secondary' }}>
              إلغاء
            </Button>
            <Button type="submit" variant="contained" loading={submitting}>
              إنشاء
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(editing)}
        onClose={closeEdit}
        aria-labelledby="edit-user-title"
        slotProps={{ paper: { sx: { minWidth: { sm: 440 } } } }}
      >
        <DialogTitle id="edit-user-title" sx={{ fontWeight: 700 }}>
          تعديل بيانات المستخدم
        </DialogTitle>
        <form onSubmit={handleEdit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              label="الاسم الكامل"
              fullWidth
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              required
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              fullWidth
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
            <TextField
              select
              label="الدور"
              fullWidth
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              required
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeEdit} disabled={submitting} sx={{ color: 'text.secondary' }}>
              إلغاء
            </Button>
            <Button type="submit" variant="contained" loading={submitting}>
              حفظ التغييرات
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(resetTarget)}
        onClose={closeReset}
        aria-labelledby="reset-password-title"
        slotProps={{ paper: { sx: { minWidth: { sm: 440 } } } }}
      >
        <DialogTitle id="reset-password-title" sx={{ fontWeight: 700 }}>
          إعادة تعيين كلمة المرور
        </DialogTitle>
        <form onSubmit={handleReset}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {resetError && <Alert severity="error">{resetError}</Alert>}
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              سيتم تعيين كلمة مرور مؤقتة جديدة للمستخدم <strong>{resetTarget?.fullName}</strong>.
            </Typography>
            <TextField
              label="كلمة المرور المؤقتة الجديدة"
              type="password"
              autoComplete="new-password"
              fullWidth
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeReset} disabled={submitting} sx={{ color: 'text.secondary' }}>
              إلغاء
            </Button>
            <Button type="submit" variant="contained" loading={submitting}>
              تأكيد التعيين
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* One shared instance rather than one per dialog. Previously nothing at
          all confirmed a successful create, edit, or password reset. */}
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
