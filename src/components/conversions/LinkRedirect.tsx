// src/components/conversions/LinkRedirect.tsx

import React from 'react';
import { LinkRedirectMethod } from '../../types';
import { styles } from '../../App.styles';

interface LinkRedirectProps {
  method: LinkRedirectMethod;
}

export const LinkRedirect: React.FC<LinkRedirectProps> = ({ method }) => {
  const getUrlWithUtm = () => {
    if (!method.utmEnabled) {
      return method.url;
    }
    const url = new URL(method.url);
    if (method.utmSource) url.searchParams.set('utm_source', method.utmSource);
    if (method.utmMedium) url.searchParams.set('utm_medium', method.utmMedium);
    if (method.utmCampaign) url.searchParams.set('utm_campaign', method.utmCampaign);
    return url.toString();
  };

  const containerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '1rem',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem auto'
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
      >
        {method.buttonText}
      </a>
    </div>
  );
};