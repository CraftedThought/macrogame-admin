// src/components/wizards/MacrogameWizardModal.tsx

import React, { useState, useEffect } from 'react';
import { styles } from '../../App.styles';
import { useData } from '../../hooks/useData';
import { Macrogame, Microgame, CurrentPage } from '../../types';
import { generateMacrogameFlow, WIZARD_TEMPOS, WizardTempo } from '../../wizards/recommendationLogic';
import { adaptMicrogame } from '../../utils/helpers';
import { FlowCard } from '../ui/FlowCard';
import { Modal } from '../ui/Modal';

interface MacrogameWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
    initialData: any;
    onContinue: (flow: Microgame[]) => void;
}

export const MacrogameWizardModal: React.FC<MacrogameWizardModalProps> = ({ isOpen, onClose, setCurrentPage, initialData, onContinue }) => {
    const { allMicrogames } = useData();
    
    const [tempo, setTempo] = useState<WizardTempo>(WIZARD_TEMPOS[1]);
    const [numGames, setNumGames] = useState<number | ''>(3);
    const [maxLength, setMaxLength] = useState<number | ''>(20);

    const [generatedFlow, setGeneratedFlow] = useState<Microgame[] | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setGeneratedFlow(null);
            setIsExpanded(false);
        }
    }, [isOpen]);

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : Math.max(0, num);
    };

    const handleGenerate = () => {
        const baseFlow = generateMacrogameFlow({ goal: initialData.conversionGoal, tempo, maxLength, allMicrogames, gameplayExperience: initialData.gameplayExperience, numGames: Number(numGames) });
        const adaptedFlow = baseFlow.map(game => adaptMicrogame(game, initialData.productCategory));
        setGeneratedFlow(adaptedFlow);
        setIsExpanded(true);
    };

    const handleFlowChange = (newFlow: Microgame[]) => {
        setGeneratedFlow(newFlow);
    };

    const handleContinue = async () => {
        if (!generatedFlow || generatedFlow.length === 0) { alert('Cannot continue with an empty macrogame flow.'); return; }
        onContinue(generatedFlow);
    };
    
    const modalFooter = (
        <>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>Close</button>
            {generatedFlow && generatedFlow.length > 0 && (<button onClick={handleContinue} style={styles.saveButton}>Continue</button>)}
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Macrogame Creator Wizard" footer={modalFooter} size="medium">
            <div>
                <div style={{...styles.configItem, backgroundColor: '#f0f2f5', padding: '0.5rem 1rem', borderRadius: '6px'}}>
                    <label>Macrogame Name (Read-Only)</label>
                    <p><strong>{initialData?.gameName || 'No Name Provided'}</strong></p>
                </div>
                <h3 style={{...styles.h3, border: 'none', marginTop: '1.5rem'}}>Gameplay Parameters</h3>
                <div style={styles.configContainer}>
                    <div style={styles.configRow}>
                        <div style={styles.configItem}><label>Tempo / Feel</label><select value={tempo} onChange={e => setTempo(e.target.value as WizardTempo)} style={styles.input}>{WIZARD_TEMPOS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                        <div style={styles.configItem}><label># of Microgames</label><input type="number" value={numGames} onChange={e => setNumGames(handleNumberChange(e.target.value))} style={styles.input} /></div>
                        <div style={styles.configItem}><label>Max Gameplay Length (seconds)</label><input type="number" value={maxLength} onChange={e => setMaxLength(handleNumberChange(e.target.value))} style={styles.input} /></div>
                    </div>
                </div>
                <button onClick={handleGenerate} style={{...styles.createButton, width: '100%', marginTop: '2rem'}}>Generate Macrogame Flow</button>
                {generatedFlow && (
                     <div style={{marginTop: '2rem'}}>
                         <div style={{...styles.managerHeader, marginBottom: '1rem'}}><h3 style={styles.h3}>Generated Macrogame</h3><button onClick={handleGenerate} style={styles.secondaryButton}>Reshuffle</button></div>
                         {generatedFlow.length === 0 ? (<p>No microgames fit the selected criteria. Please try different options.</p>) : (<div style={styles.listItem}><div style={{fontWeight: 'bold'}}>Recommended Flow ({generatedFlow.reduce((sum, g) => sum + g.length, 0)}s)</div><div style={styles.managerActions}><button onClick={() => setIsExpanded(!isExpanded)} style={styles.editButton}>{isExpanded ? 'Collapse' : 'Expand & Edit'}</button></div></div>)}
                         {isExpanded && generatedFlow.length > 0 && (
                            <>
                                <div style={{...styles.flowContainer, marginTop: '1rem'}}>
                                    {generatedFlow.map((game, index) => (<React.Fragment key={`${game.id}-${index}`}><FlowCard index={index} flowItem={{ baseGame: game }} isFirst={index === 0} isLast={index === generatedFlow.length - 1} onMove={(dir) => {const newFlow = [...generatedFlow]; const [item] = newFlow.splice(index, 1); newFlow.splice(dir === 'up' ? index - 1 : index + 1, 0, item); handleFlowChange(newFlow);}} onDuplicate={() => {const newFlow = [...generatedFlow]; newFlow.splice(index + 1, 0, newFlow[index]); handleFlowChange(newFlow);}} onRemove={() => {const newFlow = generatedFlow.filter((_, i) => i !== index); handleFlowChange(newFlow);}}/><div style={styles.flowArrow}>&rarr;</div></React.Fragment>))}
                                </div>
                                <p style={{...styles.descriptionText, textAlign: 'center', marginTop: '1rem'}}>Click "Continue" to configure your Macrogame's intro, promo, and conversion screens.</p>
                            </>
                         )}
                    </div>
                )}
            </div>
        </Modal>
    );
};