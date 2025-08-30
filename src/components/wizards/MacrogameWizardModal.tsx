// src/components/wizards/MacrogameWizardModal.tsx

import React, { useState } from 'react';
import { styles } from '../../App.styles';
import { useData } from '../../context/DataContext';
import { Macrogame, Microgame, CurrentPage, ScreenConfig, Popup, Reward } from '../../types';
import { generateMacrogameFlow, WIZARD_CONVERSION_GOALS, WIZARD_CUSTOMER_TYPES, WIZARD_TEMPOS, WizardConversionGoal, WizardCustomerType, WizardTempo } from '../../wizards/recommendationLogic';
import { USER_SELECTABLE_CATEGORIES, MUSIC_OPTIONS, UI_SKINS } from '../../constants';
import { FlowCard } from '../ui/FlowCard';

const defaultScreenConfig: ScreenConfig = {
    enabled: false,
    text: '',
    duration: 3,
    backgroundImageUrl: '',
    clickToContinue: false,
};

interface MacrogameWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
}

export const MacrogameWizardModal: React.FC<MacrogameWizardModalProps> = ({ isOpen, onClose, setCurrentPage }) => {
    const { allMicrogames, allRewards, createMacrogame } = useData();
    const [macrogameName, setMacrogameName] = useState('');
    const [goal, setGoal] = useState<WizardConversionGoal>(WIZARD_CONVERSION_GOALS[0]);
    const [customerType, setCustomerType] = useState<WizardCustomerType>(WIZARD_CUSTOMER_TYPES[0]);
    const [tempo, setTempo] = useState<WizardTempo>(WIZARD_TEMPOS[0]);
    const [maxLength, setMaxLength] = useState<number | ''>(20);
    const [theme, setTheme] = useState<string>('');
    const [generatedFlow, setGeneratedFlow] = useState<Microgame[] | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    
    const [introScreen, setIntroScreen] = useState<Partial<ScreenConfig>>({ enabled: true, text: 'GET READY!', duration: 2, clickToContinue: false });
    const [promoScreen, setPromoScreen] = useState<Partial<ScreenConfig>>({ enabled: false, text: 'Check out this cool product!', duration: 5, clickToContinue: false });

    const [titleTime, setTitleTime] = useState<number | ''>(2);
    const [controlsTime, setControlsTime] = useState<number | ''>(3);
    const [music, setMusic] = useState('Default');
    const [rewardsConfig, setRewardsConfig] = useState<Macrogame['rewards']>([]);

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : Math.max(0, num);
    };

    const handleGenerate = () => {
        const flow = generateMacrogameFlow({ goal, customerType, tempo, maxLength, allMicrogames });
        setGeneratedFlow(flow);
        setIsExpanded(true);
    };

    const handleFlowChange = (newFlow: Microgame[]) => {
        setGeneratedFlow(newFlow);
    };

    const handlePointChange = (rewardId: string, points: string) => {
        const numericPoints = points === '' ? 0 : Number(points);
        if (numericPoints < 0) return;
        setRewardsConfig(prev => prev.map(r => r.rewardId === rewardId ? { ...r, pointsCost: numericPoints } : r));
    };

    const handleToggleReward = (reward: Pick<Reward, 'id' | 'name'>) => {
        const isExisting = rewardsConfig.some(r => r.rewardId === reward.id);
        if (isExisting) {
            setRewardsConfig(prev => prev.filter(r => r.rewardId !== reward.id));
        } else {
            setRewardsConfig(prev => [...prev, { rewardId: reward.id, name: reward.name, pointsCost: 100 }]);
        }
    };

    const handleSave = async () => {
        if (!macrogameName.trim()) { alert('Please provide a name for your macrogame.'); return; }
        if (!generatedFlow || generatedFlow.length === 0) { alert('Cannot save an empty macrogame. Please generate a flow first.'); return; }
        const newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null, type: 'wizard' | 'default' } = {
            id: null, name: macrogameName, category: theme,
            createdAt: new Date().toISOString(),
            config: {
                titleScreenDuration: Number(titleTime) * 1000,
                controlsScreenDuration: Number(controlsTime) * 1000,
                backgroundMusicUrl: MUSIC_OPTIONS[music]
            },
            introScreen: {
                enabled: introScreen.enabled ?? false,
                text: introScreen.text ?? '',
                duration: Number(introScreen.duration),
                clickToContinue: introScreen.clickToContinue ?? false
            },
            promoScreen: {
                enabled: promoScreen.enabled ?? false,
                text: promoScreen.text ?? '',
                duration: Number(promoScreen.duration),
                clickToContinue: promoScreen.clickToContinue ?? false
            },
            flow: generatedFlow.map((flowItem, index) => ({
                microgameId: flowItem.id,
                variantId: null,
                order: index + 1
            })),
            rewards: rewardsConfig, type: 'wizard'
        };
        try {
            await createMacrogame(newMacrogame);
            alert('Macrogame saved successfully!');
            onClose();
        } catch (error) {
            console.error("Error saving macrogame:", error);
            alert("Failed to save macrogame. See console for details.");
        }
    };
    
    const handlePreview = () => {
        if (!generatedFlow) return;
        const barebonesSkin = UI_SKINS.find(s => s.id === 'barebones');
        if (!barebonesSkin) { alert("Preview skin not found."); return; }
        const previewMacrogame: Omit<Macrogame, 'id' | 'type' | 'createdAt'> & {flow: any[]} = {
            name: macrogameName || "Wizard Preview",
            category: theme,
            config: { titleScreenDuration: Number(titleTime) * 1000, controlsScreenDuration: Number(controlsTime) * 1000, backgroundMusicUrl: MUSIC_OPTIONS[music] },
            introScreen,
            promoScreen,
            flow: generatedFlow.map(game => ({ ...game, customSkinData: {} })),
            rewards: rewardsConfig,
        };
        const previewPopup: Partial<Popup> = { name: "Wizard Preview" };
        const previewConfig = { popup: previewPopup, macrogame: previewMacrogame, rewards: allRewards, skin: barebonesSkin };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };
    
    if (!isOpen) return null;

    const availableRewardsFiltered = allRewards.filter(mock => !rewardsConfig.some(r => r.rewardId === mock.id));
    const flowLength = generatedFlow?.length || 0;
    const promoStepNumber = flowLength + 1;
    const rewardsStepNumber = flowLength + ((promoScreen.enabled ?? false) ? 1 : 0) + 1;

    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}}>
                <div style={styles.modalHeader}><h2>Macrogame Creator Wizard</h2><button onClick={onClose} style={styles.modalCloseButton}>&times;</button></div>
                <div style={styles.modalBody}>
                    <div style={styles.configItem}><label>Macrogame Name</label><input type="text" placeholder="e.g., Summer Kick-off Game" value={macrogameName} onChange={e => setMacrogameName(e.target.value)} style={styles.input} /></div>
                    <h3 style={{...styles.h3, border: 'none', marginTop: '1.5rem'}}>Gameplay Customization</h3>
                    <div style={styles.configContainer}>
                        <div style={styles.configRow}><div style={styles.configItem}><label>Conversion Goal</label><select value={goal} onChange={e => setGoal(e.target.value as WizardConversionGoal)} style={styles.input}>{WIZARD_CONVERSION_GOALS.map(g => <option key={g} value={g}>{g}</option>)}</select></div><div style={styles.configItem}><label>Customer Type</label><select value={customerType} onChange={e => setCustomerType(e.target.value as WizardCustomerType)} style={styles.input}>{WIZARD_CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
                        <div style={styles.configRow}><div style={styles.configItem}><label>Tempo / Feel</label><select value={tempo} onChange={e => setTempo(e.target.value as WizardTempo)} style={styles.input}>{WIZARD_TEMPOS.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div style={styles.configItem}><label>Max Gameplay Length (seconds)</label><input type="number" value={maxLength} onChange={e => setMaxLength(handleNumberChange(e.target.value))} style={styles.input} /></div></div>
                    </div>
                    <div style={styles.configItem}><h3 style={{...styles.h3, border: 'none', margin: '1.5rem 0 0.5rem'}}>Select a Theme</h3><p style={styles.descriptionText}>This will affect visuals, sounds, and gameplay to better fit your audience.</p><select value={theme} onChange={(e) => setTheme(e.target.value)} style={styles.input}><option value="">Select a Theme...</option>{USER_SELECTABLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <button onClick={handleGenerate} style={{...styles.createButton, width: '100%', marginTop: '2rem'}}>Generate Macrogame</button>

                    {generatedFlow && (
                        <div style={{marginTop: '2rem'}}>
                             <div style={{...styles.managerHeader, marginBottom: '1rem'}}><h3 style={styles.h3}>Generated Macrogame</h3><button onClick={handleGenerate} style={styles.secondaryButton}>Reshuffle</button></div>
                             {generatedFlow.length === 0 ? (<p>No microgames fit the selected criteria. Please try different options.</p>) : (<div style={styles.listItem}><div style={{fontWeight: 'bold'}}>Recommended Flow ({generatedFlow.reduce((sum, g) => sum + g.length, 0)}s)</div><div style={styles.managerActions}><button onClick={handlePreview} style={styles.previewButton}>Preview</button><button onClick={() => setIsExpanded(!isExpanded)} style={styles.editButton}>{isExpanded ? 'Collapse' : 'Expand & Edit'}</button></div></div>)}
                             {isExpanded && generatedFlow.length > 0 && (
                                <>
                                    <div style={{...styles.flowContainer, marginTop: '1rem'}}>
                                        {introScreen.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard}}><div style={styles.flowCardStep}>0</div>Intro</div><div style={styles.flowArrow}>&rarr;</div></>)}
                                        {generatedFlow.map((game, index) => (<React.Fragment key={`${game.id}-${index}`}><FlowCard index={index} flowItem={{ baseGame: game }} isFirst={index === 0} isLast={index === generatedFlow.length - 1} onMove={(dir) => {const newFlow = [...generatedFlow]; const [item] = newFlow.splice(index, 1); newFlow.splice(dir === 'up' ? index - 1 : index + 1, 0, item); handleFlowChange(newFlow);}} onDuplicate={() => {const newFlow = [...generatedFlow]; newFlow.splice(index + 1, 0, newFlow[index]); handleFlowChange(newFlow);}} onRemove={() => {const newFlow = generatedFlow.filter((_, i) => i !== index); handleFlowChange(newFlow);}}/><div style={styles.flowArrow}>&rarr;</div></React.Fragment>))}
                                        {promoScreen.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard, borderColor: '#2ecc71' }}><div style={styles.flowCardStep}>{promoStepNumber}</div>Promo</div><div style={styles.flowArrow}>&rarr;</div></>)}
                                        <div style={{...styles.flowCard, ...styles.staticFlowCard, cursor: 'default'}}><div style={styles.flowCardStep}>{rewardsStepNumber}</div>Rewards {rewardsConfig.length > 0 ? `(${rewardsConfig.length})` : ''}</div>
                                    </div>
                                    <div style={styles.configSection}>
                                        <label><input type="checkbox" checked={introScreen.enabled} onChange={e => setIntroScreen(p => ({ ...p, enabled: e.target.checked }))} /> <strong>Enable Intro Screen</strong></label>
                                        {introScreen.enabled && (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #eee'}}>
                                                <div style={styles.configRow}><div style={styles.configItem}><label>Intro Screen Text</label><input type="text" value={introScreen.text} onChange={e => setIntroScreen(p => ({...p, text: e.target.value}))} style={styles.input} /></div><div style={styles.configItem}><label>Background Image</label><input type="file" accept="image/*" style={styles.input} /></div></div>
                                                <div style={styles.configRow}><div style={styles.configItem}><label>Intro Screen Duration (s)</label><input type="number" value={introScreen.duration ?? ''} onChange={e => setIntroScreen(p => ({...p, duration: handleNumberChange(e.target.value)}))} style={styles.input} /></div><div style={styles.configItem}><label><input type="checkbox" checked={introScreen.clickToContinue} onChange={e => setIntroScreen(p => ({...p, clickToContinue: e.target.checked}))} /> Require click to continue</label></div></div>
                                            </div>
                                        )}
                                    </div>
                                    <div style={styles.configSection}>
                                        <label><input type="checkbox" checked={promoScreen.enabled} onChange={e => setPromoScreen(p => ({ ...p, enabled: e.target.checked }))} /> <strong>Enable Promo Screen</strong></label>
                                        {promoScreen.enabled && (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #eee'}}>
                                                <div style={styles.configRow}><div style={styles.configItem}><label>Promo Screen Text</label><input type="text" value={promoScreen.text} onChange={e => setPromoScreen(p => ({...p, text: e.target.value}))} style={styles.input} /></div><div style={styles.configItem}><label>Background Image</label><input type="file" accept="image/*" style={styles.input} /></div></div>
                                                <div style={styles.configRow}><div style={styles.configItem}><label>Promo Screen Duration (s)</label><input type="number" value={promoScreen.duration ?? ''} onChange={e => setPromoScreen(p => ({...p, duration: handleNumberChange(e.target.value)}))} style={styles.input} /></div><div style={styles.configItem}><label><input type="checkbox" checked={promoScreen.clickToContinue} onChange={e => setPromoScreen(p => ({...p, clickToContinue: e.target.checked}))} /> Require click to continue</label></div></div>
                                            </div>
                                        )}
                                    </div>
                                    <h3 style={styles.h3}>Add Rewards</h3>
                                    <div style={styles.configSection}>
                                        {rewardsConfig.length > 0 && (<><h4 style={{...styles.h4, marginTop: 0}}>Selected Rewards</h4><ul style={styles.rewardsList}>{rewardsConfig.map(reward => (<li key={reward.rewardId} style={styles.rewardItem}><input type="checkbox" id={`wiz-${reward.rewardId}`} checked={true} onChange={() => handleToggleReward({ id: reward.rewardId, name: reward.name })} /><label htmlFor={`wiz-${reward.rewardId}`} style={{ flex: 1 }}>{reward.name}</label><input type="number" placeholder="Points" value={reward.pointsCost} onChange={(e) => handlePointChange(reward.rewardId, e.target.value)} style={styles.pointsInput} /></li>))}</ul></>)}
                                        {availableRewardsFiltered.length > 0 && (<><h4 style={styles.h4}>Available Rewards</h4><ul style={styles.rewardsList}>{availableRewardsFiltered.map(reward => (<li key={reward.id} style={styles.rewardItem}><input type="checkbox" id={`wiz-${reward.id}`} checked={false} onChange={() => handleToggleReward(reward)} /><label htmlFor={`wiz-${reward.id}`}>{reward.name}</label></li>))}</ul></>)}
                                        {allRewards.length === 0 && <p>No rewards have been created yet. Go to the 'Rewards' tab to create some.</p>}
                                    </div>
                                    <h3 style={styles.h3}>Configuration</h3>
                                    <div style={styles.configContainer}>
                                        <div style={styles.configRow}><div style={styles.configItem}><label>Title Screen Duration (s)</label><input type="number" value={titleTime} onChange={e => setTitleTime(handleNumberChange(e.target.value))} style={styles.input} /></div><div style={styles.configItem}><label>Controls Screen Duration (s)</label><input type="number" value={controlsTime} onChange={e => setControlsTime(handleNumberChange(e.target.value))} style={styles.input} /></div></div>
                                        <div style={styles.configRow}><div style={styles.configItem}><label>Background Music</label><select value={music} onChange={e => setMusic(e.target.value)} style={styles.input}>{Object.keys(MUSIC_OPTIONS).map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
                                    </div>
                                </>
                             )}
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} style={styles.secondaryButton}>Close</button>
                    {generatedFlow && generatedFlow.length > 0 && (<button onClick={handleSave} style={styles.saveButton}>Save Macrogame</button>)}
                </div>
            </div>
        </div>
    );
};