// src/components/ui/ConfirmationToast.tsx

import React from 'react';
import toast from 'react-hot-toast';

interface ConfirmationToastProps {
  t: { id: string }; // The toast object provided by react-hot-toast
  message: string;
  onConfirm: () => void;
}

export const ConfirmationToast: React.FC<ConfirmationToastProps> = ({ t, message, onConfirm }) => (
    <div style={{ background: '#333', color: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>{message}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ background: '#27ae60', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => { onConfirm(); toast.dismiss(t.id); }}>Confirm</button>
            <button style={{ background: '#7f8c8d', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>Cancel</button>
        </div>
    </div>
);