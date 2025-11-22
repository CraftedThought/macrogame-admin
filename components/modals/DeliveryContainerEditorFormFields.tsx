/* src/components/modals/DeliveryContainerEditorFormFields.tsx */

import React from 'react';
import { notifications } from '../../utils/notifications';
import { styles } from '../../App.styles';
// --- REFACTOR: Import new types ---
import {
    DeliveryContainer,
    Macrogame,
    SkinConfig,
    SkinContentBlock
} from '../../types';
import { UI_SKINS } from '../../constants';
import { useData } from '../../hooks/useData';
import { hasMacrogameIssues, generateUUID } from '../../utils/helpers';
import { ContentBlockEditor } from '../forms/ContentBlockEditor';

// --- NEW/UPDATED: Interface now accepts all state and setters as props ---
interface DeliveryContainerEditorFormFieldsProps {
    // Parent Context
    containerId: string;
    onFormSave: (containerId: string, dataToUpdate: { macrogameId: string, macrogameName: string }) => Promise<void>;
    macrogames: Macrogame[];

    // General State (Passed from Modal)
    name: string; setName: (name: string) => void;
    deliveryMethod: 'popup_modal' | 'on_page_section' | 'new_webpage'; setDeliveryMethod: (method: string) => void;
    macrogameId: string; setMacrogameId: (id: string) => void;
    skinId: string; setSkinId: (id: string) => void;

    // Skin Config State (Passed from Modal)
    skinConfig: SkinConfig; setSkinConfig: (config: SkinConfig) => void;
}

// --- NEW: Helper component for a styled form section (Unchanged) ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={styles.configSection}>
        <h4 style={{ ...styles.h4, marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
            {title}
        </h4>
        {children}
    </div>
);

// --- NEW: Helper component for a color picker input (Unchanged) ---
const ColorPicker: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div style={{ ...styles.configItem, flex: '1 1 30%' }}>
        <label>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ width: '40px', height: '40px', padding: '0.25rem', border: 'none', borderRadius: '4px' }}
            />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="#1c1e21"
            />
        </div>
    </div>
);


// --- REFACTOR: Component signature and logic now use props ---
export const DeliveryContainerEditorFormFields: React.FC<DeliveryContainerEditorFormFieldsProps> = ({
    containerId,
    onFormSave,
    macrogames,
    name, setName,
    deliveryMethod, setDeliveryMethod,
    macrogameId, setMacrogameId,
    skinId, setSkinId,
    skinConfig, setSkinConfig,
}) => {
    const { allMicrogames } = useData();

    // --- REFACTOR: Internal helper functions modified to use setSkinConfig prop ---
    
    /**
     * Updates a top-level key in the skinConfig
     */
    const handleConfigChange = <K extends keyof SkinConfig>(key: K, value: SkinConfig[K]) => {
        setSkinConfig(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    /**
     * Updates a nested key in the skinConfig.header
     */
    const handleHeaderChange = <K extends keyof SkinConfig['header']>(key: K, value: SkinConfig['header'][K]) => {
        setSkinConfig(prev => ({
            ...prev,
            header: {
                ...prev.header,
                [key]: value,
            },
        }));
    };

    /**
     * Updates a nested key in the skinConfig.styling
     */
    const handleStylingChange = <K extends keyof SkinConfig['styling']>(key: K, value: SkinConfig['styling'][K]) => {
        setSkinConfig(prev => ({
            ...prev,
            styling: {
                ...prev.styling,
                [key]: value,
            },
        }));
    };

    /**
     * Adds a new, empty content block
     */
    const addContentBlock = (position: 'above' | 'below') => {
        const newBlock: SkinContentBlock = {
            id: generateUUID(),
            position,
            header: '',
            subheader: '',
            body: '',
        };
        handleConfigChange('contentBlocks', [...(skinConfig.contentBlocks || []), newBlock]);
    };

    /**
     * Updates a specific field within a specific content block
     */
    const updateContentBlock = (id: string, field: keyof Omit<SkinContentBlock, 'id' | 'position'>, value: string) => {
        setSkinConfig(prev => ({
            ...prev,
            contentBlocks: (prev.contentBlocks || []).map(block =>
                block.id === id ? { ...block, [field]: value } : block
            ),
        }));
    };

    /**
     * Removes a content block by its ID
     */
    const removeContentBlock = (id: string) => {
        const newBlocks = (skinConfig.contentBlocks || []).filter(block => block.id !== id);
        handleConfigChange('contentBlocks', newBlocks);
    };

    // --- Helper for styling that uses numeric or string values ---
    const handleUnitChange = <K extends keyof SkinConfig['styling']>(key: K, value: string | number) => {
        setSkinConfig(prev => ({
            ...prev,
            styling: {
                ...prev.styling,
                [key]: value,
            },
        }));
    };

    // --- END REFACTORED HELPERS ---

    // --- REFACTOR: handleSave function is replaced by a simple trigger ---
    const handleSave = () => {
        if (!containerId) return;
        if (!macrogameId) {
            notifications.error('Please select a macrogame for the container.');
            return;
        }
        
        const selectedMacrogame = macrogames.find(mg => mg.id === macrogameId);
        
        // --- NOTE: Renaming logic is now handled in the parent modal's onFormSave callback ---
        
        // We only pass the minimal data needed back to the parent to execute the save logic
        onFormSave(containerId, { 
            macrogameId, 
            macrogameName: selectedMacrogame?.name || '',
        });
    };
    // --- END REFACTORED handleSave ---

    // --- Derived state (Unchanged logic) ---
    const selectedMacrogame = macrogames.find(m => m.id === macrogameId);
    const isCurrentSelectionInvalid = selectedMacrogame
        ? hasMacrogameIssues(selectedMacrogame, allMicrogames)
        : !selectedMacrogame && !!containerId;

    const macrogameSelectStyle = isCurrentSelectionInvalid
        ? { ...styles.input, ...styles.inputAlert }
        : styles.input;

    return (
        <>
            <div>
                {/* --- 1. GENERAL SETTINGS --- */}
                <FormSection title="General Settings">
                    <div style={styles.configItem}>
                        <label>Container Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} style={styles.input} />
                    </div>

                    <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                        <label>Container Type</label>
                        {/* NOTE: setDeliveryMethod is passed but input is disabled */}
                        <select value={deliveryMethod} style={{ ...styles.input, backgroundColor: '#f0f2f5' }} disabled>
                            <option value="popup_modal">Popup Modal</option>
                            <option value="on_page_section">On-Page Section (Coming Soon)</option>
                            <option value="new_webpage">New Webpage (Coming Soon)</option>
                        </select>
                    </div>

                    <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                        <label>Macrogame</label>
                        <select value={macrogameId} onChange={e => setMacrogameId(e.target.value)} style={macrogameSelectStyle}>
                            <option value="">Select a macrogame...</option>
                            {macrogames.map(game => {
                                const hasIssues = hasMacrogameIssues(game, allMicrogames);
                                const isDisabled = hasIssues && game.id !== macrogameId;
                                return (<option key={game.id} value={game.id} disabled={isDisabled} style={{ color: hasIssues ? '#999' : 'inherit' }}>{hasIssues ? '⚠️ ' : ''}{game.name}</option>);
                            })}
                        </select>
                    </div>
                    <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                        <label>UI Skin</label>
                        <select value={skinId} onChange={e => { setSkinId(e.target.value); setSkinConfig(prev => ({ ...prev, header: { ...prev.header, title: '' } })) }} style={styles.input}>
                            <option value="">Select a UI Skin...</option>
                            {/* We filter out 'barebones' as it's not a valid *selection* */}
                            {UI_SKINS.filter(s => s.id !== 'barebones').map(skin => <option key={skin.id} value={skin.id}>{skin.name}</option>)}
                        </select>
                    </div>
                </FormSection>

                {/* --- 2. POPUP CUSTOMIZATION (V1 BUILDER) --- */}
                {/* This UI only appears if the correct skin is selected */}
                {skinId === 'configurable-popup' && (
                    <>
                        <FormSection title="Popup Header">
                            <div style={styles.configItem}>
                                <label>Title</label>
                                <input
                                    type="text"
                                    // Limit title to 25 characters to prevent wrapping issues on smaller modals
                                    maxLength={25}
                                    value={skinConfig.header?.title || ''}
                                    onChange={e => handleHeaderChange('title', e.target.value)}
                                    style={styles.input}
                                    placeholder="e.g., Special Offer!"
                                />
                                <p style={styles.descriptionText}>Max 25 characters to maintain single-line layout.</p>
                            </div>
                            <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                                <label>Header Text Color</label>
                                <ColorPicker
                                    label="Header Text Color"
                                    value={skinConfig.header?.textColor || '#FFFFFF'}
                                    onChange={value => handleHeaderChange('textColor', value)}
                                />
                            </div>
                        </FormSection>
                        
                        <FormSection title="Popup Content Blocks">
                            <p style={styles.descriptionText}>Add text blocks above or below the game area.</p>
                            {(skinConfig.contentBlocks || [])
                                .filter(b => b.position === 'above')
                                .map(block => (
                                    <ContentBlockEditor key={block.id} block={block} updateBlock={updateContentBlock} removeBlock={removeContentBlock} />
                                ))}
                            <button type="button" onClick={() => addContentBlock('above')} style={{...styles.secondaryButton, marginTop: '0.5rem'}}>
                                + Add Block (Above Game)
                            </button>
                            
                            <div style={{...styles.configItem, textAlign: 'center', margin: '1rem 0', color: '#888', fontWeight: 'bold'}}>
                                --- 16:9 Game Area ---
                            </div>
                            
                            {(skinConfig.contentBlocks || [])
                                .filter(b => b.position === 'below')
                                .map(block => (
                                    <ContentBlockEditor key={block.id} block={block} updateBlock={updateContentBlock} removeBlock={removeContentBlock} />
                                ))}
                            <button type="button" onClick={() => addContentBlock('below')} style={{...styles.secondaryButton, marginTop: '0.5rem'}}>
                                + Add Block (Below Game)
                            </button>
                        </FormSection>
                        
                        <FormSection title="Popup Controls">
                            <div style={styles.configItem}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={skinConfig.showExitButton}
                                        onChange={e => handleConfigChange('showExitButton', e.target.checked)}
                                    />
                                    Show Exit (Close) Button
                                </label>
                            </div>
                            <div style={{ ...styles.configItem, marginTop: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={skinConfig.showMuteButton}
                                        onChange={e => handleConfigChange('showMuteButton', e.target.checked)}
                                    />
                                    Show Mute/Unmute Button
                                </label>
                            </div>
                        </FormSection>

                        <FormSection title="Popup Styling">
                            {/* --- Size (Width) --- */}
                            <div style={styles.configItem}>
                                <label>Popup Width</label>
                                <select 
                                    value={skinConfig.styling?.popupWidth || 'medium'}
                                    onChange={e => handleUnitChange('popupWidth', e.target.value)} 
                                    style={styles.input}
                                >
                                    <option value="small">Small (450px)</option>
                                    <option value="medium">Medium (650px) [cite: 1, 19]</option>
                                    <option value="large">Large (800px)</option>
                                </select>
                                <p style={styles.descriptionText}>Controls the maximum width of the popup container. </p>
                            </div>
                            
                            {/* --- Corner Radius --- */}
                            <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                                <label>Border Radius (px)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={skinConfig.styling?.borderRadius || 8}
                                    onChange={e => handleUnitChange('borderRadius', Number(e.target.value))}
                                    style={styles.input}
                                    placeholder="8"
                                />
                                <p style={styles.descriptionText}>Applies to the container and internal elements. </p>
                            </div>
                            
                            {/* --- Box Shadow --- */}
                            <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                                <label>Box Shadow Opacity (%)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    value={skinConfig.styling?.boxShadowStrength || 3}
                                    onChange={e => handleUnitChange('boxShadowStrength', Number(e.target.value))}
                                    style={{ width: '100%', marginTop: '0.5rem' }}
                                />
                                <p style={styles.descriptionText}>0% = None, 100% = Full Opacity.</p>
                            </div>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
                                <ColorPicker
                                    label="Container Background"
                                    value={skinConfig.styling?.backgroundColor || '#1c1e21'}
                                    onChange={value => handleStylingChange('backgroundColor', value)}
                                />
                                <ColorPicker
                                    label="Header Background"
                                    value={skinConfig.styling?.headerBackground || '#2a2d30'}
                                    onChange={value => handleStylingChange('headerBackground', value)}
                                />
                                <ColorPicker
                                    label="Content Block Background"
                                    value={skinConfig.styling?.contentBackground || '#2a2d30'}
                                    onChange={value => handleStylingChange('contentBackground', value)}
                                />
                            </div>
                        </FormSection>
                    </>
                )}
            </div>
            
            {/* This button is hidden but allows the external footer to trigger form submission */}
            <button id="container-editor-save-button" type="button" onClick={handleSave} style={{ display: 'none' }} />
        </>
    );
};