import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title = 'Подтверждение',
  message = 'Вы уверены, что хотите выполнить это действие?',
  confirmText = 'Да',
  cancelText = 'Отмена',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" mt={1}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{cancelText}</Button>
        <Button color="error" variant="contained" onClick={handleConfirm}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
