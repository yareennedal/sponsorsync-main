import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { authApi } from '../api';
import { getErrorMessage } from '../api/errorMessage';

export default function EditNameDialog({ open, currentName, onClose, onSaved }) {
  const [fullName, setFullName] = useState(currentName);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await authApi.updateProfile({ fullName: fullName.trim() });
      await onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'تعذّر تحديث الاسم.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      aria-labelledby="edit-name-title"
      slotProps={{ paper: { sx: { minWidth: { sm: 420 } } } }}
    >
      <DialogTitle id="edit-name-title" sx={{ fontWeight: 700 }}>
        تعديل الاسم
      </DialogTitle>
      <form onSubmit={submit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="الاسم الكامل"
            fullWidth
            autoFocus
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={saving}
            disabled={!fullName.trim() || fullName.trim() === currentName}
          >
            حفظ
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
