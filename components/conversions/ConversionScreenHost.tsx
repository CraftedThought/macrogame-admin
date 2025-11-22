/* src/components/conversions/ConversionScreenHost.tsx */

import React, { useState, useMemo } from 'react';
import { ConversionScreen, ConversionMethod } from '../../types';
import { useData } from '../../hooks/useData';
import { CouponDisplay, EmailCapture, FormSubmit, LinkRedirect, SocialFollow } from './';
import { styles } from '../../App.styles'; // Import common styles for the button

// --- NEW: Locked Reward Component (now an interactive button) ---
const LockedMethodDisplay: React.FC<{
  methodName: string;
  pointCost: number;
  totalScore: number;
  onRedeem: () => void;
  onDeduct: (amount: number) => void;
}> = ({ methodName, pointCost, totalScore, onRedeem, onDeduct }) => {
  
  const canAfford = totalScore >= pointCost;

  const handleClick = () => {
    if (!canAfford) return;
    onDeduct(pointCost);
    onRedeem();
  };

  const lockedContainerStyle: React.CSSProperties = {
    ...styles.secondaryButton, // Use a base button style
    textAlign: 'center',
    padding: '1rem',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem auto',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: `2px solid ${canAfford ? '#f1c40f' : '#6c757d'}`, // Yellow for purchasable, gray for locked
    borderRadius: '8px',
    color: canAfford ? '#f1c40f' : '#6c757d',
    cursor: canAfford ? 'pointer' : 'not-allowed',
    opacity: canAfford ? 1 : 0.7
  };
  const lockIconStyle: React.CSSProperties = {
    fontSize: '2em',
    lineHeight: 1
  };
  const lockedHeadlineStyle: React.CSSProperties = {
    margin: '0.5em 0 0.25em',
    fontSize: '1.2em',
    color: 'white' // Keep headline text white for clarity
  };
   const lockedTextStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '0.9em'
  };

  return (
    <button style={lockedContainerStyle} onClick={handleClick} disabled={!canAfford}>
      <span style={lockIconStyle}>🔒</span>
      <h4 style={lockedHeadlineStyle}>{canAfford ? 'Redeem' : 'Locked'}: {methodName}</h4>
      <p style={lockedTextStyle}>
        {canAfford ? `Spend ${pointCost} Points` : `Cost: ${pointCost} Points (You have ${totalScore})`}
      </p>
    </button>
  );
};


interface ConversionScreenHostProps {
  screen: ConversionScreen;
  totalScore?: number;
  pointCosts?: { [methodInstanceId: string]: number };
  redeemPoints?: (amount: number) => void; // Function to deduct points
}

export const ConversionScreenHost: React.FC<ConversionScreenHostProps> = ({ screen, totalScore = 0, pointCosts = {}, redeemPoints }) => {
  const { allConversionMethods } = useData();

  // State to track which methods have been successfully completed
  const [completedMethodIds, setCompletedMethodIds] = useState<Set<string>>(new Set());

  // A handler that child components will call on success
  const handleMethodSuccess = (instanceId: string) => {
    setCompletedMethodIds(prev => new Set(prev).add(instanceId));
  };

  // Memoized list of all methods, with their visibility/lock status
  const processedMethods = useMemo(() => {
    return (screen.methods || [])
      .map(screenMethod => {
        const methodData = allConversionMethods.find(m => m.id === screenMethod.methodId);
        if (!methodData) return null; // Or render a placeholder for a deleted method

        const gate = screenMethod.gate;
        let isLocked = false;
        let pointCost: number | undefined = undefined;

        // --- UPDATED LOGIC ---
        // A method is "locked" if it hasn't been completed yet AND it has a gate.
        if (!completedMethodIds.has(screenMethod.instanceId)) {
            if (gate) {
                if (gate.type === 'on_success' && gate.methodInstanceId) {
                    isLocked = !completedMethodIds.has(gate.methodInstanceId);
                } else if (gate.type === 'on_points') {
                    isLocked = true; // It's "locked" until you buy it
                    pointCost = pointCosts[screenMethod.instanceId] || 0;
                }
            }
        }
        // If it's in completedMethodIds, isLocked remains false (it's unlocked)
        
        return {
          ...screenMethod,
          data: methodData,
          isLocked,
          pointCost
        };
      })
      .filter((method): method is NonNullable<typeof method> => !!method); // Remove any nulls from deleted methods

  }, [screen.methods, allConversionMethods, completedMethodIds, totalScore, pointCosts]);

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
        {processedMethods.map((method, index) => {
          const key = method.instanceId || index;

          if (method.isLocked) {
            if (method.gate?.type === 'on_points') {
              // --- UPDATED: Pass new props to the redeem button ---
              return (
                <LockedMethodDisplay 
                  key={key} 
                  methodName={method.data.name}
                  pointCost={method.pointCost || 0}
                  totalScore={totalScore}
                  onRedeem={() => handleMethodSuccess(method.instanceId)}
                  onDeduct={redeemPoints || (() => {})} // Pass the deduct function
                />
              );
            }
            // If locked by 'on_success', we just don't render it (it's hidden)
            return null;
          }
          
          // --- Render the unlocked, visible component ---
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