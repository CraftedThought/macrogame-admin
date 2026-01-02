/* src/components/conversions/FormSubmit.tsx */

import React, { useState } from 'react';
import { FormSubmitMethod } from '../../types';
import { styles } from '../../App.styles';
import { notifications } from '../../utils/notifications';
import 'react-quill-new/dist/quill.snow.css';

interface FormSubmitProps {
  method: FormSubmitMethod;
  onSuccess: () => void;
  isPortrait?: boolean; // New Prop
}

export const FormSubmit: React.FC<FormSubmitProps> = ({ method, onSuccess, isPortrait = false }) => {
  const m = method as any;

  // 1. State Declaration (Must be inside the component)
  const [values, setValues] = useState<Record<string, string>>({});

  // --- Styles ---
  const safeVal = (val: any, fallback: number) => {
      const num = Number(val);
      return !isNaN(num) && val !== '' && val !== null && val !== undefined ? num : fallback;
  };

  const contentSpacing = safeVal(method.style?.spacing, 0); 
  const fieldSpacing = safeVal(m.style?.fieldSpacing, 0);   
  const widthPercent = typeof m.style?.size === 'number' ? m.style.size : 50;
  const finalWidth = isPortrait ? '100%' : `${widthPercent}%`;
  
  const buttonColor = m.style?.buttonColor ?? '#1532c1';
  const buttonTextColor = m.style?.buttonTextColor ?? '#ffffff';

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
  };

  const fieldsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: `${fieldSpacing}px`, 
  };

  // Update: Input Sanitization Logic
  const handleInputChange = (name: string, type: string, rawValue: string) => {
      let nextValue = rawValue;

      if (type === 'text') {
          // Prevent numbers and symbols (Allow letters, spaces, hyphens, apostrophes)
          nextValue = rawValue.replace(/[^a-zA-Z\s\-']/g, '');
      } 
      else if (type === 'tel') {
          // Allow digits, spaces, dashes, parentheses, plus
          nextValue = rawValue.replace(/[^0-9+\-\s()]/g, '');
      }

      setValues(prev => ({ ...prev, [name]: nextValue }));
  };

  // Update: Block 'e' in number inputs
  const handleKeyDown = (e: React.KeyboardEvent, type: string) => {
      if (type === 'number' && (e.key === 'e' || e.key === 'E')) {
          e.preventDefault();
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update: Validate all fields
    for (const field of (method.fields || [])) {
        const val = values[field.name] || '';
        
        if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
                notifications.error(`Invalid email format for "${field.label}"`);
                return;
            }
        }
        if (field.type === 'tel') {
            // Simple check: At least 7 valid characters
            if (val.replace(/\D/g, '').length < 7) {
                notifications.error(`Please enter a valid phone number for "${field.label}"`);
                return;
            }
        }
    }

    notifications.success('Form submitted (Simulation)');
    onSuccess();
  };

  // --- Row Grouping Logic ---
  // 1. Group fields by 'row' property
  const rows: Record<number, any[]> = {};
  // If method.fields exists, map them. If row is missing, default to index+1 (legacy support)
  (method.fields || []).forEach((field: any, index: number) => {
      const rowNum = field.row || (index + 1);
      if (!rows[rowNum]) rows[rowNum] = [];
      rows[rowNum].push(field);
  });

  // 2. Get sorted row keys
  const sortedRowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);

  // 3. Create Visual Rows (Responsive Adaptation)
  // If Portrait, we enforce a max of 2 fields per row by splitting larger rows.
  const visualRows: any[][] = [];
  
  sortedRowKeys.forEach(key => {
      const originalRow = rows[key];
      
      if (isPortrait && originalRow.length > 2) {
          // Chunk into groups of 2
          for (let i = 0; i < originalRow.length; i += 2) {
              visualRows.push(originalRow.slice(i, i + 2));
          }
      } else {
          // Keep as is
          visualRows.push(originalRow);
      }
  });

  const cssBlock = `
    .form-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.25;
        color: inherit;
    }

    /* Zero margins for all block elements */
    .form-content-wrapper.ql-editor p,
    .form-content-wrapper.ql-editor h1,
    .form-content-wrapper.ql-editor h2,
    .form-content-wrapper.ql-editor h3,
    .form-content-wrapper.ql-editor h4 { 
        margin: 0; 
        padding: 0;
        margin-bottom: 0 !important;
    }

    /* Tighter line-height for headers */
    .form-content-wrapper.ql-editor h1,
    .form-content-wrapper.ql-editor h2,
    .form-content-wrapper.ql-editor h3,
    .form-content-wrapper.ql-editor h4 { 
        line-height: 1.1; 
    }

    /* H4 = Small Text */
    .form-content-wrapper.ql-editor h4 { 
        font-size: 0.75em; 
        font-weight: normal; 
    }

    /* FIX LIST OFFSETS */
    .form-content-wrapper.ql-editor ul,
    .form-content-wrapper.ql-editor ol {
        padding-left: 0 !important;
        margin-left: 0 !important;
        list-style-position: inside !important;
    }
    .form-content-wrapper.ql-editor li {
        padding: 0 !important;
        margin: 0 !important;
    }
  `;
  
  return (
    <div style={containerStyle}>
      <style>{cssBlock}</style>

      {method.headline && (
        <div className="form-content-wrapper ql-editor" style={{ width: '100%', textAlign: 'center' }}>
            <div dangerouslySetInnerHTML={{ __html: method.headline }} />
        </div>
      )}

      {method.subheadline && (
        <div className="form-content-wrapper ql-editor" style={{ width: '100%', textAlign: 'center' }}>
            <div dangerouslySetInnerHTML={{ __html: method.subheadline }} />
        </div>
      )}

      <form style={formStyle} onSubmit={handleSubmit}>
        
        {/* Render Visual Rows */}
        <div style={fieldsContainerStyle}>
            {visualRows.map((fieldsInRow, rowIndex) => {
                return (
                    <div key={rowIndex} style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        {fieldsInRow.map((field: any, index: number) => (
                            <div key={index} style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    {field.label}
                                    {field.required && <span style={{ color: '#e74c3c', marginLeft: '2px' }}>*</span>}
                                </label>
                                <input
                                    type={field.type}
                                    name={field.name}
                                    required={field.required}
                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                    value={values[field.name] || ''}
                                    onChange={(e) => handleInputChange(field.name, field.type, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, field.type)}
                                    style={{ 
                                        ...styles.input, 
                                        width: '100%', 
                                        color: '#333',
                                        padding: '0.6rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
        
        <div style={{ marginTop: `${contentSpacing}px` }}>
            <button 
                type="submit" 
                style={{ 
                    ...styles.saveButton, 
                    width: '100%', 
                    backgroundColor: buttonColor, 
                    color: buttonTextColor,
                    border: 'none',
                    cursor: 'pointer'
                }}
            >
                {/* Update: Respect empty string */}
                {(method.submitButtonText !== undefined && method.submitButtonText !== null) 
                    ? method.submitButtonText 
                    : 'Submit'
                }
            </button>
        </div>
      </form>
    </div>
  );
};