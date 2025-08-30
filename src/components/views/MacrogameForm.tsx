// src/components/views/MacrogameForm.tsx

import React, { useState, useEffect, useRef } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, Microgame, CustomMicrogame, CurrentPage, ScreenConfig, Popup } from '../../types';
import { USER_SELECTABLE_CATEGORIES, MUSIC_OPTIONS, TEMPO_OPTIONS, LENGTH_OPTIONS, LENGTH_DEFINITIONS, UI_SKINS } from '../../constants';
import { useData } from '../../context/DataContext';
import { MicrogameCard } from '../ui/MicrogameCard';
import { FlowCard } from '../ui/FlowCard';
import { RewardsModal } from '../modals/RewardsModal';
import { recommendationData, WIZARD_CONVERSION_GOALS, WIZARD_CUSTOMER_TYPES } from '../../wizards/recommendationLogic';

const defaultScreenConfig: ScreenConfig = {
    enabled: false,
    text: '',
    duration: 3,
    backgroundImageUrl: '',
    clickToContinue: false,
};

interface MacrogameFormProps {
    existingMacrogame?: Macrogame | null;
    onSave: (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => void;
    onCancel?: () => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
}

export const MacrogameForm: React.FC<MacrogameFormProps> = ({ existingMacrogame, onSave, onCancel, setCurrentPage }) => {
    const { allRewards, allMicrogames, customMicrogames } = useData();
    const [gameName, setGameName] = useState('');
    const [category, setCategory] = useState('');
    const [flow, setFlow] = useState<{ baseGame: Microgame; customVariant?: CustomMicrogame }[]>([]);
    const [rewardsConfig, setRewardsConfig] = useState<Macrogame['rewards']>([]);
    const [music, setMusic] = useState('Default');
    const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
    
    const [introScreen, setIntroScreen] = useState<Partial<ScreenConfig>>({ enabled: true, text: 'GET READY!', duration: 2, clickToContinue: false });
    const [promoScreen, setPromoScreen] = useState<Partial<ScreenConfig>>({ enabled: false, text: 'Check out this cool product!', duration: 5, clickToContinue: false });
    
    const [titleTime, setTitleTime] = useState<number | ''>(2);
    const [controlsTime, setControlsTime] = useState<number | ''>(3);
    
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [goalFilter, setGoalFilter] = useState('All');
    const [customerTypeFilter, setCustomerTypeFilter] = useState('All');
    const [tempoFilter, setTempoFilter] = useState('All');
    const [lengthFilter, setLengthFilter] = useState('All');
    
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : Math.max(0, num);
    };

    const resetForm = () => {
        setGameName(''); setCategory(''); setFlow([]); setRewardsConfig([]);
        setIntroScreen({ enabled: true, text: 'GET READY!', duration: 2, clickToContinue: false });
        setPromoScreen({ enabled: false, text: 'Check out this cool product!', duration: 5, clickToContinue: false });
        setTitleTime(2); setControlsTime(3); setMusic('Default');
    };

    useEffect(() => {
        if (existingMacrogame) {
            setGameName(existingMacrogame.name);
            setCategory(existingMacrogame.category);
            const flowDetails = (existingMacrogame.flow as { microgameId: string, variantId: string | null }[]).map(flowItem => {
                const baseGame = allMicrogames.find(m => m.id === flowItem.microgameId);
                
                if (!baseGame) {
                    return {
                        baseGame: { id: flowItem.microgameId, name: 'Deleted Microgame', length: 0, controls: '', baseType: '', tempo: 'Normal', skins: {}, isActive: false },
                        customVariant: undefined
                    };
                }

                const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
                return { baseGame, customVariant };
            });
            setFlow(flowDetails);
            setRewardsConfig(existingMacrogame.rewards);
            setIntroScreen(existingMacrogame.introScreen);
            setPromoScreen(existingMacrogame.promoScreen);
            setTitleTime(existingMacrogame.config.titleScreenDuration / 1000);
            setControlsTime(existingMacrogame.config.controlsScreenDuration / 1000);
            const musicOption = Object.keys(MUSIC_OPTIONS).find(key => MUSIC_OPTIONS[key] === existingMacrogame.config.backgroundMusicUrl) || 'None';
            setMusic(musicOption);
        } else { resetForm(); }
    }, [existingMacrogame, allMicrogames, customMicrogames]);

    const handleSaveClick = () => {
        const validFlow = flow.filter(f => f.baseGame.isActive !== false);
        if (validFlow.length !== flow.length) {
            if (!window.confirm("This macrogame contains archived microgames which will be removed upon saving. Continue?")) {
                return;
            }
        }

        if (!gameName || validFlow.length < 1) { alert('Please provide a name and add at least 1 valid microgame.'); return; }
        
        const newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null } = {
            id: existingMacrogame ? existingMacrogame.id : null,
            name: gameName, category,
            createdAt: existingMacrogame ? existingMacrogame.createdAt : new Date().toISOString(),
            config: {
                titleScreenDuration: Number(titleTime) * 1000,
                controlsScreenDuration: Number(controlsTime) * 1000,
                backgroundMusicUrl: MUSIC_OPTIONS[music]
            },
            introScreen: {
                enabled: introScreen.enabled ?? false,
                text: introScreen.text ?? '',
                duration: Number(introScreen.duration),
                clickToContinue: introScreen.clickToContinue ?? false,
            },
            promoScreen: {
                enabled: promoScreen.enabled ?? false,
                text: promoScreen.text ?? '',
                duration: Number(promoScreen.duration),
                clickToContinue: promoScreen.clickToContinue ?? false,
            },
            flow: validFlow.map((flowItem, index) => ({
                microgameId: flowItem.baseGame.id,
                variantId: flowItem.customVariant ? flowItem.customVariant.id : null,
                order: index + 1
            })),
            rewards: rewardsConfig, type: 'default'
        };
        onSave(newMacrogame);
        if (!existingMacrogame) { resetForm(); }
    };

    const handleAddToFlow = (baseGame: Microgame, customVariant?: CustomMicrogame) => { setFlow(prevFlow => [...prevFlow, { baseGame, customVariant }]); };
    const handleMoveInFlow = (index: number, direction: 'up' | 'down') => { const newFlow = [...flow]; const [item] = newFlow.splice(index, 1); newFlow.splice(direction === 'up' ? index - 1 : index + 1, 0, item); setFlow(newFlow); };
    const handleDuplicateInFlow = (index: number) => { const newFlow = [...flow]; newFlow.splice(index + 1, 0, newFlow[index]); setFlow(newFlow); };
    const handleRemoveFromFlow = (indexToRemove: number) => { setFlow(prevFlow => prevFlow.filter((_, index) => index !== indexToRemove)); };
    const handlePreviewMusic = () => { if (isPreviewPlaying && audioRef.current) { audioRef.current.pause(); return; } const soundSrc = MUSIC_OPTIONS[music]; if (!soundSrc) return; audioRef.current = new Audio(soundSrc); audioRef.current.play(); setIsPreviewPlaying(true); const stopPlayback = () => setIsPreviewPlaying(false); audioRef.current.addEventListener('pause', stopPlayback, { once: true }); setTimeout(() => { if (audioRef.current) audioRef.current.pause() }, 5000); };
    
    const handlePreview = (game: Microgame) => {
        const barebonesSkin = UI_SKINS.find(s => s.id === 'barebones');
        if (!barebonesSkin) {
            alert("Preview skin not found.");
            return;
        }
        const previewMacrogame: Omit<Macrogame, 'id' | 'type' | 'createdAt'> & { flow: any[] } = {
            name: `${game.name} - Preview`,
            category: '',
            config: {
                titleScreenDuration: 1500,
                controlsScreenDuration: 2500,
                backgroundMusicUrl: null
            },
            introScreen: { enabled: false, text: '', duration: 0, clickToContinue: false },
            promoScreen: { enabled: false, text: '', duration: 0, clickToContinue: false },
            flow: [{ ...game, customSkinData: {} }],
            rewards: [],
        };
        const previewPopup: Partial<Popup> = { name: "Microgame Preview" };
        const previewConfig = { popup: previewPopup, macrogame: previewMacrogame, rewards: [], skin: barebonesSkin, isPreviewMode: 'single_game' };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };
    
    const filteredMicrogames = allMicrogames.filter(game => {
        if (game.isActive === false) return false;
        if (goalFilter !== 'All') { const gameRecData = recommendationData.find(rec => rec.id === game.id); if (!gameRecData || !gameRecData.compatibleGoals.includes(goalFilter as any)) { return false; } }
        if (customerTypeFilter !== 'All') { const gameRecData = recommendationData.find(rec => rec.id === game.id); if (!gameRecData || !gameRecData.compatibleCustomerTypes.includes(customerTypeFilter as any)) { return false; } }
        if (tempoFilter !== 'All' && game.tempo !== tempoFilter) { return false; }
        if (lengthFilter !== 'All' && !LENGTH_DEFINITIONS[lengthFilter](game.length)) { return false; }
        return true;
    });

    const formTitle = existingMacrogame ? 'Edit Macrogame' : 'Create New Macrogame';
    const saveButtonText = existingMacrogame ? 'Save Changes' : 'Create Macrogame';
    const promoStepNumber = flow.filter(f => f.baseGame.isActive !== false).length + 1;

    return (
        <>
            <RewardsModal isOpen={isRewardsModalOpen} onClose={() => setIsRewardsModalOpen(false)} existingRewards={rewardsConfig} allRewards={allRewards} onSave={setRewardsConfig} setCurrentPage={setCurrentPage} />
            <div style={styles.creatorSection}>
                <div style={styles.formHeader}><h2 style={styles.h2}>{formTitle}</h2>{onCancel && <button onClick={onCancel} style={styles.secondaryButton}>Cancel</button>}</div>
                <div style={styles.configItem}>
                    <label>Macrogame Name</label>
                    <input
                        type="text"
                        value={gameName}
                        onChange={e => setGameName(e.target.value)}
                        style={styles.input}
                        placeholder="e.g., Weight Lifter - Gym Membership"
                    />
                </div>
                <h3 style={styles.h3}>Select Microgames</h3>
                <div style={styles.configRow}>
                    <div style={styles.configItem}><label>Filter by Conversion Goal</label><select value={goalFilter} onChange={e => setGoalFilter(e.target.value)} style={styles.input}>{WIZARD_CONVERSION_GOALS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                    <div style={styles.configItem}><label>Filter by Customer Type</label><select value={customerTypeFilter} onChange={e => setCustomerTypeFilter(e.target.value)} style={styles.input}>{WIZARD_CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div style={styles.configItem}><label>Filter by Tempo / Feel</label><select value={tempoFilter} onChange={e => setTempoFilter(e.target.value)} style={styles.input}>{TEMPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div style={styles.configItem}><label>Filter by Length</label><select value={lengthFilter} onChange={e => setLengthFilter(e.target.value)} style={styles.input}>{LENGTH_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                </div>
                <div style={{...styles.cardContainer, marginTop: '1.5rem'}}>
                    {filteredMicrogames.map(game => (
                        <MicrogameCard
                            key={game.id}
                            game={game}
                            isExpanded={expandedCard === game.id}
                            onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)}
                            context="creator"
                            onSelect={handleAddToFlow}
                            customMicrogames={customMicrogames}
                            onPreview={() => handlePreview(game)}
                            macrogameFlow={flow}
                        />
                    ))}
                </div>
                <h3 style={styles.h3}>Macrogame Flow</h3>
                <div style={styles.flowContainer}>
                    {introScreen.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard}}><div style={styles.flowCardStep}>0</div>Intro</div><div style={styles.flowArrow}>&rarr;</div></>)}
                    {flow.map((flowItem, index) => (<React.Fragment key={`${flowItem.baseGame.id}-${flowItem.customVariant?.id || 'base'}-${index}`}><FlowCard index={index} flowItem={flowItem} isFirst={index === 0} isLast={index === flow.length - 1} onMove={(dir) => handleMoveInFlow(index, dir)} onDuplicate={() => handleDuplicateInFlow(index)} onRemove={() => handleRemoveFromFlow(index)} /><div style={styles.flowArrow}>&rarr;</div></React.Fragment>))}
                    {promoScreen.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard, borderColor: '#2ecc71' }}><div style={styles.flowCardStep}>{promoStepNumber}</div>Promo</div><div style={styles.flowArrow}>&rarr;</div></>)}
                    <div onClick={() => setIsRewardsModalOpen(true)} style={{...styles.flowCard, ...styles.staticFlowCard, cursor: 'pointer'}}><div style={{...styles.flowCardStep, ...styles.flowCardStepAdd}}>+Add</div>Rewards {rewardsConfig.length > 0 ? `(${rewardsConfig.length})` : ''}</div>
                </div>
                <div style={styles.configSection}>
                    <h4>Flow Screen Settings</h4>
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
                <h3 style={styles.h3}>Select a Theme</h3>
                <p style={styles.descriptionText}>Your Macrogame's theme will affect its visuals, sounds, and gameplay experience to better fit your audience.</p>
                <div style={styles.formRow}><select value={category} onChange={(e) => setCategory(e.target.value)} style={{...styles.input, flex: 1.5}}><option value="">Select a Theme...</option>{USER_SELECTABLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <h3 style={styles.h3}>Configuration</h3>
                <div style={styles.configContainer}>
                    <div style={styles.configRow}><div style={styles.configItem}><label>Title Screen Duration (s)</label><input type="number" value={titleTime} onChange={e => setTitleTime(handleNumberChange(e.target.value))} style={styles.input} /></div><div style={styles.configItem}><label>Controls Screen Duration (s)</label><input type="number" value={controlsTime} onChange={e => setControlsTime(handleNumberChange(e.target.value))} style={styles.input} /></div></div>
                    <div style={styles.configRow}><div style={styles.configItem}><label>Background Music</label><select value={music} onChange={e => setMusic(e.target.value)} style={styles.input}>{Object.keys(MUSIC_OPTIONS).map(m => <option key={m} value={m}>{m}</option>)}</select></div><div style={{...styles.configItem, justifyContent: 'flex-end'}}><button onClick={handlePreviewMusic} style={{...styles.input, ...styles.secondaryButton, height: 'auto' }}>{isPreviewPlaying ? 'Stop' : 'Preview'}</button></div></div>
                </div>
                <button onClick={handleSaveClick} style={styles.createButton}>{saveButtonText}</button>
            </div>
        </>
    );
};