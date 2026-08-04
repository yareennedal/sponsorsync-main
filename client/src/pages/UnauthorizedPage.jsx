import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
      }}
    >
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          bgcolor: 'background.paper',
          border: '1px solid',
          p: 1,
        }}
      >
        <CardContent sx={{ p: 3.5, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: (t) => alpha(t.palette.error.main, 0.08),
                border: '1px solid',
                borderColor: (t) => alpha(t.palette.error.main, 0.3),
                color: 'error.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockOutlined sx={{ fontSize: 26 }} />
            </Box>

            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              غير مصرح بالوصول
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.9rem',
                maxWidth: 360,
              }}
            >
              {user
                ? `حسابك الحالي (${user.role}) لا يملك الصلاحية للوصول إلى هذه الصفحة.`
                : 'يرجى تسجيل الدخول للوصول إلى هذا المحتوى.'}
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ mt: 2, width: '100%' }}>
              {user ? (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/app', { replace: true })}
                  sx={{
                    py: 1.35,
                    bgcolor: 'primary.main',
                    color: 'background.paper',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  العودة إلى التطبيق
                </Button>
              ) : (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/login', { replace: true })}
                  sx={{
                    py: 1.35,
                    bgcolor: 'primary.main',
                    color: 'background.paper',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  الانتقال إلى تسجيل الدخول
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
