import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { MotionConfig } from 'framer-motion';
import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';

// Emotion must flip MUI's own physical CSS (margin-left, transform-origin, ...).
// `direction: 'rtl'` on the theme alone does not do this; without the plugin every
// RTL fix has to be hand-written per component. Supplying stylisPlugins replaces
// Emotion's defaults, so `prefixer` has to be re-added explicitly.
const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const FONT_STACK =
  '"IBM Plex Sans Arabic", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Zinc neutrals, retained. The brand is carried by a single accent, not by the ramp.
const zinc = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  950: '#09090b',
};

// Deep oxblood. Used in three places only — primary actions, current selection,
// focus rings — at roughly 10% of surface. `light` exists for a future dark theme,
// where #9f1e42 is too dark to sit on a dark surface.
const accent = {
  light: '#d4547a',
  main: '#9f1e42',
  dark: '#7d1734',
  contrastText: '#ffffff',
};

export const FOCUS_RING = `0 0 0 3px rgba(159, 30, 66, 0.35)`;

const theme = createTheme({
  direction: 'rtl',
  // One radius for containers and controls. Documented exception: Chip stays a pill,
  // because a pill is the standard status affordance and reads as a different element.
  shape: { borderRadius: 10 },
  palette: {
    mode: 'light',
    background: { default: zinc[50], paper: '#ffffff' },
    primary: accent,
    // Status colors, all AA against both #ffffff and their own tinted surfaces.
    success: { main: '#047857', contrastText: '#ffffff' },
    error: { main: '#b91c1c', contrastText: '#ffffff' },
    warning: { main: '#b45309', contrastText: '#ffffff' },
    text: {
      primary: zinc[950],
      secondary: zinc[500],
      disabled: zinc[400],
    },
    // `selected` is deliberately left at MUI's neutral default. An accent-tinted
    // value here leaks: MUI uses action.selected as the default Chip fill, which
    // turned every neutral chip pale pink. Nothing needs an accent-tinted
    // selection surface yet — add one explicitly if something ever does.
    action: { hover: zinc[100] },
    divider: zinc[200],
  },
  typography: {
    fontFamily: FONT_STACK,
    // The loaded font stops at 700. Anything heavier is browser-synthesized fake
    // bold, which damages Arabic more visibly than Latin.
    fontWeightBold: 700,
    // Arabic is a connected script — negative tracking breaks the letter joins.
    h4: { letterSpacing: 'normal' },
    h5: { letterSpacing: 'normal' },
    h6: { letterSpacing: 'normal' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: zinc[50],
          color: zinc[950],
          fontFamily: FONT_STACK,
        },
        // The app had no reduced-motion handling at all. This neutralises CSS
        // animation and transition globally; framer-motion is handled separately
        // by <MotionConfig reducedMotion="user"> below, since it animates in JS.
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        // Defined once here instead of the identical 10-line sx block plus a
        // duplicate @keyframes that appeared on three separate auth pages.
        root: {
          fontFamily: FONT_STACK,
          '@keyframes alertSlideIn': {
            '0%': { opacity: 0, transform: 'translateY(-4px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
          },
          animation: 'alertSlideIn 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          transition: 'border-color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '& fieldset': {
            borderColor: zinc[200],
            transition: 'border-color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          },
          '&:hover fieldset': { borderColor: zinc[400] },
          '&.Mui-focused fieldset': { borderColor: accent.main, borderWidth: '1.5px' },
          // Suppress the browser's yellow autofill background.
          '& input:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
            WebkitTextFillColor: zinc[950],
            caretColor: zinc[950],
            borderRadius: 'inherit',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          transition:
            'transform 150ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:active': { transform: 'scale(0.985)' },
          '&.Mui-focusVisible': { boxShadow: FOCUS_RING },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': { boxShadow: FOCUS_RING },
        },
      },
    },
    // Every surface in this app is a bordered, shadowless panel. `variant="outlined"`
    // is the built-in expression of that, so pages stop restating the border by hand.
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: zinc[200] },
        head: { color: zinc[500], fontWeight: 600, backgroundColor: zinc[50] },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.72rem' },
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* framer-motion animates in JS, so the CSS media query above cannot
            reach it. "user" makes every motion component honour the OS setting. */}
        <MotionConfig reducedMotion="user">
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </MotionConfig>
      </ThemeProvider>
    </CacheProvider>
  </StrictMode>,
);
