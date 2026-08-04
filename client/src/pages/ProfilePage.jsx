import { Fragment, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockResetOutlined';
import EditIcon from '@mui/icons-material/EditRounded';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../features/auth/useAuth';
import { ROLE_LABELS } from '../constants/roles';
import StatusChip from '../components/StatusChip';
import { formatDateTime } from '../utils/formatDateTime';
import EditNameDialog from './EditNameDialog';

// Email is read-only here: it is the login identity, and only an admin can change it
// (PATCH /api/users/:id). The self-service OTP flow that used to sit behind a "تغيير"
// button was removed — see docs/roles-and-access.md.
const DETAILS = [
  { label: 'البريد الإلكتروني', get: (u) => u.email, ltr: true },
  { label: 'آخر تسجيل دخول', get: (u) => formatDateTime(u.lastLoginAt) },
  { label: 'تاريخ الإنشاء', get: (u) => formatDateTime(u.createdAt) },
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [toast, setToast] = useState('');

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      sx={{ maxWidth: 640 }}
    >
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
        الملف الشخصي
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        تفاصيل حسابك الشخصي والصلاحيات المسندة إليك في SponsorSync.
      </Typography>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2.5} sx={{ mb: 3 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                fontSize: '1.5rem',
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              {user.fullName?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                  {user.fullName}
                </Typography>
                <Tooltip title="تعديل الاسم">
                  <IconButton
                    size="small"
                    onClick={() => setEditingName(true)}
                    aria-label="تعديل الاسم"
                    sx={{ color: 'text.secondary' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                useFlexGap
                sx={{ mt: 0.5, flexWrap: 'wrap' }}
              >
                {/* Role is an attribute, not an action — it stays neutral so the
                    accent keeps meaning "primary action / current selection". */}
                <Chip label={ROLE_LABELS[user.role]} size="small" />
                <StatusChip isActive={user.isActive} />
              </Stack>
            </Box>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          {/* A description list is what this is. The previous version used a fixed
              `width: 120` label column with no wrap, so a long email overflowed on
              mobile; the grid collapses to a single column below `sm` instead. */}
          <Box
            component="dl"
            sx={{
              m: 0,
              mb: 3,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(120px, auto) 1fr' },
              columnGap: 2,
              rowGap: { xs: 0.5, sm: 1.5 },
            }}
          >
            {DETAILS.map(({ label, get, ltr }) => (
              <Fragment key={label}>
                <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
                  {label}
                </Typography>
                <Box
                  component="dd"
                  sx={{
                    m: 0,
                    mb: { xs: 1.5, sm: 0 },
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 1,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    variant="body2"
                    // Email is Latin text inside an RTL paragraph: without an
                    // explicit direction the bidi algorithm reorders its punctuation.
                    dir={ltr ? 'ltr' : undefined}
                    sx={{
                      fontWeight: 600,
                      overflowWrap: 'anywhere',
                      minWidth: 0,
                      // Logical `end`, not `right`. On a dir="ltr" element `end` is
                      // the right edge, so the value lines up with its RTL siblings
                      // — and stylis-plugin-rtl would flip a literal `right` to
                      // `left`, which is what knocked it out of alignment before.
                      textAlign: ltr ? 'end' : undefined,
                    }}
                  >
                    {get(user)}
                  </Typography>
                </Box>
              </Fragment>
            ))}
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Button
            variant="contained"
            startIcon={<LockResetIcon />}
            onClick={() => navigate('/change-password')}
            sx={{ px: 3, py: 1 }}
          >
            تغيير كلمة المرور
          </Button>
        </CardContent>
      </Card>

      <EditNameDialog
        open={editingName}
        currentName={user.fullName}
        onClose={() => setEditingName(false)}
        onSaved={async () => {
          await refreshUser();
          setToast('تم تحديث الاسم.');
        }}
      />

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
