// src/components/views/MacrogameForm.tsx

import React, { useState, useEffect, useRef } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, Microgame, CustomMicrogame, CurrentPage, PromoScreenConfig } from '../../types';
import { USER_SELECTABLE_CATEGORIES, MUSIC_OPTIONS, TEMPO_OPTIONS, LENGTH_OPTIONS, LENGTH_DEFINITIONS } from '../../constants';
import { useData } from '../../context/DataContext';
import { MicrogameCard } from '../ui/MicrogameCard';
import { FlowCard } from '../ui/FlowCard';
import { RewardsModal } from '../modals/RewardsModal';
import { recommendationData, WIZARD_CONVERSION_GOALS, WIZARD_CUSTOMER_TYPES } from '../../wizards/recommendationLogic';

interface MacrogameFormProps {
    existingMacrogame?: Macrogame | null;
    onSave: (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => void;
    onCancel?: () => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
}

export const MacrogameForm: React.FC<MacrogameFormProps> = ({ existingMacrogame, onSave, onCancel, setCurrentPage }) => {
    const { allRewards, allMicrogames, customMicrogames } = useData();
    // --- FORM STATE ---
    const [gameName, setGameName] = useState('');
    const [category, setCategory] = useState('');
    const [flow, setFlow] = useState<{ baseGame: Microgame; customVariant?: CustomMicrogame }[]>([]);
    const [rewardsConfig, setRewardsConfig] = useState<Macrogame['rewards']>([]);
    const [music, setMusic] = useState('Default');
    const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
    
    // --- CONFIG STATE ---
    const [showIntro, setShowIntro] = useState(true); // NEW: State for Intro screen toggle
    const [introText, setIntroText] = useState('GET READY!');
    const [introTime, setIntroTime] = useState<number | ''>(3);
    const [titleTime, setTitleTime] = useState<number | ''>(2);
    const [controlsTime, setControlsTime] = useState<number | ''>(3);
    const [promoConfig, setPromoConfig] = useState<PromoScreenConfig>({ enabled: false, text: 'Check out this cool product!', duration: 5, clickToContinue: false }); // NEW: State for Promo screen
    
    // --- UI/FILTER STATE ---
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [goalFilter, setGoalFilter] = useState('All');
    const [customerTypeFilter, setCustomerTypeFilter] = useState('All');
    const [tempoFilter, setTempoFilter] = useState('All'); // NEW: State for Tempo filter
    const [lengthFilter, setLengthFilter] = useState('All'); // NEW: State for Length filter
    
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const resetForm = () => {
        setGameName(''); setCategory(''); setFlow([]); setRewardsConfig([]);
        setShowIntro(true); setIntroText('GET READY!'); setIntroTime(3);
        setTitleTime(2); setControlsTime(3); setMusic('Default');
        setPromoConfig({ enabled: false, text: 'Check out this cool product!', duration: 5, clickToContinue: false });
    };

    useEffect(() => {
        if (existingMacrogame) {
            setGameName(existingMacrogame.name);
            setCategory(existingMacrogame.category);
            const flowDetails = (existingMacrogame.flow as { microgameId: string, variantId: string | null }[]).map(flowItem => {
                const baseGame = allMicrogames.find(m => m.id === flowItem.microgameId);
                if (!baseGame) return null;
                const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
                return { baseGame, customVariant };
            }).filter((item): item is { baseGame: Microgame; customVariant?: CustomMicrogame } => !!item);
            setFlow(flowDetails);
            setRewardsConfig(existingMacrogame.rewards);
            // Config settings
            setShowIntro(existingMacrogame.config.showIntroScreen);
            setIntroText(existingMacrogame.config.introScreenText);
            setIntroTime(existingMacrogame.config.introScreenDuration / 1000);
            setTitleTime(existingMacrogame.config.titleScreenDuration / 1000);
            setControlsTime(existingMacrogame.config.controlsScreenDuration / 1000);
            const musicOption = Object.keys(MUSIC_OPTIONS).find(key => MUSIC_OPTIONS[key] === existingMacrogame.config.backgroundMusicUrl) || 'None';
            setMusic(musicOption);
            // Promo screen settings
            if (existingMacrogame.promoScreen) {
                setPromoConfig(existingMacrogame.promoScreen);
            }
        } else { resetForm(); }
    }, [existingMacrogame, allMicrogames, customMicrogames]);

    const handleSaveClick = () => {
        if (!gameName || flow.length < 1) { alert('Please provide a name and add at least 1 microgame.'); return; }
        // NOTE: File handling for promo background image would be added here, similar to custom microgame skins.
        const newMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null } = {
            id: existingMacrogame ? existingMacrogame.id : null,
            name: gameName,
            category,
            createdAt: existingMacrogame ? existingMacrogame.createdAt : new Date().toISOString(),
            config: {
                showIntroScreen: showIntro, // NEW
                introScreenText: introText,
                introScreenDuration: Number(introTime) * 1000,
                titleScreenDuration: Number(titleTime) * 1000,
                controlsScreenDuration: Number(controlsTime) * 1000,
                backgroundMusicUrl: MUSIC_OPTIONS[music]
            },
            flow: flow.map((flowItem, index) => ({
                microgameId: flowItem.baseGame.id,
                variantId: flowItem.customVariant ? flowItem.customVariant.id : null,
                order: index + 1
            })),
            rewards: rewardsConfig,
            promoScreen: promoConfig, // NEW
            type: 'default'
        };
        onSave(newMacrogame);
        if (!existingMacrogame) { resetForm(); }
    };

    const handleAddToFlow = (baseGame: Microgame, customVariant?: CustomMicrogame) => { setFlow(prevFlow => [...prevFlow, { baseGame, customVariant }]); };
    const handleMoveInFlow = (index: number, direction: 'up' | 'down') => { const newFlow = [...flow]; const [item] = newFlow.splice(index, 1); newFlow.splice(direction === 'up' ? index - 1 : index + 1, 0, item); setFlow(newFlow); };
    const handleDuplicateInFlow = (index: number) => { const newFlow = [...flow]; newFlow.splice(index + 1, 0, newFlow[index]); setFlow(newFlow); };
    const handleRemoveFromFlow = (indexToRemove: number) => { setFlow(prevFlow => prevFlow.filter((_, index) => index !== indexToRemove)); };
    const handlePreviewMusic = () => { if (isPreviewPlaying && audioRef.current) { audioRef.current.pause(); return; } const soundSrc = MUSIC_OPTIONS[music]; if (!soundSrc) return; audioRef.current = new Audio(soundSrc); audioRef.current.play(); setIsPreviewPlaying(true); const stopPlayback = () => setIsPreviewPlaying(false); audioRef.current.addEventListener('pause', stopPlayback, { once: true }); setTimeout(() => { if (audioRef.current) audioRef.current.pause() }, 5000); };
    const handleTimeChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>, value: string) => { if (value === '') { setter(''); } else { const num = parseInt(value, 10); setter(isNaN(num) ? '' : Math.max(0, num)); } };

    // UPDATED: Added tempo and length filters to the chain.
    const filteredMicrogames = allMicrogames.filter(game => {
        const gameRecData = recommendationData.find(rec => rec.id === game.id);
        if (!gameRecData) return goalFilter === 'All' && customerTypeFilter === 'All';
        const goalMatch = goalFilter === 'All' || gameRecData.compatibleGoals.includes(goalFilter as any);
        const customerTypeMatch = customerTypeFilter === 'All' || gameRecData.compatibleCustomerTypes.includes(customerTypeFilter as any);
        return goalMatch && customerTypeMatch;
    }).filter(game => {
        return tempoFilter === 'All' || game.tempo === tempoFilter;
    }).filter(game => {
        return lengthFilter === 'All' || LENGTH_DEFINITIONS[lengthFilter](game.length);
    });

    const formTitle = existingMacrogame ? 'Edit Macrogame' : 'Create New Macrogame';
    const saveButtonText = existingMacrogame ? 'Save Changes' : 'Create Macrogame';

    return (
        <>
            <RewardsModal isOpen={isRewardsModalOpen} onClose={() => setIsRewardsModalOpen(false)} existingRewards={rewardsConfig} allRewards={allRewards} onSave={setRewardsConfig} setCurrentPage={setCurrentPage} />
            <div style={styles.creatorSection}>
                <div style={styles.formHeader}><h2 style={styles.h2}>{formTitle}</h2>{onCancel && <button onClick={onCancel} style={styles.secondaryButton}>Cancel</button>}</div>
                <div style={styles.configItem}><label>Macrogame Name</label><input type="text" value={gameName} onChange={e => setGameName(e.target.value)} style={styles.input} /></div>
                <h3 style={styles.h3}>Select Microgames</h3>

                <div style={styles.configRow}>
                    <div style={styles.configItem}><label>Filter by Goal</label><select value={goalFilter} onChange={e => setGoalFilter(e.target.value)} style={styles.input}><option value="All">All Conversion Goals</option>{WIZARD_CONVERSION_GOALS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                    <div style={styles.configItem}><label>Filter by Customer Type</label><select value={customerTypeFilter} onChange={e => setCustomerTypeFilter(e.target.value)} style={styles.input}><option value="All">All Customer Types</option>{WIZARD_CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    {/* --- NEW FILTERS (Req 1 & 2) --- */}
                    <div style={styles.configItem}><label>Filter by Tempo / Feel</label><select value={tempoFilter} onChange={e => setTempoFilter(e.target.value)} style={styles.input}>{TEMPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div style={styles.configItem}><label>Filter by Length</label><select value={lengthFilter} onChange={e => setLengthFilter(e.target.value)} style={styles.input}>{LENGTH_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                </div>

                <div style={{...styles.cardContainer, marginTop: '1.5rem'}}>
                    {filteredMicrogames.map(game => (<MicrogameCard key={game.id} game={game} isExpanded={expandedCard === game.id} onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} onSelect={handleAddToFlow} customMicrogames={customMicrogames} />))}
                </div>
                
                <h3 style={styles.h3}>Macrogame Flow</h3>
                <div style={styles.flowContainer}>
                    {/* UPDATED: Intro card is now conditional (Req 3) */}
                    {showIntro && (<><div style={{...styles.flowCard, ...styles.staticFlowCard}}><div style={styles.flowCardStep}>0</div>Intro</div><div style={styles.flowArrow}>&rarr;</div></>)}
                    {flow.map((flowItem, index) => (<React.Fragment key={`${flowItem.baseGame.id}-${flowItem.customVariant?.id || 'base'}-${index}`}><FlowCard index={index} flowItem={flowItem} isFirst={index === 0} isLast={index === flow.length - 1} onMove={(dir) => handleMoveInFlow(index, dir)} onDuplicate={() => handleDuplicateInFlow(index)} onRemove={() => handleRemoveFromFlow(index)} /><div style={styles.flowArrow}>&rarr;</div></React.Fragment>))}
                    {/* NEW: Promo card is now conditional (Req 4) */}
                    {promoConfig.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard, borderColor: '#2ecc71' }}><div style={styles.flowCardStep}>!</div>Promo</div><div style={styles.flowArrow}>&rarr;</div></>)}
                    <div onClick={() => setIsRewardsModalOpen(true)} style={{...styles.flowCard, ...styles.staticFlowCard, cursor: 'pointer'}}><div style={styles.flowCardStep}>+</div>Rewards {rewardsConfig.length > 0 ? `(${rewardsConfig.length})` : ''}</div>
                </div>

                {/* --- NEW/REFACTORED SCREEN CONFIGS (Req 3 & 4) --- */}
                <div style={styles.configSection}>
                    <h4>Flow Screen Settings</h4>
                    <label><input type="checkbox" checked={showIntro} onChange={e => setShowIntro(e.target.checked)} /> Enable Intro Screen</label>
                    {showIntro && (<div style={styles.configRow}><div style={styles.configItem}><label>Intro Screen Text</label><input type="text" value={introText} onChange={e => setIntroText(e.target.value)} style={styles.input} /></div><div style={styles.configItem}><label>Intro Screen Duration (s)</label><input type="number" value={introTime} onChange={e => handleTimeChange(setIntroTime, e.target.value)} style={styles.input} /></div></div>)}
                </div>
                <div style={styles.configSection}>
                    <label><input type="checkbox" checked={promoConfig.enabled} onChange={e => setPromoConfig(p => ({ ...p, enabled: e.target.checked }))} /> Enable Promo Screen</label>
                    {promoConfig.enabled && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem'}}>
                            <div style={styles.configRow}><div style={styles.configItem}><label>Promo Text</label><input type="text" value={promoConfig.text} onChange={e => setPromoConfig(p => ({...p, text: e.target.value}))} style={styles.input} /></div><div style={styles.configItem}><label>Background Image</label><input type="file" accept="image/*" style={styles.input} /></div></div>
                            <div style={styles.configRow}><div style={styles.configItem}><label>Screen Duration (s)</label><input type="number" value={promoConfig.duration} onChange={e => setPromoConfig(p => ({...p, duration: Number(e.target.value)}))} style={styles.input} /></div><div style={styles.configItem}><label><input type="checkbox" checked={promoConfig.clickToContinue} onChange={e => setPromoConfig(p => ({...p, clickToContinue: e.target.checked}))} /> Require click to continue</label></div></div>
                        </div>
                    )}
                </div>

                <h3 style={styles.h3}>Select a Theme</h3>
                <p style={styles.descriptionText}>Your Macrogame's theme will affect its visuals, sounds, and gameplay experience to better fit your audience.</p>
                <div style={styles.formRow}><select value={category} onChange={(e) => setCategory(e.target.value)} style={{...styles.input, flex: 1.5}}><option value="">Select a Theme...</option>{USER_SELECTABLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                
                {/* --- UPDATED: Configuration section now only contains remaining items --- */}
                <h3 style={styles.h3}>Configuration</h3>
                <div style={styles.configContainer}>
                    <div style={styles.configRow}><div style={styles.configItem}><label>Title Screen Duration (s)</label><input type="number" value={titleTime} onChange={e => handleTimeChange(setTitleTime, e.target.value)} style={styles.input} /></div><div style={styles.configItem}><label>Controls Screen Duration (s)</label><input type="number" value={controlsTime} onChange={e => handleTimeChange(setControlsTime, e.target.value)} style={styles.input} /></div></div>
                    <div style={styles.configRow}><div style={styles.configItem}><label>Background Music</label><select value={music} onChange={e => setMusic(e.target.value)} style={styles.input}>{Object.keys(MUSIC_OPTIONS).map(m => <option key={m} value={m}>{m}</option>)}</select></div><div style={{...styles.configItem, justifyContent: 'flex-end'}}><button onClick={handlePreviewMusic} style={{...styles.input, ...styles.secondaryButton, height: 'auto' }}>{isPreviewPlaying ? 'Stop' : 'Preview'}</button></div></div>
                </div>
                
                <button onClick={handleSaveClick} style={styles.createButton}>{saveButtonText}</button>
            </div>
        </>
    );
};