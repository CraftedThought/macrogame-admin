// src/components/conversions/EmailCapture.tsx

import React from 'react';
import { EmailCaptureMethod } from '../../types';
import { styles } from '../../App.styles';
import { notifications } from '../../utils/notifications';

interface EmailCaptureProps {
  method: EmailCaptureMethod;
  onSuccess: () => void;
}

export const EmailCapture: React.FC<EmailCaptureProps> = ({ method, onSuccess }) => {
  const containerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '1rem',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem auto'
  };

  const formStyle: React.CSSProperties = {
    width: '100%'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd have validation and an API call here.
    // For now, we'll just simulate success.
    notifications.success('Submission captured');
    onSuccess();
  }

  return (
    <div style={containerStyle}>
      <h4 style={{ margin: 0, fontSize: '2.5vmin' }}>{method.headline}</h4>
      <p style={{ margin: '0.5rem 0 1rem' }}>{method.subheadline}</p>
      <form style={formStyle} onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder="Enter your email..."
          style={{ ...styles.input, width: '100%', color: '#333' }}
        />
        <button type="submit" style={{ ...styles.saveButton, width: '100%', marginTop: '0.5rem' }}>
          {method.submitButtonText}
        </button>
      </form>
    </div>
  );
};