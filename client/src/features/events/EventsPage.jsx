import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
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
import EditIcon from '@mui/icons-material/EditRounded';
import SearchIcon from '@mui/icons-material/SearchRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import { motion } from 'framer-motion';
import { eventApi } from '../../api';
import { getErrorMessage } from '../../api/errorMessage';
import { ROLE_LABELS } from '../../constants/roles';
import { useAuth } from '../auth/useAuth';
import {
  EVENT_CATEGORY_LABELS,
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_OPTIONS,
} from './eventConstants';
import { formatDateOnly, formatMoney } from './eventFormatters';

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

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestSeq = useRef(0);

  const { page, pageSize } = meta;
  const canCreate = ['ADMIN', 'LEADER'].includes(user.role);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setMeta((m) => (m.page === 1 ? m : { ...m, page: 1 }));
  }, [debouncedSearch, status, fromDate, toDate]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const res = await eventApi.list({
        search: debouncedSearch,
        status,
        fromDate,
        toDate,
        page,
        pageSize,
      });
      if (seq !== requestSeq.current) return;
      setRows(res.data.data);
      setMeta((m) => ({
        ...m,
        total: res.data.meta.total,
        totalPages: res.data.meta.totalPages,
      }));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(getErrorMessage(err, 'فشل تحميل قائمة الفعاليات.'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, status, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = Boolean(debouncedSearch || status || fromDate || toDate);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setFromDate('');
    setToDate('');
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
            إدارة الفعاليات
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            إنشاء الفعاليات ومتابعة أهداف الرعاية والفريق المسؤول.
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/app/events/new"
            sx={{ px: 2.5, py: 1, flexShrink: 0 }}
          >
            فعالية جديدة
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
              placeholder="اسم الفعالية أو التصنيف أو الموقع"
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
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <TextField
              select
              fullWidth
              label="الحالة"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="small"
            >
              <MenuItem value="">الكل</MenuItem>
              {EVENT_STATUS_OPTIONS.map((value) => (
                <MenuItem key={value} value={value}>
                  {EVENT_STATUS_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <TextField
              fullWidth
              label="من تاريخ"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 3 }}>
            <TextField
              fullWidth
              label="إلى تاريخ"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 860 }}>
          <TableHead>
            <TableRow>
              <TableCell>الفعالية</TableCell>
              <TableCell>التصنيف</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>القائد</TableCell>
              <TableCell>هدف الرعاية</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={`event-skeleton-${i}`}>
                  {Array.from({ length: 7 }, (_, c) => (
                    <TableCell key={c}>
                      <Skeleton variant="text" width={c === 0 ? '80%' : '55%'} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 6, borderBottom: 0 }}>
                  <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {hasFilters ? 'لا توجد فعاليات مطابقة' : 'لا توجد فعاليات بعد'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
                      {hasFilters
                        ? 'جرّب تعديل البحث أو عوامل التصفية.'
                        : 'ابدأ بإنشاء فعالية وتحديد هدف الرعاية والفريق.'}
                    </Typography>
                    {hasFilters ? (
                      <Button onClick={clearFilters}>إزالة عوامل التصفية</Button>
                    ) : (
                      canCreate && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          component={RouterLink}
                          to="/app/events/new"
                        >
                          فعالية جديدة
                        </Button>
                      )
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const canEdit = user.role === 'ADMIN' || row.leader?.id === user.id;
                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background-color 150ms',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                    <TableCell>{EVENT_CATEGORY_LABELS[row.category] ?? row.category}</TableCell>
                    <TableCell>{formatDateOnly(row.eventDate)}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.leader?.fullName ?? 'غير محدد'}
                        </Typography>
                        {row.leader?.role && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {ROLE_LABELS[row.leader.role]}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{formatMoney(row.financialTarget)}</TableCell>
                    <TableCell>
                      <EventStatusChip status={row.status} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          onClick={() => navigate(`/app/events/${row.id}`)}
                          sx={{ color: 'text.secondary' }}
                          aria-label={`عرض تفاصيل ${row.name}`}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        {canEdit && (
                          <IconButton
                            onClick={() => navigate(`/app/events/${row.id}/edit`)}
                            sx={{ color: 'text.secondary' }}
                            aria-label={`تعديل ${row.name}`}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={meta.total}
          page={meta.page - 1}
          onPageChange={(_, p) => setMeta((m) => ({ ...m, page: p + 1 }))}
          rowsPerPage={meta.pageSize}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="صفوف لكل صفحة"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
          onRowsPerPageChange={(e) =>
            setMeta((m) => ({ ...m, pageSize: parseInt(e.target.value, 10), page: 1 }))
          }
          sx={{ color: 'text.secondary', borderTop: '1px solid', borderColor: 'divider' }}
        />
      </TableContainer>
    </Box>
  );
}
