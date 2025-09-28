// src/components/conversions/SocialFollow.tsx

import React from 'react';
import { SocialFollowMethod } from '../../types';
import { styles } from '../../App.styles';

interface SocialFollowProps {
  method: SocialFollowMethod;
}

export const SocialFollow: React.FC<SocialFollowProps> = ({ method }) => {
  const containerStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '1rem',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem auto'
  };
  
  const linkContainerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      flexWrap: 'wrap'
  };

  const socialLinkStyle: React.CSSProperties = {
      ...styles.secondaryButton,
      textDecoration: 'none',
      padding: '0.5rem 1rem',
  };

  return (
    <div style={containerStyle}>
      <h4 style={{ margin: 0, fontSize: '1.2em' }}>{method.headline}</h4>
      <p style={{ margin: '0.5rem 0 1rem' }}>{method.subheadline}</p>
      <div style={linkContainerStyle}>
        {method.links.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={socialLinkStyle}
          >
            Follow on {link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
          </a>
        ))}
      </div>
    </div>
  );
};