import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../features/auth/useAuth';
import { getErrorMessage } from '../api/errorMessage';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login({ email, password, rememberMe });
      const next = location.state?.from?.pathname;
      if (user.mustChangePassword) navigate('/change-password', { replace: true });
      else navigate(next || '/app', { replace: true });
    } catch (err) {
      const msg = getErrorMessage(
        err,
        'تعذر تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مجدداً.',
      );
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
          maxWidth: 420,
          width: '100%',
          // Was a glass card: rgba white + backdrop-filter: blur(20px) + a custom
          // drop shadow + a 28px radius. The blur sat over a flat background so it
          // rendered nothing, and the radius broke the app's single-radius rule.
          // Now the same bordered, shadowless panel as every other surface.
          p: 1,
          animation: error
            ? 'appleShake 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both'
            : 'appleCardEnter 450ms cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <CardContent sx={{ p: 3.5 }}>
          <Stack spacing={1.5} alignItems="center" sx={{ mb: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                bgcolor: 'primary.main',
                color: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.3rem',
                transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  transform: 'scale(1.04)',
                },
              }}
            >
              س
            </Box>
            <Box>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  fontSize: '1.45rem',
                  letterSpacing: '-0.01em',
                  mb: 0.5,
                }}
              >
                سبونسر سينك — SponsorSync
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.9rem',
                }}
              >
                تسجيل الدخول إلى منصة إدارة الرعايات والمؤتمرات
              </Typography>
            </Box>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} role="alert">
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                fullWidth
                size="medium"
              />
              <TextField
                label="كلمة المرور"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                fullWidth
                size="medium"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="عرض كلمة المرور"
                          onClick={() => setShowPassword((show) => !show)}
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
                          {showPassword ? (
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
              {/* "Forgot password?" used to sit opposite this, which is why the row was a
                  space-between flex container. That flow is gone: a locked-out user asks an
                  admin, who issues a temporary password. One child left, so no wrapper. */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    size="small"
                    sx={{
                      color: 'text.disabled',
                      '&.Mui-checked': { color: 'primary.main' },
                      p: 0.5,
                      marginInlineEnd: 0.5,
                    }}
                  />
                }
                label="تذكرني على هذا الجهاز"
                sx={{
                  m: 0,
                  pt: 0.5,
                  alignSelf: 'flex-start',
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.85rem',
                    color: 'text.secondary',
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
                {loading ? <CircularProgress size={22} color="inherit" /> : 'تسجيل الدخول'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
