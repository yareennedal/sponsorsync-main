import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/MenuRounded';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import EventIcon from '@mui/icons-material/EventOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftRounded';
import { useAuth } from '../features/auth/useAuth';
import { ROLE_LABELS } from '../constants/roles';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 64;
const HEADER_HEIGHT = 56;

const NAV_GROUPS = [
  {
    header: 'الرئيسية',
    items: [
      // `end` so /app does not stay active while on /app/users.
      { label: 'لوحة التحكم', path: '/app', end: true, icon: <DashboardIcon fontSize="small" /> },
      { label: 'الملف الشخصي', path: '/app/profile', icon: <PersonIcon fontSize="small" /> },
    ],
  },
  {
    header: 'الفعاليات',
    items: [
      { label: 'إدارة الفعاليات', path: '/app/events', icon: <EventIcon fontSize="small" /> },
    ],
  },
  {
    header: 'الشركات',
    items: [
      { label: 'إدارة الشركات', path: '/app/companies', icon: <BusinessIcon fontSize="small" /> },
    ],
  },
  {
    header: 'الإدارة والتراخيص',
    roles: ['ADMIN'],
    items: [
      { label: 'إدارة المستخدمين', path: '/app/users', icon: <PeopleIcon fontSize="small" /> },
    ],
  },
];

const BREADCRUMBS = {
  '/app': 'لوحة التحكم',
  '/app/users': 'إدارة المستخدمين',
  '/app/profile': 'الملف الشخصي',
  '/app/events': 'إدارة الفعاليات',
  '/app/events/new': 'فعالية جديدة',
  '/app/companies': 'إدارة الشركات',
  '/app/companies/new': 'شركة جديدة',
};

function breadcrumbFor(pathname) {
  if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname];
  if (pathname.endsWith('/edit') && pathname.startsWith('/app/events/')) return 'تعديل الفعالية';
  if (pathname.endsWith('/packages') && pathname.startsWith('/app/events/')) return 'حزم الرعاية';
  if (pathname.startsWith('/app/events/')) return 'تفاصيل الفعالية';
  if (pathname.endsWith('/edit') && pathname.startsWith('/app/companies/')) return 'تعديل الشركة';
  if (pathname.startsWith('/app/companies/')) return 'تفاصيل الشركة';
  return 'الرئيسية';
}

// Defined at module level, not inside AppShell — a component declared during render
// is remounted on every parent render, discarding its subtree state.
function SidebarNav({ role, collapsed, onNavigate }) {
  return (
    <Box
      component="nav"
      aria-label="التنقل الرئيسي"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        // Logical, not physical. stylis-plugin-rtl rewrites `borderLeft` to
        // `borderRight`; `borderInlineEnd` is already direction-aware, so it is
        // immune to the flip and means what it says: the edge facing the content.
        borderInlineEnd: '1px solid',
        borderColor: 'divider',
        overflowX: 'hidden',
      }}
    >
      <Box sx={{ flex: 1, py: 2, px: 1.5, overflowY: 'auto' }}>
        {NAV_GROUPS.map((group) => {
          if (group.roles && !group.roles.includes(role)) return null;
          const items = group.items.filter((i) => !i.roles || i.roles.includes(role));
          if (items.length === 0) return null;

          return (
            <Box key={group.header} sx={{ mb: 2.5 }}>
              {collapsed ? null : (
                <Typography
                  variant="caption"
                  component="h2"
                  sx={{
                    px: 1.5,
                    pb: 1,
                    display: 'block',
                    color: 'text.secondary',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }}
                >
                  {group.header}
                </Typography>
              )}

              <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {items.map((item) => {
                  // NavLink renders an <a>, applies `.active`, and sets aria-current="page"
                  // itself — so the active state needs no location comparison and no state.
                  const button = (
                    <ListItemButton
                      component={NavLink}
                      to={item.path}
                      end={item.end}
                      onClick={onNavigate}
                      sx={{
                        borderRadius: 1,
                        minHeight: 44,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: 1.5,
                        px: collapsed ? 1 : 1.75,
                        py: 1.25,
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.hover' },
                        '&.active': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': { bgcolor: 'primary.dark' },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center' }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {collapsed ? null : (
                        <ListItemText
                          primary={item.label}
                          slotProps={{
                            primary: { fontSize: '0.88rem', fontWeight: 500, noWrap: true },
                          }}
                        />
                      )}
                    </ListItemButton>
                  );

                  return (
                    <ListItem key={item.path} disablePadding>
                      {collapsed ? (
                        <Tooltip title={item.label} placement="left" arrow>
                          {button}
                        </Tooltip>
                      ) : (
                        button
                      )}
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;
  const breadcrumb = breadcrumbFor(location.pathname);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          insetInline: 0,
          height: HEADER_HEIGHT,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1, sm: 2 },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' } }}
            aria-label="فتح قائمة التنقل"
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          <IconButton
            onClick={() => setCollapsed((c) => !c)}
            sx={{ color: 'text.secondary', display: { xs: 'none', md: 'inline-flex' } }}
            aria-label={collapsed ? 'توسيع قائمة التنقل' : 'طي قائمة التنقل'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronLeftIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </IconButton>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.92rem' }} noWrap>
            SponsorSync
          </Typography>

          {/* Hidden on narrow screens — the page heading already says where you are. */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ display: { xs: 'none', sm: 'flex' }, minWidth: 0 }}
          >
            <Typography variant="body2" sx={{ color: 'text.disabled' }} aria-hidden="true">
              /
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: '0.85rem' }}
              noWrap
            >
              {breadcrumb}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
          {/* Same variant as the role chip in the users table — one component
              vocabulary, per the Color/Shape Consistency Lock. */}
          <Chip
            label={ROLE_LABELS[user.role]}
            size="small"
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, height: 22, fontSize: '0.7rem' }}
          />

          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ p: 0.5 }}
            aria-label="قائمة الحساب"
            aria-haspopup="menu"
            aria-expanded={Boolean(anchorEl)}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.8rem',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 700,
              }}
            >
              {user.fullName?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{ paper: { variant: 'outlined', sx: { minWidth: 200, mt: 1 } } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                {user.fullName}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: 'text.secondary', display: 'block' }}
              >
                {user.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/app/profile');
              }}
            >
              <ListItemIcon sx={{ color: 'text.secondary' }}>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="الملف الشخصي" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/change-password');
              }}
            >
              <ListItemIcon sx={{ color: 'text.secondary' }}>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="تغيير كلمة المرور" />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="تسجيل الخروج" />
            </MenuItem>
          </Menu>
        </Stack>
      </Box>

      {/* Desktop: permanent rail pinned to the right (RTL inline-start). */}
      <Box
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          display: { xs: 'none', md: 'block' },
          transition: 'width 150ms ease-out',
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: HEADER_HEIGHT,
            // Inline-start = the right edge in RTL. Written physically as `right: 0`
            // this gets flipped to the left by stylis-plugin-rtl.
            insetInlineStart: 0,
            bottom: 0,
            width: drawerWidth,
            transition: 'width 150ms ease-out',
          }}
        >
          <SidebarNav role={user.role} collapsed={collapsed} />
        </Box>
      </Box>

      {/* Mobile: MUI Drawer supplies the focus trap, Escape handling, focus restore,
          scroll lock, and aria-modal that the previous hand-rolled version lacked. */}
      <Drawer
        // Renders on the right edge, but NOT because MUI flips the anchor — it does not.
        // MUI emits a physical `left: 0` for anchor="left", and stylis-plugin-rtl rewrites
        // that to `right: 0` in the Emotion cache. Do not "correct" this to "right": the
        // plugin would flip it to the left edge. (Two commits in this repo's history were
        // spent fighting exactly that.)
        anchor="left"
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH_EXPANDED, boxSizing: 'border-box' },
        }}
      >
        {/* The header sits at zIndex drawer+1 and is opaque, so without this offset the
            top HEADER_HEIGHT of the nav renders behind it and taps there hit the header
            instead of the first link. */}
        <Box sx={{ pt: `${HEADER_HEIGHT}px`, height: '100%' }}>
          <SidebarNav role={user.role} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: `${HEADER_HEIGHT + 24}px`,
          pb: 4,
          px: { xs: 2, sm: 3, md: 4 },
          minHeight: '100vh',
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          transition: 'width 150ms ease-out',
        }}
      >
        <Container maxWidth="xl" disableGutters>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
