// src/components/views/MacrogameFormFields.tsx

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { styles } from '../../App.styles';
import { Macrogame, Microgame, CustomMicrogame, ScreenConfig } from '../../types';
import { adaptMicrogame, generateUUID } from '../../utils/helpers';
import { MACROGAME_MUSIC_LIBRARY, UI_SKINS, CONVERSION_GOALS, PRODUCT_CATEGORIES } from '../../constants';
import { useData } from '../../hooks/useData';
import { MicrogameCard } from '../ui/MicrogameCard';
import { FlowCard } from '../ui/FlowCard';
import { ConversionScreenSelectModal } from '../modals/ConversionScreenSelectModal';
import { storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface MacrogameFormFieldsProps {
    initialData: Omit<Macrogame, 'id' | 'type'> & { id: string | null };
    onSave: (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => void;
    onLaunchWizard: (data: object) => void;
    flowFromWizard: Microgame[] | null;
    onClearWizardFlow: () => void;
}

export const MacrogameFormFields: React.FC<MacrogameFormFieldsProps> = ({ initialData, onSave, onLaunchWizard, flowFromWizard, onClearWizardFlow }) => {
    const { allMicrogames, customMicrogames } = useData();
    
    const [gameName, setGameName] = useState(initialData.name);
    const [conversionGoal, setConversionGoal] = useState(initialData.conversionGoal || '');
    const [gameplayExperience, setGameplayExperience] = useState(initialData.gameplayExperience || '');
    const [productCategory, setProductCategory] = useState(initialData.category);
    const [productSubCategory, setProductSubCategory] = useState('');
    const [microgameTypeFilter, setMicrogameTypeFilter] = useState('All');
    const [flow, setFlow] = useState<{ baseGame: Microgame; customVariant?: CustomMicrogame }[]>([]);
    const [conversionScreenId, setConversionScreenId] = useState(initialData.conversionScreenId);
    const [isConversionScreenModalOpen, setIsConversionScreenModalOpen] = useState(false);
    const [musicId, setMusicId] = useState(() => MACROGAME_MUSIC_LIBRARY.find(track => track.path === initialData.config.backgroundMusicUrl)?.id || 'none');
    const [introScreen, setIntroScreen] = useState<Partial<ScreenConfig>>(initialData.introScreen);
    const [promoScreen, setPromoScreen] = useState<Partial<ScreenConfig>>(initialData.promoScreen);
    const [titleTime, setTitleTime] = useState<number | ''>(initialData.config.titleScreenDuration / 1000);
    const [controlsTime, setControlsTime] = useState<number | ''>(initialData.config.controlsScreenDuration / 1000);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [isSelectionExpanded, setIsSelectionExpanded] = useState(!initialData.id);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const flowSectionRef = useRef<HTMLHeadingElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [introImageFile, setIntroImageFile] = useState<File | null>(null);
    const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
    const [promoSpotlightImageFile, setPromoSpotlightImageFile] = useState<File | null>(null);
    const [audioConfig, setAudioConfig] = useState(initialData.audioConfig || {});
    const processAndSetImage = (file: File, setFileState: (file: File) => void) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const processedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        setFileState(processedFile);
                    }
                }, 'image/jpeg', 0.9);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleAudioConfigChange = (key: string, values: { playMusic?: boolean, musicId?: string }) => {
        setAudioConfig(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...values } }));
    };

    useEffect(() => {
        const flowDetails = initialData.flow.map(flowItem => {
            const baseGame = allMicrogames.find(m => m.id === flowItem.microgameId);
            if (!baseGame) {
                return { baseGame: { id: flowItem.microgameId, name: 'Deleted Microgame', length: 0, controls: '', baseType: '', tempo: 'Normal', skins: {}, isActive: false, gameplayExperience: 'Generalized', compatibleConversionGoals: [], compatibleProductCategories: [], compatibleCustomerTypes: [] }, customVariant: undefined };
            }
            const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
            return { baseGame, customVariant };
        });
        setFlow(flowDetails);
    }, [initialData.flow, allMicrogames, customMicrogames]);
    
    useEffect(() => {
        if (flowFromWizard && flowFromWizard.length > 0) {
            const newFlow = flowFromWizard.map(game => ({ baseGame: game, customVariant: undefined }));
            setFlow(newFlow);
            onClearWizardFlow();
            flowSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [flowFromWizard, onClearWizardFlow]);

    const isLocked = !!initialData.id && flow.length > 0;
    const lockTooltip = "Please remove all Microgames from the flow to change this field.";

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : Math.max(0, num);
    };

    const handleSaveClick = async () => {
        // --- VALIDATION BLOCK ---
        const errors: string[] = [];

        if (!gameName.trim()) {
            errors.push("Please provide a name for the macrogame.");
        }
        if (flow.length === 0) {
            errors.push("Please add at least one microgame to the flow.");
        }
        if (promoScreen.enabled && promoScreen.spotlightImageLayout && !promoSpotlightImageFile && !promoScreen.spotlightImageUrl) {
            errors.push("A promo screen with a spotlight layout requires a spotlight image.");
        }

        if (errors.length > 0) {
            errors.forEach(error => toast.error(error));
            return; // Stop the function if there are any errors
        }

        setIsSaving(true);
        const validFlow = flow.filter(f => f.baseGame.isActive !== false);

        // --- IMAGE UPLOAD & DATA PREPARATION ---
        let introUrl = introScreen.backgroundImageUrl;
        let promoBgUrl = promoScreen.backgroundImageUrl;
        let promoSpotlightUrl = promoScreen.spotlightImageUrl;
        const macrogameId = initialData.id || generateUUID();

        try {
            if (introImageFile) {
                const filePath = `screen-backgrounds/${macrogameId}/intro-bg-${introImageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, introImageFile);
                introUrl = await getDownloadURL(storageRef);
            }
            if (promoImageFile) {
                const filePath = `screen-backgrounds/${macrogameId}/promo-bg-${promoImageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, promoImageFile);
                promoBgUrl = await getDownloadURL(storageRef);
            }
            if (promoSpotlightImageFile) {
                const filePath = `promo-spotlights/${macrogameId}/${promoSpotlightImageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, promoSpotlightImageFile);
                promoSpotlightUrl = await getDownloadURL(storageRef);
            }
        } catch (error) {
            console.error("Error uploading images:", error);
            toast.error("An error occurred while uploading images. Please try again.");
            setIsSaving(false);
            return;
        }

        const backgroundMusicPath = MACROGAME_MUSIC_LIBRARY.find(track => track.id === musicId)?.path || null;

        const macrogameData: Omit<Macrogame, 'id' | 'type'> & { id: string | null } = {
            id: initialData.id,
            name: gameName,
            conversionGoal: conversionGoal,
            gameplayExperience: gameplayExperience as 'Rehearsal' | 'Generalized',
            category: productCategory,
            subcategory: productSubCategory,
            createdAt: initialData.createdAt,
            config: { titleScreenDuration: Number(titleTime) * 1000, controlsScreenDuration: Number(controlsTime) * 1000, backgroundMusicUrl: backgroundMusicPath },
            introScreen: {
                enabled: introScreen.enabled ?? false,
                text: introScreen.text ?? '',
                duration: Number(introScreen.duration) || 0,
                clickToContinue: introScreen.clickToContinue ?? false,
                backgroundImageUrl: introUrl,
            },
            promoScreen: {
                enabled: promoScreen.enabled ?? false,
                text: introScreen.text ?? '',
                duration: Number(promoScreen.duration) || 0,
                clickToContinue: promoScreen.clickToContinue ?? false,
                backgroundImageUrl: promoBgUrl,
                spotlightImageUrl: promoSpotlightUrl,
                spotlightImageLayout: promoScreen.spotlightImageLayout || null,
            },
            flow: validFlow.map((flowItem, index) => ({ microgameId: flowItem.baseGame.id, variantId: flowItem.customVariant ? flowItem.customVariant.id : null, order: index + 1 })),
            conversionScreenId: conversionScreenId,
            audioConfig: audioConfig,
        };

        await onSave(macrogameData);
        toast.success(`Macrogame "${gameName}" saved successfully!`);
        setIsSaving(false);
    };

    const handleAddToFlow = (baseGame: Microgame, customVariant?: CustomMicrogame) => { setFlow(prevFlow => [...prevFlow, { baseGame, customVariant }]); };
    const handleMoveInFlow = (index: number, direction: 'up' | 'down') => { const newFlow = [...flow]; const [item] = newFlow.splice(index, 1); newFlow.splice(direction === 'up' ? index - 1 : index + 1, 0, item); setFlow(newFlow); };
    const handleDuplicateInFlow = (index: number) => { const newFlow = [...flow]; newFlow.splice(index + 1, 0, newFlow[index]); setFlow(newFlow); };
    const handleRemoveFromFlow = (indexToRemove: number) => { setFlow(prevFlow => prevFlow.filter((_, index) => index !== indexToRemove)); };
    
    const handlePreviewMusic = () => {
        if (isPreviewPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setIsPreviewPlaying(false);
            return;
        }
        const trackPath = MACROGAME_MUSIC_LIBRARY.find(t => t.id === musicId)?.path;
        if (!trackPath) return;
        audioRef.current = new Audio(trackPath);
        audioRef.current.play();
        setIsPreviewPlaying(true);
        const stopPlayback = () => setIsPreviewPlaying(false);
        audioRef.current.addEventListener('ended', stopPlayback, { once: true });
        audioRef.current.addEventListener('pause', stopPlayback, { once: true });
    };

    const handleRemoveImage = (type: 'intro' | 'promoBg' | 'promoSpotlight') => {
        if (type === 'intro') {
            setIntroImageFile(null);
            setIntroScreen(p => ({ ...p, backgroundImageUrl: null }));
        } else if (type === 'promoBg') {
            setPromoImageFile(null);
            setPromoScreen(p => ({ ...p, backgroundImageUrl: null }));
        } else if (type === 'promoSpotlight') {
            setPromoSpotlightImageFile(null);
            setPromoScreen(p => ({ ...p, spotlightImageUrl: null }));
        }
    };

    const handlePreview = () => {
        const backgroundMusicPath = MACROGAME_MUSIC_LIBRARY.find(track => track.id === musicId)?.path || null;
        const macrogameForPreview: Omit<Macrogame, 'id' | 'type'> & { id: string | null } = {
            id: initialData.id, name: gameName, conversionGoal: conversionGoal, gameplayExperience: gameplayExperience as any,
            category: productCategory, createdAt: initialData.createdAt,
            config: { titleScreenDuration: Number(titleTime) * 1000, controlsScreenDuration: Number(controlsTime) * 1000, backgroundMusicUrl: backgroundMusicPath },
            introScreen: { ...introScreen, backgroundImageUrl: introImageFile ? URL.createObjectURL(introImageFile) : introScreen.backgroundImageUrl },
            promoScreen: { ...promoScreen, backgroundImageUrl: promoImageFile ? URL.createObjectURL(promoImageFile) : promoScreen.backgroundImageUrl, spotlightImageUrl: promoSpotlightImageFile ? URL.createObjectURL(promoSpotlightImageFile) : promoScreen.spotlightImageUrl },
            flow: flow.map((flowItem, index) => ({ microgameId: flowItem.baseGame.id, variantId: flowItem.customVariant?.id || null, order: index + 1 })),
            conversionScreenId: conversionScreenId, audioConfig: audioConfig,
        };
        const previewConfig = { macrogame: macrogameForPreview, skinId: 'barebones', isPreviewMode: 'full_macrogame' };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };

    const adaptedAndFilteredMicrogames = React.useMemo(() => {
        if (!conversionGoal || !gameplayExperience || !productCategory) { return []; }
        return allMicrogames.filter(game => {
            if (game.isActive === false) return false; if (game.gameplayExperience !== gameplayExperience) return false;
            if (gameplayExperience === 'Generalized' && microgameTypeFilter !== 'All') {
                const type = microgameTypeFilter === 'Chance-Based' ? 'chance' : 'skill'; if (game.mechanicType !== type) return false;
            }
            if (!game.compatibleConversionGoals.includes(conversionGoal)) return false;
            if (!game.compatibleProductCategories.includes('All') && !game.compatibleProductCategories.includes(productCategory)) return false;
            return true;
        }).map(game => adaptMicrogame(game, productCategory));
    }, [allMicrogames, conversionGoal, gameplayExperience, productCategory, microgameTypeFilter]);

    const formTitle = initialData.id ? 'Edit Macrogame' : 'Create New Macrogame';
    const saveButtonText = isSaving ? 'Saving...' : (initialData.id ? 'Save Changes' : 'Create Macrogame');
    const promoStepNumber = flow.filter(f => f.baseGame.isActive !== false).length + 1;
    const isWizardDisabled = !conversionGoal || !gameplayExperience || !productCategory;
    const getPromoLayoutTip = () => {
        const layout = promoScreen.spotlightImageLayout;
        if (layout === 'left' || layout === 'right') return "💡 Tip: A vertical (portrait) image will look best.";
        if (layout === 'top' || layout === 'bottom') return "💡 Tip: A horizontal (landscape) image will look best.";
        return "";
    };

    return (
        <>
            <ConversionScreenSelectModal isOpen={isConversionScreenModalOpen} onClose={() => setIsConversionScreenModalOpen(false)} currentScreenId={conversionScreenId} onSave={setConversionScreenId} isEditing={!!initialData.id} />
            <div style={!initialData.id ? styles.creatorSection : {}}>
                {/* Header and Initial Fields... (unchanged) */}
                <div style={styles.formHeader}><h2 style={{...styles.h2, ...(initialData.id && {display: 'none'})}}>{formTitle}</h2></div>
                <div style={styles.configItem}><label>Macrogame Name</label><input type="text" value={gameName} onChange={e => setGameName(e.target.value)} style={styles.input} placeholder="e.g., Summer Skincare Challenge"/></div>
                <div style={{...styles.configItem, marginTop: '1rem'}} title={isLocked ? lockTooltip : ''}><label>Conversion Goal</label><select value={conversionGoal} onChange={e => setConversionGoal(e.target.value)} style={styles.input} disabled={isLocked}><option value="" disabled>Choose a goal...</option>{Object.entries(CONVERSION_GOALS).map(([groupLabel, options]) => ( <optgroup label={groupLabel} key={groupLabel}> {options.map(option => <option key={option} value={option}>{option}</option>)} </optgroup> ))}</select></div>
                <div style={{...styles.configRow, marginTop: '1rem'}} title={isLocked ? lockTooltip : ''}><div style={styles.configItem}><label>Gameplay Experience</label><select value={gameplayExperience} onChange={e => setGameplayExperience(e.target.value)} style={styles.input} disabled={isLocked}><option value="" disabled>Choose an experience type...</option><option value="Generalized">Generalized</option><option value="Rehearsal">Rehearsal (Coming Soon)</option></select></div>{gameplayExperience === 'Generalized' && (<div style={styles.configItem}><label>Type</label><select value={microgameTypeFilter} onChange={e => setMicrogameTypeFilter(e.target.value)} style={styles.input} disabled={isLocked}><option value="All">All</option><option value="Chance-Based">Chance-Based</option><option value="Skill">Skill</option></select></div>)}</div>
                <div style={{...styles.configRow, marginTop: '1rem'}} title={isLocked ? lockTooltip : ''}><div style={styles.configItem}><label>Product Category</label><select value={productCategory} onChange={e => {setProductCategory(e.target.value); setProductSubCategory('');}} style={styles.input} disabled={isLocked}><option value="" disabled>Choose a category...</option>{Object.keys(PRODUCT_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>{productCategory && (<div style={styles.configItem}><label>...and Subcategory</label><select value={productSubCategory} onChange={e => setProductSubCategory(e.target.value)} style={styles.input} disabled={isLocked}><option value="">Choose a subcategory...</option>{PRODUCT_CATEGORIES[productCategory].map(subCat => <option key={subCat} value={subCat}>{subCat}</option>)}</select></div>)}</div>
                
                {/* Microgame Selection... (unchanged) */}
                <div style={{...styles.managerHeader, cursor: 'pointer', marginTop: '1.5rem'}} onClick={() => setIsSelectionExpanded(!isSelectionExpanded)}><h3 style={{...styles.h3, margin: 0, border: 'none'}}>Select Microgames</h3><button type="button" style={styles.accordionButton}>{isSelectionExpanded ? '▲' : '▼'}</button></div>
                {isSelectionExpanded && (<div><p style={styles.descriptionText}>Based on your selections, here are the recommended Microgames. Click 'Add' to manually build your flow below, or use the Wizard to generate a flow systematically based on additional parameters.</p>{!initialData.id && (<div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}><button type="button" onClick={() => onLaunchWizard({ gameName, conversionGoal, gameplayExperience, productCategory, productSubCategory, microgameTypeFilter })} style={{...styles.saveButton, opacity: isWizardDisabled ? 0.5 : 1}} disabled={isWizardDisabled} >Launch Wizard</button></div>)}<div style={{...styles.cardContainer, marginTop: '1.5rem'}}>{adaptedAndFilteredMicrogames.length > 0 ? (adaptedAndFilteredMicrogames.map(game => (<MicrogameCard key={game.id} game={game} isExpanded={expandedCard === game.id} onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} context="creator" onSelect={handleAddToFlow} customMicrogames={customMicrogames} onPreview={() => { /* This preview is for single games and is ok */ }} macrogameFlow={flow} />))) : (<p>{ (conversionGoal && gameplayExperience && productCategory) ? 'No microgames match your criteria.' : 'Please complete the steps above to see recommended microgames.' }</p>)}</div></div>)}
                
                {/* Macrogame Flow... (unchanged) */}
                <h3 style={styles.h3} ref={flowSectionRef}>Macrogame Flow</h3>
                <div style={styles.flowContainer}>{introScreen.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard}}><div style={styles.flowCardStep}>0</div>Intro</div><div style={styles.flowArrow}>&rarr;</div></>)}{flow.map((flowItem, index) => (<React.Fragment key={`${flowItem.baseGame.id}-${flowItem.customVariant?.id || 'base'}-${index}`}><FlowCard index={index} flowItem={flowItem} isFirst={index === 0} isLast={index === flow.length - 1} onMove={(dir) => handleMoveInFlow(index, dir)} onDuplicate={() => handleDuplicateInFlow(index)} onRemove={() => handleRemoveFromFlow(index)} /><div style={styles.flowArrow}>&rarr;</div></React.Fragment>))}{promoScreen.enabled && (<><div style={{...styles.flowCard, ...styles.staticFlowCard, borderColor: '#2ecc71' }}><div style={styles.flowCardStep}>{promoStepNumber}</div>Promo</div><div style={styles.flowArrow}>&rarr;</div></>)}<div onClick={() => setIsConversionScreenModalOpen(true)} style={{...styles.flowCard, ...styles.staticFlowCard, cursor: 'pointer'}}><div style={{...styles.flowCardStep, ...styles.flowCardStepAdd}}>+Set</div>Conversion Screen {conversionScreenId ? `(1)` : ''}</div></div>
                
                {/* --- UPDATED INTRO SCREEN SETTINGS --- */}
                <div style={styles.configSection}>
                    <h4>Flow Screen Settings</h4>
                    <label><input type="checkbox" checked={introScreen.enabled} onChange={e => setIntroScreen(p => ({ ...p, enabled: e.target.checked }))} /> <strong>Enable Intro Screen</strong></label>
                    {introScreen.enabled && (<div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #eee'}}>
                        <div style={styles.configRow}>
                            <div style={styles.configItem}><label>Intro Screen Text</label><input type="text" value={introScreen.text} onChange={e => setIntroScreen(p => ({...p, text: e.target.value}))} style={styles.input} /></div>
                            <div style={styles.configItem}>
                                <label>Background Image</label>
                                {(introScreen.backgroundImageUrl || introImageFile) && 
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <p style={{fontSize: '0.8rem', margin: 0}}>Current: <a href={introImageFile ? URL.createObjectURL(introImageFile) : introScreen.backgroundImageUrl} target="_blank" rel="noopener noreferrer">View Image</a></p>
                                        <button type="button" onClick={() => handleRemoveImage('intro')} style={styles.removeButton}>Remove</button>
                                    </div>
                                }
                                <input type="file" accept="image/jpeg,image/png" style={styles.input} onChange={e => { if (e.target.files?.[0]) { processAndSetImage(e.target.files[0], setIntroImageFile); } }} />
                            </div>
                        </div>
                        <div style={styles.configRow}>
                            <div style={styles.configItem}><label>Intro Screen Duration (s)</label><input type="number" value={introScreen.duration ?? ''} onChange={e => setIntroScreen(p => ({...p, duration: handleNumberChange(e.target.value)}))} style={styles.input} /></div>
                            <div style={styles.configItem}><label><input type="checkbox" checked={introScreen.clickToContinue} onChange={e => setIntroScreen(p => ({...p, clickToContinue: e.target.checked}))} /> Require click to continue</label></div>
                        </div>
                    </div>)}
                </div>
                
                {/* --- UPDATED PROMO SCREEN SETTINGS --- */}
                <div style={styles.configSection}>
                    <label><input type="checkbox" checked={promoScreen.enabled} onChange={e => setPromoScreen(p => ({ ...p, enabled: e.target.checked }))} /> <strong>Enable Promo Screen</strong></label>
                    {promoScreen.enabled && (<div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #eee'}}>
                        <div style={styles.configRow}>
                            <div style={styles.configItem}><label>Promo Screen Text</label><input type="text" value={promoScreen.text} onChange={e => setPromoScreen(p => ({...p, text: e.target.value}))} style={styles.input} /></div>
                            <div style={styles.configItem}>
                                <label>Background Image</label>
                                {(promoScreen.backgroundImageUrl || promoImageFile) && 
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <p style={{fontSize: '0.8rem', margin: 0}}>Current: <a href={promoImageFile ? URL.createObjectURL(promoImageFile) : promoScreen.backgroundImageUrl} target="_blank" rel="noopener noreferrer">View Image</a></p>
                                        <button type="button" onClick={() => handleRemoveImage('promoBg')} style={styles.removeButton}>Remove</button>
                                    </div>
                                }
                                <input type="file" accept="image/jpeg,image/png" style={styles.input} onChange={e => { if (e.target.files?.[0]) { processAndSetImage(e.target.files[0], setPromoImageFile); } }} />
                            </div>
                        </div>
                        <div style={styles.configRow}>
                            <div style={styles.configItem}>
                                <label>Spotlight Image Layout</label>
                                <select value={promoScreen.spotlightImageLayout || ''} onChange={e => setPromoScreen(p => ({...p, spotlightImageLayout: e.target.value as any}))} style={styles.input}><option value="">No Spotlight Image</option><option value="left">Image on Left</option><option value="right">Image on Right</option><option value="top">Image on Top</option><option value="bottom">Image on Bottom</option></select>
                                {promoScreen.spotlightImageLayout && <p style={{fontSize: '0.8rem', color: '#606770', marginTop: '0.5rem'}}>{getPromoLayoutTip()}</p>}
                            </div>
                            <div style={styles.configItem}>
                                <label>Spotlight Image</label>
                                {(promoScreen.spotlightImageUrl || promoSpotlightImageFile) &&
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <p style={{fontSize: '0.8rem', margin: 0}}>Current: <a href={promoSpotlightImageFile ? URL.createObjectURL(promoSpotlightImageFile) : promoScreen.spotlightImageUrl} target="_blank" rel="noopener noreferrer">View Image</a></p>
                                        <button type="button" onClick={() => handleRemoveImage('promoSpotlight')} style={styles.removeButton}>Remove</button>
                                    </div>
                                }
                                <input type="file" accept="image/jpeg,image/png" disabled={!promoScreen.spotlightImageLayout} style={!promoScreen.spotlightImageLayout ? {...styles.input, backgroundColor: '#e9ecef', cursor: 'not-allowed'} : styles.input} onChange={e => { if (e.target.files?.[0]) { processAndSetImage(e.target.files[0], setPromoSpotlightImageFile); } }} />
                            </div>
                        </div>
                        <div style={styles.configRow}><div style={styles.configItem}><label>Promo Screen Duration (s)</label><input type="number" value={promoScreen.duration ?? ''} onChange={e => setPromoScreen(p => ({...p, duration: handleNumberChange(e.target.value)}))} style={styles.input} /></div><div style={styles.configItem}><label><input type="checkbox" checked={promoScreen.clickToContinue} onChange={e => setPromoScreen(p => ({...p, clickToContinue: e.target.checked}))} /> Require click to continue</label></div></div>
                    </div>)}
                </div>

                {/* Configuration and Audio... (unchanged) */}
                <h3 style={styles.h3}>Configuration</h3>
                <div style={styles.configContainer}>
                    <div style={styles.configRow}>
                        <div style={styles.configItem}><label>Title Screen Duration (s)</label><input type="number" value={titleTime} onChange={e => setTitleTime(handleNumberChange(e.target.value))} style={styles.input} /></div>
                        <div style={styles.configItem}><label>Controls Screen Duration (s)</label><input type="number" value={controlsTime} onChange={e => setControlsTime(handleNumberChange(e.target.value))} style={styles.input} /></div>
                    </div>
                </div>
                <h3 style={styles.h3}>Audio Configuration</h3>
                <div style={styles.configContainer}>
                    <div style={styles.configItem}><label>UI Sound Pack</label><select style={{...styles.input, backgroundColor: '#e9ecef'}} disabled><option>Default Pack (Coming Soon)</option></select></div>
                    <div style={styles.configRow}>
                        <div style={styles.configItem}><label>Main Background Music</label><select value={musicId} onChange={e => setMusicId(e.target.value)} style={styles.input}>{MACROGAME_MUSIC_LIBRARY.map(track => <option key={track.id} value={track.id}>{track.name}</option>)}</select></div>
                        <div style={{...styles.configItem, justifyContent: 'flex-end'}}><button type="button" onClick={handlePreviewMusic} style={{...styles.input, ...styles.secondaryButton, height: 'auto' }}>{isPreviewPlaying ? 'Stop Preview' : 'Preview'}</button></div>
                    </div>
                    <div style={styles.configItem}><label>Background Music Settings</label><div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[ { key: 'intro', label: 'Intro Screen', enabled: introScreen.enabled }, ...flow.map((item, index) => ({ key: `flow_${index}`, label: `Microgame ${index + 1}: ${item.baseGame.name}`, enabled: true })), { key: 'promo', label: 'Promo Screen', enabled: promoScreen.enabled }, { key: 'conversion', label: 'Conversion Screen', enabled: !!conversionScreenId } ].map(item => item.enabled && ( <div key={item.key} style={{display: 'flex', alignItems: 'center', gap: '1rem'}}> <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1}}> <input type="checkbox" checked={audioConfig[item.key]?.playMusic ?? true} onChange={(e) => handleAudioConfigChange(item.key, { playMusic: e.target.checked })} /> Play music on: <strong>{item.label}</strong> </label> <select value={audioConfig[item.key]?.musicId || musicId} onChange={(e) => handleAudioConfigChange(item.key, { musicId: e.target.value })} style={styles.input} disabled={!(audioConfig[item.key]?.playMusic ?? true)} > {MACROGAME_MUSIC_LIBRARY.map(track => <option key={track.id} value={track.id}>{track.name}</option>)} </select> </div> ))}</div></div>
                </div>

                <div style={{...styles.managerHeader, borderTop: '1px solid #ccc', marginTop: '2rem', paddingTop: '1.5rem'}}>
                    <button onClick={handlePreview} style={styles.secondaryButton}>Preview Current Settings</button>
                    <div>
                        {!initialData.id && (<button onClick={handleSaveClick} style={styles.createButton} disabled={isSaving}>{saveButtonText}</button>)}
                    </div>
                </div>
                <button id="macrogame-form-save-button" onClick={handleSaveClick} style={{display: 'none'}} disabled={isSaving} />
            </div>
        </>
    );
};