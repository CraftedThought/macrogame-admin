/* src/components/conversions/EmailCapture.tsx */

import React from 'react';
import { EmailCaptureMethod } from '../../types';
import { styles } from '../../App.styles';
import { notifications } from '../../utils/notifications';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill Styles

interface EmailCaptureProps {
  method: EmailCaptureMethod;
  onSuccess: () => void;
  isPortrait?: boolean;
}

export const EmailCapture: React.FC<EmailCaptureProps> = ({ method, onSuccess, isPortrait = false }) => {
  
  // Extract custom properties (casting as any since strict types might lag behind)
  const m = method as any;

  // Helper: Ensure value is a number. If string/empty/undefined, fallback to 0.
  const safeVal = (val: any, fallback: number) => {
      const num = Number(val);
      return !isNaN(num) && val !== '' && val !== null && val !== undefined ? num : fallback;
  };

  const contentSpacing = safeVal(method.style?.spacing, 0); // Gap between Content & Field
  const buttonSpacing = safeVal(m.style?.buttonSpacing, 0); // Gap between Field & Button
  
  // Width fallback
  const widthPercent = typeof m.style?.size === 'number' ? m.style.size : 50;
  // Override if Portrait
  const finalWidth = isPortrait ? '100%' : `${widthPercent}%`;
  
  const buttonColor = m.style?.buttonColor ?? '#1532c1'; // Default Blue
  const buttonTextColor = m.style?.buttonTextColor ?? '#ffffff';
  // Update: If explicitly empty string, keep it empty. Only default if undefined/null.
  const placeholderText = (m.emailPlaceholderText === undefined || m.emailPlaceholderText === null) 
      ? 'Enter your email...' 
      : m.emailPlaceholderText;

  const containerStyle: React.CSSProperties = {
    textAlign: 'left', 
    width: finalWidth,
    maxWidth: '100%', 
    margin: '0 auto',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    gap: `${contentSpacing}px`, 
  };

  const formStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: `${buttonSpacing}px`
  };

  /* src/components/conversions/EmailCapture.tsx */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the input value directly from the form event
    const form = e.currentTarget as HTMLFormElement;
    const input = form.querySelector('input[type="email"]') as HTMLInputElement;
    const email = input.value;

    // Update: Strict Email Regex (Requires @ and a dot)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        notifications.error('Please enter a valid email address (e.g. user@domain.com)');
        return;
    }

    notifications.success('Submission captured');
    onSuccess();
  }

  const cssBlock = `
    .email-capture-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.25;
        color: inherit;
    }
    .email-capture-content-wrapper.ql-editor p,
    .email-capture-content-wrapper.ql-editor h1,
    .email-capture-content-wrapper.ql-editor h2,
    .email-capture-content-wrapper.ql-editor h3,
    .email-capture-content-wrapper.ql-editor h4 { 
        margin: 0; 
        padding: 0;
        margin-bottom: 0 !important;
    }
    .email-capture-content-wrapper.ql-editor h1,
    .email-capture-content-wrapper.ql-editor h2,
    .email-capture-content-wrapper.ql-editor h3,
    .email-capture-content-wrapper.ql-editor h4 { 
        line-height: 1.1; 
    }
    .email-capture-content-wrapper.ql-editor h4 { 
        font-size: 0.75em; 
        font-weight: normal; 
    }
    .email-capture-content-wrapper.ql-editor ul,
    .email-capture-content-wrapper.ql-editor ol {
        padding-left: 0 !important;
        margin-left: 0 !important;
        list-style-position: inside !important; 
    }
    .email-capture-content-wrapper.ql-editor li {
        padding: 0 !important;
        margin: 0 !important;
    }
    .email-capture-content-wrapper.ql-editor .ql-size-4px { font-size: 4px; }
    .email-capture-content-wrapper.ql-editor .ql-size-6px { font-size: 6px; }
    .email-capture-content-wrapper.ql-editor .ql-size-8px { font-size: 8px; }
    .email-capture-content-wrapper.ql-editor .ql-size-10px { font-size: 10px; }
    .email-capture-content-wrapper.ql-editor .ql-size-12px { font-size: 12px; }
    .email-capture-content-wrapper.ql-editor .ql-size-14px { font-size: 14px; }
    .email-capture-content-wrapper.ql-editor .ql-size-16px { font-size: 16px; }
    .email-capture-content-wrapper.ql-editor .ql-size-18px { font-size: 18px; }
    .email-capture-content-wrapper.ql-editor .ql-size-24px { font-size: 24px; }
    .email-capture-content-wrapper.ql-editor .ql-size-32px { font-size: 32px; }
    .email-capture-content-wrapper.ql-editor .ql-size-48px { font-size: 48px; }
  `;

  return (
    <div style={containerStyle}>
      {method.headline && (
        <div className="email-capture-content-wrapper ql-editor" style={{ width: '100%' }}>
            <style>{cssBlock}</style>
            <div dangerouslySetInnerHTML={{ __html: method.headline }} />
        </div>
      )}

      {method.subheadline && (
        <div className="email-capture-content-wrapper ql-editor" style={{ width: '100%' }}>
            <style>{cssBlock}</style>
            <div dangerouslySetInnerHTML={{ __html: method.subheadline }} />
        </div>
      )}

      <form style={formStyle} onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder={placeholderText}
          style={{ 
              ...styles.input, 
              width: '100%', 
              color: '#333', 
              backgroundColor: '#fff',
              border: '1px solid #ccc'
          }}
        />
        <button 
            type="submit" 
            style={{ 
                ...styles.saveButton, 
                width: '100%',
                textAlign: 'center',
                backgroundColor: buttonColor,
                color: buttonTextColor,
                border: 'none'
            }}
        >
          {/* Update: Respect empty string to hide text in preview if field is cleared */}
          {(method.submitButtonText !== undefined && method.submitButtonText !== null) 
              ? method.submitButtonText 
              : 'Submit'
          }
        </button>
      </form>
    </div>
  );
};