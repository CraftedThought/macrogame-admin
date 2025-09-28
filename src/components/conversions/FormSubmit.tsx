// src/components/conversions/FormSubmit.tsx

import React from 'react';
import { FormSubmitMethod } from '../../types';
import { styles } from '../../App.styles';

interface FormSubmitProps {
  method: FormSubmitMethod;
  onSuccess: () => void;
}

export const FormSubmit: React.FC<FormSubmitProps> = ({ method, onSuccess }) => {
    const containerStyle: React.CSSProperties = {
        textAlign: 'center',
        padding: '1rem',
        width: '100%',
        maxWidth: '400px',
        margin: '1rem auto'
    };

    const formStyle: React.CSSProperties = {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Form submitted!');
        onSuccess();
    }
    
    return (
        <div style={containerStyle}>
            <h4 style={{ margin: 0, fontSize: '1.2em' }}>{method.headline}</h4>
            <p style={{ margin: '0.5rem 0 1rem' }}>{method.subheadline}</p>
            <form style={formStyle} onSubmit={handleSubmit}>
                {method.fields.map(field => (
                    <div key={field.name} style={{textAlign: 'left'}}>
                        <label>
                            {field.label}
                            {field.required && <span style={{ color: '#e74c3c' }}> *</span>}
                        </label>
                        <input
                            type={field.type}
                            name={field.name}
                            required={field.required}
                            style={{ ...styles.input, width: '100%', marginTop: '0.25rem', color: '#333' }}
                        />
                    </div>
                ))}
                <button type="submit" style={{ ...styles.saveButton, width: '100%', marginTop: '0.5rem' }}>
                    {method.submitButtonText}
                </button>
            </form>
        </div>
    );
};