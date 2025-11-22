// src/components/conversions/LinkRedirect.tsx

import React from 'react';
import { LinkRedirectMethod } from '../../types';
import { styles } from '../../App.styles';

interface LinkRedirectProps {
  method: LinkRedirectMethod;
  onSuccess: () => void;
}

export const LinkRedirect: React.FC<LinkRedirectProps> = ({ method, onSuccess }) => {
  const getUrlWithUtm = () => {
    if (!method.utmEnabled || !method.url) {
      return method.url || '#';
    }
    try {
      const url = new URL(method.url);
      if (method.utmSource) url.searchParams.set('utm_source', method.utmSource);
      if (method.utmMedium) url.searchParams.set('utm_medium', method.utmMedium);
      if (method.utmCampaign) url.searchParams.set('utm_campaign', method.utmCampaign);
      return url.toString();
    } catch (error) {
        console.error("Invalid URL for Link Redirect:", method.url);
        return '#';
    }
  };

  const containerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '1rem',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem auto'
  };

  const handleClick = () => {
    // Explicitly call onSuccess to unlock the next step
    onSuccess();
    // The browser will then proceed with the default link navigation
  };

  return (
    <div style={containerStyle}>
      <h4 style={{ margin: 0, fontSize: '1.2em' }}>{method.headline}</h4>
      <p style={{ margin: '0.5rem 0 1rem' }}>{method.subheadline}</p>
      <a
        href={getUrlWithUtm()}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...styles.saveButton, display: 'block', textDecoration: 'none' }}
        onClick={handleClick}
      >
        {method.buttonText}
      </a>
    </div>
  );
};