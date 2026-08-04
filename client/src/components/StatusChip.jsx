import Chip from '@mui/material/Chip';

/**
 * Account status.
 *
 * Filled-vs-outlined carries the distinction, not hue — WCAG 1.4.1. The previous
 * version was two identically-shaped grey pills separated only by green/red, which
 * a colorblind admin could not tell apart.
 *
 * A disabled account is a neutral state, not an error, so it is zinc rather than
 * red. That also keeps error red reserved for actual failures, where it would
 * otherwise sit next to the oxblood accent and be confusable with it.
 */
export default function StatusChip({ isActive }) {
  return isActive ? (
    <Chip label="نشط" size="small" color="success" variant="filled" />
  ) : (
    <Chip label="معطل" size="small" variant="outlined" sx={{ color: 'text.secondary' }} />
  );
}
