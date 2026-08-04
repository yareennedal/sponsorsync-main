import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
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
import Grid from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/AddRounded';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import SearchIcon from '@mui/icons-material/SearchRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import { motion } from 'framer-motion';
import { companyApi } from '../../api';
import { getErrorMessage } from '../../api/errorMessage';
import { useAuth } from '../auth/useAuth';
import { COMPANY_SECTOR_LABELS, COMPANY_SECTOR_OPTIONS } from './companyConstants';

export default function CompaniesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [city, setCity] = useState('');
  const [archived, setArchived] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestSeq = useRef(0);

  const canCreate = ['ADMIN', 'LEADER'].includes(user.role);
  const canViewArchived = user.role === 'ADMIN';
  const { page, pageSize } = meta;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setMeta((current) => (current.page === 1 ? current : { ...current, page: 1 }));
  }, [debouncedSearch, sector, city, archived]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const res = await companyApi.list({
        search: debouncedSearch,
        sector,
        city,
        archived,
        page,
        pageSize,
      });
      if (seq !== requestSeq.current) return;
      setRows(res.data.data);
      setMeta((current) => ({
        ...current,
        total: res.data.meta.total,
        totalPages: res.data.meta.totalPages,
      }));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(getErrorMessage(err, 'فشل تحميل قائمة الشركات.'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [archived, city, debouncedSearch, page, pageSize, sector]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = Boolean(debouncedSearch || sector || city || archived);

  const clearFilters = () => {
    setSearch('');
    setSector('');
    setCity('');
    setArchived(false);
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
            إدارة الشركات
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            دليل الشركات وجهات التواصل القابلة لإعادة الاستخدام في أعمال الرعاية لاحقاً.
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/app/companies/new"
            sx={{ px: 2.5, py: 1, flexShrink: 0 }}
          >
            شركة جديدة
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} role="alert">
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="بحث"
              placeholder="اسم الشركة أو الموقع أو البريد أو الهاتف"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <TextField
              select
              fullWidth
              label="القطاع"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              size="small"
            >
              <MenuItem value="">الكل</MenuItem>
              {COMPANY_SECTOR_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <TextField
              fullWidth
              label="المدينة"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              size="small"
            />
          </Grid>
          {canViewArchived && (
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                select
                fullWidth
                label="الأرشيف"
                value={archived ? 'archived' : 'active'}
                onChange={(event) => setArchived(event.target.value === 'archived')}
                size="small"
              >
                <MenuItem value="active">النشطة</MenuItem>
                <MenuItem value="archived">المؤرشفة</MenuItem>
              </TextField>
            </Grid>
          )}
        </Grid>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 880 }}>
          <TableHead>
            <TableRow>
              <TableCell>الشركة</TableCell>
              <TableCell>القطاع</TableCell>
              <TableCell>المدينة</TableCell>
              <TableCell>الموقع</TableCell>
              <TableCell>جهة التواصل الأساسية</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={`company-skeleton-${index}`}>
                  {Array.from({ length: 7 }, (_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton variant="text" width={cell === 0 ? '80%' : '55%'} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 6, borderBottom: 0 }}>
                  <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center' }}>
                    <BusinessIcon sx={{ color: 'text.disabled' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {hasFilters ? 'لا توجد شركات مطابقة' : 'لا توجد شركات بعد'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
                      {hasFilters
                        ? 'جرّب تعديل البحث أو عوامل التصفية.'
                        : 'ابدأ بإضافة شركة وجهة تواصل ليصبح الدليل جاهزاً للرعاية.'}
                    </Typography>
                    {hasFilters ? (
                      <Button onClick={clearFilters}>إزالة عوامل التصفية</Button>
                    ) : (
                      canCreate && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          component={RouterLink}
                          to="/app/companies/new"
                        >
                          شركة جديدة
                        </Button>
                      )
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
                  <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                  <TableCell>{COMPANY_SECTOR_LABELS[row.sector] ?? row.sector}</TableCell>
                  <TableCell>{row.city || 'لا يوجد'}</TableCell>
                  <TableCell dir="ltr">{row.websiteDomain || row.website || 'لا يوجد'}</TableCell>
                  <TableCell>
                    {row.primaryContact ? (
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.primaryContact.fullName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }} dir="ltr">
                          {row.primaryContact.email || row.primaryContact.phone}
                        </Typography>
                      </Stack>
                    ) : (
                      'لا يوجد'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.archivedAt ? 'مؤرشفة' : 'نشطة'}
                      color={row.archivedAt ? undefined : 'success'}
                      variant={row.archivedAt ? 'outlined' : 'filled'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => navigate(`/app/companies/${row.id}`)}
                    >
                      عرض
                    </Button>
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
          onPageChange={(_, nextPage) => setMeta((current) => ({ ...current, page: nextPage + 1 }))}
          rowsPerPage={meta.pageSize}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="صفوف لكل صفحة"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
          onRowsPerPageChange={(event) =>
            setMeta((current) => ({
              ...current,
              pageSize: parseInt(event.target.value, 10),
              page: 1,
            }))
          }
          sx={{ color: 'text.secondary', borderTop: '1px solid', borderColor: 'divider' }}
        />
      </TableContainer>
    </Box>
  );
}
