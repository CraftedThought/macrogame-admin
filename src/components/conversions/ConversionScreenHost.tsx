// src/components/conversions/ConversionScreenHost.tsx

import React, { useState, useMemo } from 'react';
import { ConversionScreen, ConversionMethod } from '../../types';
import { useData } from '../../hooks/useData';
import { CouponDisplay, EmailCapture, FormSubmit, LinkRedirect, SocialFollow } from './';

interface ConversionScreenHostProps {
  screen: ConversionScreen;
}

export const ConversionScreenHost: React.FC<ConversionScreenHostProps> = ({ screen }) => {
  const { allConversionMethods } = useData();

  // State to track which methods have been successfully completed
  const [completedMethodIds, setCompletedMethodIds] = useState<Set<string>>(new Set());

  // A handler that child components will call on success
  const handleMethodSuccess = (instanceId: string) => {
    setCompletedMethodIds(prev => new Set(prev).add(instanceId));
  };

  // Memoized list of methods to display, filtered by gating logic
  const visibleMethods = useMemo(() => {
    return (screen.methods || [])
      .map(screenMethod => {
        // Find the full method data from our context
        const methodData = allConversionMethods.find(m => m.id === screenMethod.methodId);
        if (!methodData) return null; // Or render a placeholder for a deleted method

        // Determine if the method should be visible
        const isGated = !!screenMethod.gate?.methodInstanceId;
        const isGateSatisfied = isGated ? completedMethodIds.has(screenMethod.gate.methodInstanceId) : false;
        
        const isVisible = !isGated || isGateSatisfied;

        return {
          ...screenMethod,
          data: methodData,
          isVisible,
        };
      })
      .filter(Boolean) // Remove any nulls from deleted methods
      .filter(method => method.isVisible);

  }, [screen.methods, allConversionMethods, completedMethodIds]);

  const screenStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    boxSizing: 'border-box',
    textAlign: 'center',
    color: screen.textColor || 'white',
    backgroundColor: screen.backgroundColor || 'transparent',
    ...(screen.backgroundImageUrl && { backgroundImage: `url(${screen.backgroundImageUrl})`, backgroundSize: 'cover' }),
  };

  return (
    <div style={screenStyle}>
      <h2 style={{ margin: '0 0 10px', fontSize: '1.8em' }}>{screen.headline}</h2>
      <p style={{ margin: '0 0 20px', fontSize: '1.1em' }}>{screen.bodyText}</p>

      <div style={{ flex: 1, overflowY: 'auto', width: '100%' }}>
        {visibleMethods.map((method, index) => {
          if (!method) return null;

          // Use the instanceId if it exists, otherwise fall back to the array index.
          const key = method.instanceId || index;

          // Here we render the correct component based on the method type
          switch (method.data.type) {
            case 'coupon_display':
              return <CouponDisplay key={key} method={method.data} onSuccess={() => handleMethodSuccess(method.instanceId)} />;
            case 'email_capture':
              return <EmailCapture key={key} method={method.data} onSuccess={() => handleMethodSuccess(method.instanceId)} />;
            case 'form_submit':
                return <FormSubmit key={key} method={method.data} onSuccess={() => handleMethodSuccess(method.instanceId)} />;
            case 'link_redirect':
              return <LinkRedirect key={key} method={method.data} onSuccess={() => handleMethodSuccess(method.instanceId)} />;
            case 'social_follow':
                return <SocialFollow key={key} method={method.data} onSuccess={() => handleMethodSuccess(method.instanceId)} />;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};