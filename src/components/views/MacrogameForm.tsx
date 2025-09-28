// src/components/views/MacrogameForm.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, Microgame, CustomMicrogame, CurrentPage, ScreenConfig, Popup } from '../../types';
import { adaptMicrogame } from '../../utils/helpers';
import { MUSIC_OPTIONS, UI_SKINS, CONVERSION_GOALS, PRODUCT_CATEGORIES } from '../../constants';
import { useData } from '../../hooks/useData';
import { MicrogameCard } from '../ui/MicrogameCard';
import { FlowCard } from '../ui/FlowCard';
import { ConversionScreenSelectModal } from '../modals/ConversionScreenSelectModal';

interface MacrogameFormProps {
    existingMacrogame?: Macrogame | null;
    onSave: (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => void;
    onCancel?: () => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
    onLaunchWizard: (data: object) => void;
    flowFromWizard: Microgame[] | null;
    onClearWizardFlow: () => void;
}

export const MacrogameForm: React.FC<MacrogameFormProps> = ({ existingMacrogame, onSave, onCancel, setCurrentPage, onLaunchWizard, flowFromWizard, onClearWizardFlow }) => {
    const { allRewards, allMicrogames, customMicrogames } = useData();
    const [gameName, setGameName] = useState('');
    const [conversionGoal, setConversionGoal] = useState('');
    const [gameplayExperience, setGameplayExperience] = useState('');
    const [productCategory, setProductCategory] = useState('');
    const [productSubCategory, setProductSubCategory] = useState('');
    const [microgameTypeFilter, setMicrogameTypeFilter] = useState('All'); // <-- NEW STATE

    const [flow, setFlow] = useState<{ baseGame: Microgame; customVariant?: CustomMicrogame }[]>([]);
    const [conversionScreenId, setConversionScreenId] = useState<string | null>(null);
    const [isConversionScreenModalOpen, setIsConversionScreenModalOpen] = useState(false);
    const [music, setMusic] = useState('Default');
    
    const [introScreen, setIntroScreen] = useState<Partial<ScreenConfig>>({ enabled: true, text: 'GET READY!', duration: 2, clickToContinue: false });
    const [promoScreen, setPromoScreen] = useState<Partial<ScreenConfig>>({ enabled: false, text: 'Check out this cool product!', duration: 5, clickToContinue: false });
    
    const [titleTime, setTitleTime] = useState<number | ''>(2);
    const [controlsTime, setControlsTime] = useState<number | ''>(3);
    
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [isSelectionExpanded, setIsSelectionExpanded] = useState(!existingMacrogame);
    
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const flowSectionRef = useRef<HTMLHeadingElement>(null);

    const isLocked = !!existingMacrogame && flow.length > 0;
    const lockTooltip = "Please remove all of the Microgames in your Macrogame Flow to be able to change this field.";

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : Math.max(0, num);
    };

    const resetForm = () => {
        setGameName(''); setConversionGoal(''); setGameplayExperience(''); setProductCategory(''); setProductSubCategory(''); setMicrogameTypeFilter('All');
        setFlow([]); setConversionScreenId(null);
        setIntroScreen({ enabled: true, text: 'GET READY!', duration: 2, clickToContinue: false });
        setPromoScreen({ enabled: false, text: 'Check out this cool product!', duration: 5, clickToContinue: false });
        setTitleTime(2); setControlsTime(3); setMusic('Default');
    };

    useEffect(() => {
        setIsSelectionExpanded(!existingMacrogame);
        if (existingMacrogame) {
            setGameName(existingMacrogame.name);
            setProductCategory(existingMacrogame.category);
            setConversionGoal(existingMacrogame.conversionGoal || '');
            setGameplayExperience(existingMacrogame.gameplayExperience || '');
            setMicrogameTypeFilter('All'); // Always reset filter on load
            const flowDetails = (existingMacrogame.flow as { microgameId: string, variantId: string | null }[]).map(flowItem => {
                const baseGame = allMicrogames.find(m => m.id === flowItem.microgameId);
                if (!baseGame) { return { baseGame: { id: flowItem.microgameId, name: 'Deleted Microgame', length: 0, controls: '', baseType: '', tempo: 'Normal', skins: {}, isActive: false, gameplayExperience: 'Generalized', compatibleConversionGoals: [], compatibleProductCategories: [], compatibleCustomerTypes: [] }, customVariant: undefined }; }
                const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
                return { baseGame, customVariant };
            });
            setFlow(flowDetails);
            setConversionScreenId(existingMacrogame.conversionScreenId);
            setIntroScreen(existingMacrogame.introScreen);
            setPromoScreen(existingMacrogame.promoScreen);
            setTitleTime(existingMacrogame.config.titleScreenDuration / 1000);
            setControlsTime(existingMacrogame.config.controlsScreenDuration / 1000);
            const musicOption = Object.keys(MUSIC_OPTIONS).find(key => MUSIC_OPTIONS[key] === existingMacrogame.config.backgroundMusicUrl) || 'None';
            setMusic(musicOption);
        } else {
            resetForm();
        }
    }, [existingMacrogame, allMicrogames, customMicrogames]);

    useEffect(() => {
        if (flowFromWizard && flowFromWizard.length > 0) {
            const newFlow = flowFromWizard.map(game => ({ baseGame: game, customVariant: undefined }));
            setFlow(newFlow);
            onClearWizardFlow();
            flowSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [flowFromWizard, onClearWizardFlow]);

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
            name: gameName,
            conversionGoal: conversionGoal,
            gameplayExperience: gameplayExperience as 'Rehearsal' | 'Generalized',
            category: productCategory,
            createdAt: existingMacrogame ? existingMacrogame.createdAt : new Date().toISOString(),
            config: { titleScreenDuration: Number(titleTime) * 1000, controlsScreenDuration: Number(controlsTime) * 1000, backgroundMusicUrl: MUSIC_OPTIONS[music] },
            introScreen: { enabled: introScreen.enabled ?? false, text: introScreen.text ?? '', duration: Number(introScreen.duration), clickToContinue: introScreen.clickToContinue ?? false, },
            promoScreen: { enabled: promoScreen.enabled ?? false, text: promoScreen.text ?? '', duration: Number(promoScreen.duration), clickToContinue: promoScreen.clickToContinue ?? false, },
            flow: validFlow.map((flowItem, index) => ({ microgameId: flowItem.baseGame.id, variantId: flowItem.customVariant ? flowItem.customVariant.id : null, order: index + 1 })),
            conversionScreenId: conversionScreenId, type: 'default'
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
        if (!barebonesSkin) { alert("Preview skin not found."); return; }
        const previewMacrogame: Omit<Macrogame, 'id' | 'type' | 'createdAt'> & { flow: any[] } = {
            name: `${game.name} - Preview`, category: '', config: { titleScreenDuration: 1500, controlsScreenDuration: 2500, backgroundMusicUrl: null },
            introScreen: { enabled: false, text: '', duration: 0, clickToContinue: false }, promoScreen: { enabled: false, text: '', duration: 0, clickToContinue: false },
            flow: [{ ...game, customSkinData: {} }], rewards: [],
        };
        const previewPopup: Partial<Popup> = { name: "Microgame Preview" };
        const previewConfig = { popup: previewPopup, macrogame: previewMacrogame, rewards: allRewards, skin: barebonesSkin, isPreviewMode: 'single_game' };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };
    
    const adaptedAndFilteredMicrogames = useMemo(() => {
        if (!conversionGoal || !gameplayExperience || !productCategory) { return []; }
        return allMicrogames.filter(game => {
            if (game.isActive === false) return false;
            if (game.gameplayExperience !== gameplayExperience) return false;
            
            // <-- NEW FILTER LOGIC
            if (gameplayExperience === 'Generalized' && microgameTypeFilter !== 'All') {
                const type = microgameTypeFilter === 'Chance-Based' ? 'chance' : 'skill';
                if (game.mechanicType !== type) return false;
            }
            // <-- END NEW LOGIC

            if (!game.compatibleConversionGoals.includes(conversionGoal)) return false;
            if (!game.compatibleProductCategories.includes('All') && !game.compatibleProductCategories.includes(productCategory)) return false;
            return true;
        }).map(game => adaptMicrogame(game, productCategory));
    }, [allMicrogames, conversionGoal, gameplayExperience, productCategory, microgameTypeFilter]);

    const formTitle = existingMacrogame ? 'Edit Macrogame' : 'Create New Macrogame';
    const saveButtonText = existingMacrogame ? 'Save Changes' : 'Create Macrogame';
    const promoStepNumber = flow.filter(f => f.baseGame.isActive !== false).length + 1;
    const isWizardDisabled = !conversionGoal || !gameplayExperience || !productCategory;

    return (
        <>
            <ConversionScreenSelectModal 
                isOpen={isConversionScreenModalOpen} 
                onClose={() => setIsConversionScreenModalOpen(false)} 
                currentScreenId={conversionScreenId} 
                onSave={setConversionScreenId} 
                setCurrentPage={setCurrentPage} 
            />
            
            <div style={!existingMacrogame ? styles.creatorSection : {}}>
                 <div style={styles.formHeader}>
                    <h2 style={{...styles.h2, ...(existingMacrogame && {display: 'none'})}}>{formTitle}</h2>
                </div>

                <div style={styles.configItem}>
                    <label>Macrogame Name</label>
                    <input type="text" value={gameName} onChange={e => setGameName(e.target.value)} style={styles.input} placeholder="e.g., Summer Skincare Challenge"/>
                </div>
                <div style={{...styles.configItem, marginTop: '1rem'}} title={isLocked ? lockTooltip : ''}>
                    <label>Conversion Goal</label>
                    <select value={conversionGoal} onChange={e => setConversionGoal(e.target.value)} style={styles.input} disabled={isLocked}>
                        <option value="" disabled>Choose a goal...</option>
                        {Object.entries(CONVERSION_GOALS).map(([groupLabel, options]) => ( <optgroup label={groupLabel} key={groupLabel}> {options.map(option => <option key={option} value={option}>{option}</option>)} </optgroup> ))}
                    </select>
                </div>
                {/* --- NEW ROW FOR GAMEPLAY EXPERIENCE AND TYPE --- */}
                <div style={{...styles.configRow, marginTop: '1rem'}} title={isLocked ? lockTooltip : ''}>
                    <div style={styles.configItem}>
                        <label>Gameplay Experience</label>
                        <select value={gameplayExperience} onChange={e => setGameplayExperience(e.target.value)} style={styles.input} disabled={isLocked}>
                            <option value="" disabled>Choose an experience type...</option>
                            <option value="Generalized">Generalized</option>
                            <option value="Rehearsal">Rehearsal (Coming Soon)</option>
                        </select>
                    </div>
                    {gameplayExperience === 'Generalized' && (
                        <div style={styles.configItem}>
                            <label>Type</label>
                            <select value={microgameTypeFilter} onChange={e => setMicrogameTypeFilter(e.target.value)} style={styles.input} disabled={isLocked}>
                                <option value="All">All</option>
                                <option value="Chance-Based">Chance-Based</option>
                                <option value="Skill">Skill</option>
                            </select>
                        </div>
                    )}
                </div>
                <div style={{...styles.configRow, marginTop: '1rem'}} title={isLocked ? lockTooltip : ''}>
                    <div style={styles.configItem}>
                        <label>Product Category</label>
                        <select value={productCategory} onChange={e => {setProductCategory(e.target.value); setProductSubCategory('');}} style={styles.input} disabled={isLocked}>
                            <option value="" disabled>Choose a category...</option>
                            {Object.keys(PRODUCT_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    {productCategory && (<div style={styles.configItem}>
                        <label>...and Subcategory</label>
                        <select value={productSubCategory} onChange={e => setProductSubCategory(e.target.value)} style={styles.input} disabled={isLocked}>
                            <option value="">Choose a subcategory...</option>
                            {PRODUCT_CATEGORIES[productCategory].map(subCat => <option key={subCat} value={subCat}>{subCat}</option>)}
                        </select>
                    </div>)}
                </div>
                <div style={{...styles.managerHeader, cursor: 'pointer', marginTop: '1.5rem'}} onClick={() => setIsSelectionExpanded(!isSelectionExpanded)}>
                    <h3 style={{...styles.h3, margin: 0, border: 'none'}}>Select Microgames</h3>
                    <button type="button" style={styles.accordionButton}>{isSelectionExpanded ? '▲' : '▼'}</button>
                </div>
                {isSelectionExpanded && (
                    <div>
                        <p style={styles.descriptionText}>Based on your selections, here are the recommended Microgames. Click 'Add' to manually build your flow below, or use the Wizard to generate a flow systematically based on additional parameters.</p>
                        {!existingMacrogame && (<div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}><button type="button" onClick={() => onLaunchWizard({ gameName, conversionGoal, gameplayExperience, productCategory, productSubCategory })} style={{...styles.saveButton, opacity: isWizardDisabled ? 0.5 : 1}} disabled={isWizardDisabled} >Launch Wizard</button></div>)}
                        <div style={{...styles.cardContainer, marginTop: '1.5rem'}}>
                            {adaptedAndFilteredMicrogames.length > 0 ? (adaptedAndFilteredMicrogames.map(game => (<MicrogameCard key={game.id} game={game} isExpanded={expandedCard === game.id} onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} context="creator" onSelect={handleAddToFlow} customMicrogames={customMicrogames} onPreview={() => handlePreview(game)} macrogameFlow={flow} />))) : (<p>{ (conversionGoal && gameplayExperience && productCategory) ? 'No microgames match your criteria.' : 'Please complete the steps above to see recommended microgames.' }</p>)}
                        </div>
                    </div>
                )}
                <h3 style={styles.h3} ref={flowSectionRef}>Macrogame Flow</h3>
                <div style={styles.flowContainer}>
                    {introScreen.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard}}><div style={styles.flowCardStep}>0</div>Intro</div><div style={styles.flowArrow}>&rarr;</div></>)}
                    {flow.map((flowItem, index) => (<React.Fragment key={`${flowItem.baseGame.id}-${flowItem.customVariant?.id || 'base'}-${index}`}><FlowCard index={index} flowItem={flowItem} isFirst={index === 0} isLast={index === flow.length - 1} onMove={(dir) => handleMoveInFlow(index, dir)} onDuplicate={() => handleDuplicateInFlow(index)} onRemove={() => handleRemoveFromFlow(index)} /><div style={styles.flowArrow}>&rarr;</div></React.Fragment>))}
                    {promoScreen.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard, borderColor: '#2ecc71' }}><div style={styles.flowCardStep}>{promoStepNumber}</div>Promo</div><div style={styles.flowArrow}>&rarr;</div></>)}
                    <div onClick={() => setIsConversionScreenModalOpen(true)} style={{...styles.flowCard, ...styles.staticFlowCard, cursor: 'pointer'}}><div style={{...styles.flowCardStep, ...styles.flowCardStepAdd}}>+Set</div>Conversion Screen {conversionScreenId ? `(1)` : ''}</div>
                </div>
                <div style={styles.configSection}>
                    <h4>Flow Screen Settings</h4>
                    <label><input type="checkbox" checked={introScreen.enabled} onChange={e => setIntroScreen(p => ({ ...p, enabled: e.target.checked }))} /> <strong>Enable Intro Screen</strong></label>
                    {introScreen.enabled && (<div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #eee'}}><div style={styles.configRow}><div style={styles.configItem}><label>Intro Screen Text</label><input type="text" value={introScreen.text} onChange={e => setIntroScreen(p => ({...p, text: e.target.value}))} style={styles.input} /></div><div style={styles.configItem}><label>Background Image</label><input type="file" accept="image/*" style={styles.input} /></div></div><div style={styles.configRow}><div style={styles.configItem}><label>Intro Screen Duration (s)</label><input type="number" value={introScreen.duration ?? ''} onChange={e => setIntroScreen(p => ({...p, duration: handleNumberChange(e.target.value)}))} style={styles.input} /></div><div style={styles.configItem}><label><input type="checkbox" checked={introScreen.clickToContinue} onChange={e => setIntroScreen(p => ({...p, clickToContinue: e.target.checked}))} /> Require click to continue</label></div></div></div>)}
                </div>
                <div style={styles.configSection}>
                    <label><input type="checkbox" checked={promoScreen.enabled} onChange={e => setPromoScreen(p => ({ ...p, enabled: e.target.checked }))} /> <strong>Enable Promo Screen</strong></label>
                    {promoScreen.enabled && (<div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #eee'}}><div style={styles.configRow}><div style={styles.configItem}><label>Promo Screen Text</label><input type="text" value={promoScreen.text} onChange={e => setPromoScreen(p => ({...p, text: e.target.value}))} style={styles.input} /></div><div style={styles.configItem}><label>Background Image</label><input type="file" accept="image/*" style={styles.input} /></div></div><div style={styles.configRow}><div style={styles.configItem}><label>Promo Screen Duration (s)</label><input type="number" value={promoScreen.duration ?? ''} onChange={e => setPromoScreen(p => ({...p, duration: handleNumberChange(e.target.value)}))} style={styles.input} /></div><div style={styles.configItem}><label><input type="checkbox" checked={promoScreen.clickToContinue} onChange={e => setPromoScreen(p => ({...p, clickToContinue: e.target.checked}))} /> Require click to continue</label></div></div></div>)}
                </div>
                <h3 style={styles.h3}>Configuration</h3>
                <div style={styles.configContainer}>
                    <div style={styles.configRow}><div style={styles.configItem}><label>Title Screen Duration (s)</label><input type="number" value={titleTime} onChange={e => setTitleTime(handleNumberChange(e.target.value))} style={styles.input} /></div><div style={styles.configItem}><label>Controls Screen Duration (s)</label><input type="number" value={controlsTime} onChange={e => setControlsTime(handleNumberChange(e.target.value))} style={styles.input} /></div></div>
                    <div style={styles.configRow}><div style={styles.configItem}><label>Background Music</label><select value={music} onChange={e => setMusic(e.target.value)} style={styles.input}>{Object.keys(MUSIC_OPTIONS).map(m => <option key={m} value={m}>{m}</option>)}</select></div><div style={{...styles.configItem, justifyContent: 'flex-end'}}><button onClick={handlePreviewMusic} style={{...styles.input, ...styles.secondaryButton, height: 'auto' }}>{isPreviewPlaying ? 'Stop' : 'Preview'}</button></div></div>
                </div>

                {!existingMacrogame && (
                    <button onClick={handleSaveClick} style={styles.createButton}>{saveButtonText}</button>
                )}
                <button id="macrogame-form-save-button" onClick={handleSaveClick} style={{display: 'none'}} />
            </div>
        </>
    );
};