// src/components/forms/DisplayRuleForm.tsx

import React, { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { styles } from '../../App.styles';
import { useData } from '../../context/DataContext';
import { hasMacrogameIssues } from '../../utils/helpers';
import { ScheduleInput } from '../ui/ScheduleInput';

interface DisplayRuleFormProps {
  index: number;
  onRemove: (index: number) => void;
}

export const DisplayRuleForm: React.FC<DisplayRuleFormProps> = ({ index, onRemove }) => {
  const { register, control, watch, setValue } = useFormContext();
  const { popups, macrogames, allMicrogames } = useData();
  const [isExpanded, setIsExpanded] = useState(true);

  // Watch the array of popups for this specific rule
  const selectedPopups = watch(`displayRules.${index}.popups`, []);
  const ruleName = watch(`displayRules.${index}.name`, `Rule #${index + 1}`);

  const handlePopupSelection = (popupId: string, isSelected: boolean) => {
    const currentPopups = watch(`displayRules.${index}.popups`, []);
    let newPopups;
    if (isSelected) {
      newPopups = [...currentPopups, { popupId, weight: 100 }];
    } else {
      newPopups = currentPopups.filter((p: any) => p.popupId !== popupId);
    }
    setValue(`displayRules.${index}.popups`, newPopups, { shouldDirty: true });
  };
  
  const handlePopupWeightChange = (popupId: string, weight: string) => {
      const numericWeight = parseInt(weight, 10);
      if (!isNaN(numericWeight) && numericWeight >= 0) {
          const currentPopups = watch(`displayRules.${index}.popups`, []);
          const newPopups = currentPopups.map((p: any) => p.popupId === popupId ? { ...p, weight: numericWeight } : p);
          setValue(`displayRules.${index}.popups`, newPopups, { shouldDirty: true });
      }
  };

  const selectedPopupIds = new Set(selectedPopups.map((p: any) => p.popupId));

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ ...styles.managerHeader, marginBottom: '1.5rem', cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
        <h4 style={{...styles.h4, margin: 0, flex: 1}}>{ruleName}</h4>
        <div>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(index); }} style={{...styles.deleteButton, marginRight: '1rem'}}>Remove Rule</button>
          <button type="button" style={styles.accordionButton}>{isExpanded ? '▲' : '▼'}</button>
        </div>
      </div>
      {isExpanded && (
        <>
          <div style={styles.configItem}>
            <label>Rule Name</label>
            <input type="text" placeholder={`e.g., Weekday Mornings`} {...register(`displayRules.${index}.name` as const, { required: true })} style={styles.input} />
          </div>
          <div style={{...styles.configRow, marginTop: '1rem'}}>
            <div style={styles.configItem}><label>Trigger</label><select {...register(`displayRules.${index}.trigger` as const)} style={styles.input}><option value="exit_intent">Exit Intent</option><option value="timed">Timed Delay</option><option value="scroll">Scroll Percentage</option></select></div>
            <div style={styles.configItem}><label>Audience</label><select {...register(`displayRules.${index}.audience` as const)} style={styles.input}><option value="all_visitors">All Visitors</option><option value="new_visitors">New Visitors</option><option value="returning_visitors">Returning Visitors</option></select></div>
          </div>
          <div style={{marginTop: '1.5rem'}}>
            <label style={{fontWeight: 'bold'}}>Schedule</label>
            <Controller name={`displayRules.${index}.schedule` as const} control={control} render={({ field }) => <ScheduleInput schedule={field.value} onChange={field.onChange} />} />
          </div>
          <div style={{marginTop: '1.5rem'}}>
            <label style={{fontWeight: 'bold'}}>Assign Popups</label>
             <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '6px', marginTop: '0.5rem'}}>
              {popups.map(popup => {
                  const macrogame = macrogames.find(m => m.id === popup.macrogameId);
                  const hasIssues = !macrogame || hasMacrogameIssues(macrogame, allMicrogames) || !popup.skinId;
                  const currentPopup = selectedPopups.find((p: any) => p.popupId === popup.id);
                  return (
                      <div key={popup.id} style={{...styles.rewardItem, backgroundColor: hasIssues ? '#f9f9f9' : 'white'}}>
                          <input type="checkbox" id={`popup-${index}-${popup.id}`} disabled={hasIssues} checked={selectedPopupIds.has(popup.id)} onChange={(e) => handlePopupSelection(popup.id, e.target.checked)} />
                          <label htmlFor={`popup-${index}-${popup.id}`} style={{flex: 1, color: hasIssues ? '#999' : 'inherit'}}>
                              {popup.name} {hasIssues && <span style={{fontSize: '0.8rem', color: '#e74c3c'}}> (Incomplete)</span>}
                          </label>
                          {currentPopup && (
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                  <label>Weight:</label>
                                  <input type="number" value={currentPopup.weight} onChange={(e) => handlePopupWeightChange(popup.id, e.target.value)} style={{...styles.pointsInput, width: '70px'}} />
                              </div>
                          )}
                      </div>
                  );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};