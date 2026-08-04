import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { authApi } from '../api';
import { getErrorMessage } from '../api/errorMessage';
import { useAuth } from '../features/auth/useAuth';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.changePassword(form);
      // The server bumped tokenVersion and cleared the cookie, so the session is already
      // dead. Without clearing client state the Back button re-renders the authenticated
      // shell from stale context until the next request happens to 401.
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.error?.details?.[0]?.message ||
        getErrorMessage(err, 'تعذر تغيير كلمة المرور. يرجى المحاولة مجدداً.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(at 50% 0%, rgba(244, 244, 245, 0.8) 0px, transparent 75%)',
        px: 2,
        py: 6,
        '@keyframes appleCardEnter': {
          '0%': { opacity: 0, transform: 'translateY(16px) scale(0.985)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        '@keyframes appleShake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
      }}
    >
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          p: 1,
          animation: error
            ? 'appleShake 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both'
            : 'appleCardEnter 450ms cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <CardContent sx={{ p: 3.5 }}>
          <Stack spacing={1} sx={{ mb: 3.5, textAlign: 'center' }}>
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              تحديث كلمة المرور
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.875rem',
              }}
            >
              يجب أن لا تقل كلمة المرور عن 10 خانات وأن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} role="alert">
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="كلمة المرور الحالية"
                type={showCurrent ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={set('currentPassword')}
                required
                autoComplete="current-password"
                autoFocus
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="عرض كلمة المرور الحالية"
                          onClick={() => setShowCurrent((show) => !show)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          size="small"
                          sx={{
                            color: 'text.secondary',
                            p: 0.5,
                            alignSelf: 'center',
                            transition: 'color 150ms ease-out',
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          {showCurrent ? (
                            <VisibilityOff sx={{ fontSize: '1.25rem' }} />
                          ) : (
                            <Visibility sx={{ fontSize: '1.25rem' }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="كلمة المرور الجديدة"
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={set('newPassword')}
                required
                autoComplete="new-password"
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="عرض كلمة المرور الجديدة"
                          onClick={() => setShowNew((show) => !show)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          size="small"
                          sx={{
                            color: 'text.secondary',
                            p: 0.5,
                            alignSelf: 'center',
                            transition: 'color 150ms ease-out',
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          {showNew ? (
                            <VisibilityOff sx={{ fontSize: '1.25rem' }} />
                          ) : (
                            <Visibility sx={{ fontSize: '1.25rem' }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="تأكيد كلمة المرور الجديدة"
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                required
                autoComplete="new-password"
                fullWidth
                error={!!form.confirmPassword && form.newPassword !== form.confirmPassword}
                helperText={
                  form.confirmPassword && form.newPassword !== form.confirmPassword
                    ? 'كلمتا المرور غير متطابقتين'
                    : ''
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="عرض تأكيد كلمة المرور"
                          onClick={() => setShowConfirm((show) => !show)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          size="small"
                          sx={{
                            color: 'text.secondary',
                            p: 0.5,
                            alignSelf: 'center',
                            transition: 'color 150ms ease-out',
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          {showConfirm ? (
                            <VisibilityOff sx={{ fontSize: '1.25rem' }} />
                          ) : (
                            <Visibility sx={{ fontSize: '1.25rem' }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                size="large"
                sx={{
                  mt: 1,
                  py: 1.35,
                  bgcolor: 'primary.main',
                  color: 'background.paper',
                  fontWeight: 600,
                  fontSize: '0.975rem',
                  boxShadow: 'none',
                  transition:
                    'transform 150ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '&:active': {
                    transform: 'scale(0.985)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'divider',
                    color: 'text.disabled',
                  },
                }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'تحديث كلمة المرور'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
