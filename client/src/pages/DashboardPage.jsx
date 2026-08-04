import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
// MUI v6: the default Grid export is still the legacy API (item + xs/sm/md). Grid2 is the
// one that takes size={{...}}. Importing plain Grid with size props silently drops every
// width, which collapses the layout.
import Grid from '@mui/material/Grid2';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../features/auth/useAuth';
import { userApi } from '../api';
import { ROLE_LABELS } from '../constants/roles';
import { formatDateTime } from '../utils/formatDateTime';

// One card shape instead of four 40-line copies. The theme already gives Card
// variant="outlined" a divider border; the old sx set border: '1px solid' with no color,
// which resolves to currentColor (near-black) and made the landing page look like a
// different design system from every other surface.
function StatCard({ label, value, hint, icon, valueColor = 'text.primary' }) {
  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {label}
          </Typography>
          <Box
            sx={{ p: 0.75, backgroundColor: 'action.hover', color: valueColor, display: 'flex' }}
          >
            {icon}
          </Box>
        </Stack>
        <Typography
          variant={typeof value === 'number' ? 'h3' : 'h5'}
          sx={{ fontWeight: 700, color: valueColor, py: typeof value === 'number' ? 0 : 0.5 }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === 'ADMIN';
  // null until real data arrives. The old seed of { total: 1, active: 1 } was rendered to
  // every non-admin as a system-wide figure, so a MEMBER in a 40-user system read "1".
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    userApi
      .list({ page: 1, pageSize: 1 })
      .then((res) => {
        if (cancelled) return;
        const total = res.data.meta?.total ?? 0;
        setStats({ total });
      })
      .catch(() => {
        // A swallowed error used to leave the fabricated numbers on screen.
        if (!cancelled) setStatsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const totalValue = statsError ? '—' : (stats?.total ?? <Skeleton width={64} />);

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            أهلاً بك، {user.fullName}
          </Typography>
          <Chip
            label={ROLE_LABELS[user.role]}
            size="small"
            sx={{
              backgroundColor: 'text.primary',
              color: 'background.paper',
              fontWeight: 700,
              fontSize: '0.72rem',
            }}
          />
        </Stack>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          مرحباً بك في لوحة تحكم SponsorSync — النظام الأساسي وحماية الحسابات أصبحت جاهزة وفعالة.
        </Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Admin-only: the endpoint behind it is ADMIN-gated server-side, so for anyone
            else this card could only ever show a fabricated number. */}
        {isAdmin && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="إجمالي المستخدمين"
              value={totalValue}
              hint={statsError ? 'تعذّر تحميل الإحصائيات' : 'الحسابات المسجلة في النظام'}
              icon={<PeopleIcon fontSize="small" />}
            />
          </Grid>
        )}

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="صلاحية الحساب الحالي"
            value={ROLE_LABELS[user.role]}
            hint={isAdmin ? 'صلاحيات إدارة كاملة' : 'صلاحيات مستخدم'}
            icon={<ShieldIcon fontSize="small" />}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="حالة الحساب"
            value={user.isActive === false ? 'معطل' : 'نشط'}
            hint={user.mustChangePassword ? 'مطلوب تغيير كلمة المرور' : 'الحساب مفعل'}
            icon={<CheckCircleIcon fontSize="small" />}
            valueColor={user.isActive === false ? 'text.secondary' : 'success.main'}
          />
        </Grid>

        {/* Replaces the old "حماية الجلسة v{tokenVersion}" card, which always read v0:
            safeUser deliberately never returns tokenVersion. This is real data. */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="آخر تسجيل دخول"
            value={formatDateTime(user.lastLoginAt, 'أول جلسة')}
            hint="جلسة محمية بكوكي HttpOnly"
            icon={<LockIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      {/* Quick Action Navigation Bar */}
      {user.role === 'ADMIN' && (
        <Card sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                إدارة أفراد الفريق والتراخيص
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                يمكنك إضافة مستخدمين جدد، تغيير أدوارهم، وتعيين كلمات مرور مؤقتة.
              </Typography>
            </Box>
            <Button
              variant="contained"
              endIcon={<ArrowBackIcon />}
              onClick={() => navigate('/app/users')}
              sx={{
                backgroundColor: 'text.primary', // Sleek black button
                color: 'background.paper',
                fontWeight: 600,
                px: 3,
                py: 1,
                textTransform: 'none',
                '&:hover': { backgroundColor: 'primary.dark' },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              الانتقال لجدول المستخدمين
            </Button>
          </Stack>
        </Card>
      )}
    </Box>
  );
}
