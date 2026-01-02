/* src/components/forms/ConversionMethodFormFields.tsx */

import React from 'react';
import { useFieldArray, Control, UseFormRegister, UseFormWatch, Controller, UseFormSetValue } from 'react-hook-form';
import { styles } from '../../App.styles';
import { SimpleTextEditor } from './SimpleTextEditor';
import { MaskConfigurationForm } from './MaskConfigurationForm';

interface ConversionMethodFormFieldsProps {
    control: Control<any>;
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;
    getValues: UseFormGetValues<any>;
    previewWidth?: number;
    prefix?: string;
    onRefreshPreview?: () => void;
    activeTheme?: 'dark' | 'light';
    previewOrientation?: 'landscape' | 'portrait';
    hideTypeSelector?: boolean;
    hideCouponConfiguration?: boolean;
}

// Helper: Simple Color Picker for this form
const ColorInput: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
    <div style={styles.configItem}>
        <label>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="#ffffff"
            />
        </div>
    </div>
);

// Helper: Adjust Hex Brightness (percent: -100 to 100)
const adjustBrightness = (hex: string, percent: number) => {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    if (percent > 0) {
        // Lighten
        r += (255 - r) * (percent / 100);
        g += (255 - g) * (percent / 100);
        b += (255 - b) * (percent / 100);
    } else {
        // Darken
        const adjustment = 1 + (percent / 100); // e.g., 1 + (-0.5) = 0.5
        r *= adjustment;
        g *= adjustment;
        b *= adjustment;
    }

    const rr = Math.round(Math.min(Math.max(0, r), 255)).toString(16).padStart(2, '0');
    const gg = Math.round(Math.min(Math.max(0, g), 255)).toString(16).padStart(2, '0');
    const bb = Math.round(Math.min(Math.max(0, b), 255)).toString(16).padStart(2, '0');

    return `#${rr}${gg}${bb}`;
};

export const ConversionMethodFormFields: React.FC<ConversionMethodFormFieldsProps> = ({ 
    control, 
    register, 
    watch, 
    setValue,
    getValues,
    // Destructure new prop (default to 100 if missing)
    previewWidth = 100,
    onRefreshPreview,
    activeTheme = 'dark',
    prefix = '',
    previewOrientation = 'landscape',
    hideTypeSelector = false,
    hideCouponConfiguration = false,
}) => {
    const getFieldName = (name: string) => prefix ? `${prefix}.${name}` : name;
    const selectedType = watch(getFieldName('type'));
    const revealScope = watch(getFieldName('revealScope')); // <--- Watch Scope
    const backgroundColor = watch(getFieldName('style.backgroundColor')) || '#1a1a1a'; // Default for preview context

    // --- Memory for removed subheadlines (Keyed by type) ---
    const lastSubheadlines = React.useRef<Record<string, string>>({});
    // --- Memory for removed headlines (Keyed by type) ---
    const lastHeadlines = React.useRef<Record<string, string>>({});

    // Dynamic fields for forms/social
    const fieldsName = getFieldName('fields');
    const linksName = getFieldName('links');
    // Rename 'remove' to '_removeFormField' to free up the name for our custom function
    const { fields: formFields, append: appendFormField, remove: _removeFormField, move: moveFormField, replace: replaceFormFields } = useFieldArray({ control, name: fieldsName });
    const { fields: socialLinks, append: appendSocialLink, remove: removeSocialLink } = useFieldArray({ control, name: linksName });
    const [iconSizeError, setIconSizeError] = React.useState<string | null>(null);

    // --- Helper: Count fields per row for validation ---
    // UPDATED: Now uses watch(fieldsName) to ensure we validate against the LIVE state,
    // preventing the "stale data" issue where it let you add a 3rd field to a full row.
    const getFieldsInRow = (rowNum: number) => {
        const currentFields = watch(fieldsName) || [];
        return currentFields.filter((f: any, index: number) => {
            // Ensure we fallback to (index + 1) if row is undefined, just like the rest of the app
            const r = f.row !== undefined ? f.row : (index + 1);
            return Number(r) === rowNum;
        }).length;
    };

    // Calculate Max Columns based on the PASSED Slider Width
    const getMaxColumns = () => {
        const w = previewWidth;
        if (w >= 100) return 4;
        if (w >= 75) return 3;
        if (w >= 50) return 2;
        return 1; 
    };

    // --- Helper: Get Next Available Row Number ---
    const getNextRow = () => {
        if (formFields.length === 0) return 1;
        // Find the highest row number currently assigned
        const maxRow = Math.max(...formFields.map((f: any) => f.row || 1));
        return maxRow + 1;
    };

    // --- Helper: Smart Move (Swaps Row Properties) ---
    const handleSmartMove = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= formFields.length) return;

        // 1. Get the current 'row' values for both items
        // We use watch to ensure we get the latest value from the form state
        const currentRow = watch(`${fieldsName}.${index}.row`) || (index + 1);
        const targetRow = watch(`${fieldsName}.${targetIndex}.row`) || (targetIndex + 1);

        // 2. Swap the Row assignments
        // This ensures the moved item adopts the visual position of the target
        setValue(`${fieldsName}.${index}.row`, targetRow);
        setValue(`${fieldsName}.${targetIndex}.row`, currentRow);

        // 3. Perform the array swap
        moveFormField(index, targetIndex);
    };

    // --- Helper: Handle Row Change, Compact Gaps, AND Sort List ---
    const handleRowChange = (index: number, newRowStr: string) => {
        const newRow = Number(newRowStr);
        // Get the current state of all fields (raw values)
        const currentFields = watch(fieldsName); 
        
        // 1. Create a proposed state where the specific field has the new row
        const proposedFields = currentFields.map((f: any, i: number) => ({
            ...f,
            row: i === index ? newRow : (f.row || (i + 1))
        }));

        // 2. Identify unique rows to "close the gaps" (e.g. map rows 1,3 -> 1,2)
        const uniqueRows = Array.from(new Set(proposedFields.map((f: any) => f.row)))
            .sort((a: any, b: any) => a - b);
        
        const rowMapping: Record<number, number> = {};
        uniqueRows.forEach((r, i) => {
            rowMapping[r as number] = i + 1;
        });

        // 3. Apply the gap-closing updates
        const updatedFields = proposedFields.map((f: any) => ({
            ...f,
            row: rowMapping[f.row]
        }));

        // 4. SORT the fields so they appear in correct Row order in the Builder
        updatedFields.sort((a: any, b: any) => a.row - b.row);

        // 5. Replace the entire list to reflect the new visual order
        replaceFormFields(updatedFields);
    };

    // Smart Remove: Compacts rows if a row becomes empty
    const removeFormField = (indexToRemove: number) => {
        // 1. Get current state
        const currentFields = getValues(fieldsName) || [];
        const fieldToRemove = currentFields[indexToRemove];
        
        if (!fieldToRemove) return;

        // 2. Identify the row of the deleted item
        const rowOfDeleted = fieldToRemove.row || (indexToRemove + 1);

        // 3. Check if any OTHER fields are in this specific row
        const isRowEmptyNow = !currentFields.some((f: any, idx: number) => 
            idx !== indexToRemove && (f.row || (idx + 1)) === rowOfDeleted
        );

        let newFields = [...currentFields];
        
        // 4. Remove the item
        newFields.splice(indexToRemove, 1);

        // 5. If the row is now empty, shift all HIGHER rows down by 1
        if (isRowEmptyNow) {
            newFields = newFields.map((f: any) => {
                const fRow = f.row || 1; 
                if (fRow > rowOfDeleted) {
                    return { ...f, row: fRow - 1 };
                }
                return f;
            });
        }

        // 6. Update the form
        replaceFormFields(newFields);
    };

    // --- Auto-Reflow Effect ---
    // When the preview width changes (via slider), ensure fields strictly adhere to the new column limits.
    React.useEffect(() => {
        const maxCols = getMaxColumns(); // Uses the passed previewWidth
        const currentFields = getValues(fieldsName);
        
        if (!currentFields || currentFields.length === 0) return;

        // 1. Optimization: Check if we actually NEED to reflow
        let needsReflow = false;
        const rowCounts: Record<number, number> = {};
        currentFields.forEach((f: any, i: number) => {
            const r = f.row || (i + 1);
            rowCounts[r] = (rowCounts[r] || 0) + 1;
            if (rowCounts[r] > maxCols) needsReflow = true;
        });

        if (!needsReflow) return;

        // 2. Perform Reflow (Re-organize rows)
        const rows: Record<number, any[]> = {};
        currentFields.forEach((f: any, i: number) => {
            const r = f.row || (i + 1);
            if (!rows[r]) rows[r] = [];
            rows[r].push(f);
        });

        const sortedRows = Object.keys(rows).map(Number).sort((a,b) => a - b);
        let rowOffset = 0;
        const newFieldList: any[] = [];

        sortedRows.forEach(originalRowKey => {
            const items = rows[originalRowKey];
            const baseTargetRow = originalRowKey + rowOffset;
            
            // Split items into chunks that fit the new maxCols
            for (let i = 0; i < items.length; i += maxCols) {
                const chunk = items.slice(i, i + maxCols);
                const chunkIndex = i / maxCols;
                
                // If we split a row, subsequent rows must be pushed down
                if (chunkIndex > 0) {
                    rowOffset++;
                }
                
                const targetRow = baseTargetRow + chunkIndex;
                
                chunk.forEach(item => {
                    newFieldList.push({ ...item, row: targetRow });
                });
            }
        });

        replaceFormFields(newFieldList);

    }, [previewWidth]);

    return (
        <div>
            <div style={styles.configRow}>
                <div style={styles.configItem}>
                    <label>Internal Name</label>
                    <input type="text" placeholder="e.g., Summer Sale Coupon" {...register(getFieldName("name"))} style={styles.input} />
                </div>
                {!hideTypeSelector && (
                    <div style={styles.configItem}>
                        <label>Method Type</label>
                        <select {...register(getFieldName("type"))} style={styles.input}>
                            <option value="coupon_display">Coupon Display</option>
                            <option value="email_capture">Email Capture</option>
                            <option value="link_redirect">Link Redirect</option>
                            <option value="form_submit">Form Submit</option>
                            <option value="social_follow">Social Follow</option>
                        </select>
                    </div>
                )}
            </div>

            {/* 2. LINK REDIRECT SPECIFIC (Moved to Top) */}
            {selectedType === 'link_redirect' && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* A. DESTINATION */}
                    <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Destination</h4>
                        <div style={styles.configItem}>
                            <label>Destination URL</label>
                            <input type="url" placeholder="https://..." {...register(getFieldName("url"))} style={styles.input} />
                        </div>
                        <div style={styles.configItem}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input type="checkbox" {...register(getFieldName("utmEnabled"))} /> 
                                <span><strong>Auto-Append UTM Parameters</strong></span>
                            </label>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                                Automatically attach <code>utm_source</code>, <code>utm_campaign</code>, etc.
                            </p>
                        </div>
                    </div>

                    {/* B. BEHAVIOR */}
                    <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Behavior</h4>
                        
                        {/* Redirect Mode Radio */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Redirect Mode</label>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        value="manual" 
                                        {...register(getFieldName("redirectType"))} 
                                        onChange={(e) => {
                                            register(getFieldName("redirectType")).onChange(e); 
                                            setValue(getFieldName("headline"), '<h2 style="text-align: center;">Visit This Link</h2>');
                                            setValue(getFieldName("subheadline"), '<p style="text-align: center;">Click the button below to be redirected to the destination.</p>');
                                        }}
                                    />
                                    Manual Redirect (Button)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        value="auto" 
                                        {...register(getFieldName("redirectType"))}
                                        onChange={(e) => {
                                            register(getFieldName("redirectType")).onChange(e); 
                                            setValue(getFieldName("headline"), '<h2 style="text-align: center;">Redirecting...</h2>');
                                            setValue(getFieldName("subheadline"), '<p style="text-align: center;">Please wait while we send you to your destination.</p>');
                                        }}
                                    />
                                    Auto-Redirect (Timer)
                                </label>
                            </div>
                        </div>

                        {/* --- MANUAL MODE SETTINGS --- */}
                        {watch(getFieldName("redirectType")) !== 'auto' && (
                            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                                <h5 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Button Settings</h5>
                                <div style={styles.configItem}>
                                    <label>Button Text</label>
                                    <input type="text" {...register(getFieldName("buttonText"))} style={styles.input} placeholder="Continue" />
                                </div>
                                <h5 style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>Dark Theme Colors</h5>
                                <div style={{ ...styles.configRow, marginTop: '0.5rem' }}>
                                    <Controller name={getFieldName("style.buttonColor")} control={control} defaultValue="#1532c1" render={({ field }) => (<ColorInput label="Button Color" value={field.value ?? '#1532c1'} onChange={field.onChange} />)} />
                                    <Controller name={getFieldName("style.buttonTextColor")} control={control} defaultValue="#ffffff" render={({ field }) => (<ColorInput label="Text Color" value={field.value ?? '#ffffff'} onChange={field.onChange} />)} />
                                </div>
                                <h5 style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>Light Theme Colors</h5>
                                <div style={{ ...styles.configRow, marginTop: '0.5rem' }}>
                                    <Controller name={getFieldName("lightStyle.buttonColor")} control={control} defaultValue="#1532c1" render={({ field }) => (<ColorInput label="Button Color" value={field.value ?? '#1532c1'} onChange={field.onChange} />)} />
                                    <Controller name={getFieldName("lightStyle.buttonTextColor")} control={control} defaultValue="#ffffff" render={({ field }) => (<ColorInput label="Text Color" value={field.value ?? '#ffffff'} onChange={field.onChange} />)} />
                                </div>
                            </div>
                        )}

                        {/* --- AUTO MODE SETTINGS --- */}
                        {watch(getFieldName("redirectType")) === 'auto' && (
                            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                                <h5 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Timer Settings</h5>
                                <div style={styles.configItem}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label style={{ margin: 0 }}>Delay (Seconds)</label>
                                        <button 
                                            type="button" onClick={onRefreshPreview} title="Reset Timer" 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <Controller
                                                name={getFieldName("autoRedirectDelay")}
                                                control={control}
                                                defaultValue={5}
                                                render={({ field }) => (
                                                    <input type="number" min="0" max="60" value={field.value ?? ''} 
                                                        onChange={e => { const val = e.target.value; if(val==='') field.onChange(''); else { const num=Number(val); if(!isNaN(num) && num>=0 && num<=60) field.onChange(num); }}} 
                                                        style={styles.input} 
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* TIMER COLORS */}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <Controller
                                            name={getFieldName("style.autoCountdownColor")}
                                            control={control}
                                            defaultValue="#ffffff"
                                            render={({ field }) => (
                                                <ColorInput label="Timer Color (Dark)" value={field.value ?? '#ffffff'} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <Controller
                                            name={getFieldName("lightStyle.autoCountdownColor")}
                                            control={control}
                                            defaultValue="#000000"
                                            render={({ field }) => (
                                                <ColorInput label="Timer Color (Light)" value={field.value ?? '#000000'} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: '1.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="checkbox" {...register(getFieldName("showCountdown"))} />
                                        Show Visual Countdown
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* TARGET WINDOW */}
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target Window</label>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" value="true" {...register(getFieldName("openInNewTab"))} onChange={() => setValue(getFieldName("openInNewTab"), true)} checked={String(watch(getFieldName("openInNewTab"))) === 'true'} />
                                    New Tab
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" value="false" {...register(getFieldName("openInNewTab"))} onChange={() => setValue(getFieldName("openInNewTab"), false)} checked={String(watch(getFieldName("openInNewTab"))) === 'false'} />
                                    Same Tab
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* C. LAYOUT & SIZING */}
                    <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Layout & Sizing</h4>
                        <div style={styles.configRow}>
                            <div style={styles.configItem}>
                                <label>Vertical Spacing (px)</label>
                                <Controller
                                    name={getFieldName("style.spacing")}
                                    control={control}
                                    defaultValue={20}
                                    render={({ field }) => (
                                        <input type="number" min="0" max="120" value={field.value ?? ''} 
                                            onChange={e => { const val = e.target.value; if(val==='') field.onChange(''); else { const num=Number(val); if(!isNaN(num) && num>=0 && num<=120) field.onChange(num); }}} 
                                            style={styles.input} 
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- RICH TEXT EDITORS: HEADLINE & BODY --- */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: 0, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Content</h4>

                {/* 1. HEADLINE (Heading 1/2) */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Headline
                    </label>
                    <Controller
                        name={getFieldName("headline")}
                        control={control}
                        render={({ field }) => {
                            // Check if content exists (and isn't just an empty paragraph tag)
                            const hasContent = field.value && field.value !== '<p><br></p>';

                            // Logic to determine colors (Shared with Subheadline)
                            let editorBg = '#ffffff';
                            let editorText: string | undefined = undefined;

                            if (selectedType === 'coupon_display') {
                                if (activeTheme === 'light') {
                                    const lightBg = watch(getFieldName('lightStyle.backgroundColor'));
                                    const lightText = watch(getFieldName('lightStyle.textColor'));
                                    editorBg = lightBg || '#f5f5f5';
                                    editorText = lightText || '#000000';
                                } else {
                                    const darkBg = watch(getFieldName('style.backgroundColor'));
                                    editorBg = darkBg || '#1a1a1a';
                                    editorText = '#ffffff'; 
                                }
                            } else {
                                if (activeTheme === 'light') {
                                    editorBg = '#ffffff';
                                    editorText = '#000000';
                                } else {
                                    editorBg = '#080817';
                                    editorText = '#ffffff';
                                }
                            }

                            if (!hasContent) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const savedContent = lastHeadlines.current[selectedType];
                                            if (savedContent) {
                                                field.onChange(savedContent);
                                                return;
                                            }
                                            // Default Text Logic based on Type
                                            let defaultText = '<h2 style="text-align: center;">Headline</h2>';
                                            if (selectedType === 'coupon_display') {
                                                defaultText = '<h2 style="text-align: center;">New Customer Deal</h2>';
                                            } else if (selectedType === 'email_capture') {
                                                defaultText = '<h2 style="text-align: center;">Join Our Community!</h2>';
                                            } else if (selectedType === 'link_redirect') {
                                                defaultText = '<h2 style="text-align: center;">Visit This Link</h2>';
                                            } else if (selectedType === 'form_submit') {
                                                defaultText = '<h2 style="text-align: center;">Submit Your Information</h2>';
                                            } else if (selectedType === 'social_follow') {
                                                defaultText = '<h2 style="text-align: center;">Follow Us</h2>';
                                            }
                                            field.onChange(defaultText);
                                        }}
                                        style={styles.secondaryButton}
                                    >
                                        + Add Headline
                                    </button>
                                );
                            }

                            return (
                                <div style={{ position: 'relative' }}>
                                    <SimpleTextEditor
                                        initialHtml={field.value}
                                        onChange={field.onChange}
                                        backgroundColor={editorBg}
                                        defaultTextColor={editorText}
                                        placeholder="Enter headline..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (field.value) {
                                                lastHeadlines.current[selectedType] = field.value;
                                            }
                                            field.onChange('');
                                        }}
                                        style={{ 
                                            ...styles.deleteButton, 
                                            marginTop: '0.5rem',
                                            fontSize: '0.85rem',
                                            padding: '0.3rem 0.8rem'
                                        }}
                                    >
                                        Remove Headline
                                    </button>
                                </div>
                            );
                        }}
                    />
                </div>

                {/* 2. SUBHEADLINE (Body) */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Body Text / Subheadline
                    </label>
                    <Controller
                        name={getFieldName("subheadline")}
                        control={control}
                        render={({ field }) => {
                            const hasContent = field.value && field.value !== '<p><br></p>';

                            if (!hasContent) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const savedContent = lastSubheadlines.current[selectedType];
                                            if (savedContent) {
                                                field.onChange(savedContent);
                                                return;
                                            }
                                            let defaultText = '<p style="text-align: center;">Enter body text...</p>';
                                            if (selectedType === 'coupon_display') {
                                                defaultText = '<p style="text-align: center;">Enjoy 50% off your first purchase as a new customer! Use the code below at checkout to redeem.</p>';
                                            } else if (selectedType === 'email_capture') {
                                                defaultText = '<p style="text-align: center;">Sign up for exclusive discounts, updates, and insider perks.</p>';
                                            } else if (selectedType === 'link_redirect') {
                                                defaultText = '<p style="text-align: center;">Click the button below to be redirected to the destination.</p>';
                                            } else if (selectedType === 'form_submit') {
                                                defaultText = '<p style="text-align: center;">Submit the required information using the form below.</p>';
                                            } else if (selectedType === 'social_follow') {
                                                defaultText = '<p style="text-align: center;">Stay updated on our socials!</p>';
                                            }

                                            field.onChange(defaultText);
                                        }}
                                        style={styles.secondaryButton}
                                    >
                                        + Add Body Text
                                    </button>
                                );
                            }

                            // Reuse logic for colors
                            let editorBg = '#ffffff';
                            let editorText: string | undefined = undefined;

                            if (selectedType === 'coupon_display') {
                                if (activeTheme === 'light') {
                                    const lightBg = watch(getFieldName('lightStyle.backgroundColor'));
                                    const lightText = watch(getFieldName('lightStyle.textColor'));
                                    editorBg = lightBg || '#f5f5f5';
                                    editorText = lightText || '#000000';
                                } else {
                                    const darkBg = watch(getFieldName('style.backgroundColor'));
                                    editorBg = darkBg || '#1a1a1a';
                                    editorText = '#ffffff'; 
                                }
                            } else {
                                if (activeTheme === 'light') {
                                    editorBg = '#ffffff';
                                    editorText = '#000000';
                                } else {
                                    editorBg = '#080817';
                                    editorText = '#ffffff';
                                }
                            }

                            return (
                                <div style={{ position: 'relative' }}>
                                    <SimpleTextEditor
                                        initialHtml={field.value}
                                        onChange={field.onChange}
                                        backgroundColor={editorBg}
                                        defaultTextColor={editorText}
                                        placeholder="Enter body text..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (field.value) {
                                                lastSubheadlines.current[selectedType] = field.value;
                                            }
                                            field.onChange('');
                                        }}
                                        style={{ 
                                            ...styles.deleteButton, 
                                            marginTop: '0.5rem',
                                            fontSize: '0.85rem',
                                            padding: '0.3rem 0.8rem'
                                        }}
                                    >
                                        Remove Body Content
                                    </button>
                                </div>
                            );
                        }}
                    />
                </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                {selectedType === 'coupon_display' && (
                    <>
                        {/* --- LOOP: Render Styling for Default (Dark) then Light --- */}
                        {['style', 'lightStyle'].map((prefix, index) => {
                            const isDark = prefix === 'style';
                            const title = isDark ? "Dark Theme Styling (Default)" : "Light Theme Styling";
                            const sectionBg = isDark ? '#f0f2f5' : '#ffffff';
                            const sectionBorder = isDark ? '1px solid #ccc' : '1px dashed #ccc';

                            return (
                                <div key={prefix} style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: sectionBg, borderRadius: '8px', border: sectionBorder }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
                                        <h4 style={{ ...styles.h4, margin: 0 }}>{title}</h4>
                                        
                                        {!isDark && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentDark = watch(getFieldName('style'));
                                                    if (!currentDark) return;

                                                    const newStroke = adjustBrightness(currentDark.strokeColor || '#cfc33a', -50);
                                                    const newBg = adjustBrightness(currentDark.backgroundColor || '#1a1a1a', 67);
                                                    
                                                    const lightPrefix = getFieldName('lightStyle');
                                                    setValue(`${lightPrefix}.size`, currentDark.size);
                                                    setValue(`${lightPrefix}.spacing`, currentDark.spacing);
                                                    setValue(`${lightPrefix}.paddingTop`, currentDark.paddingTop);
                                                    setValue(`${lightPrefix}.paddingBottom`, currentDark.paddingBottom);
                                                    setValue(`${lightPrefix}.paddingX`, currentDark.paddingX);
                                                    setValue(`${lightPrefix}.strokeStyle`, currentDark.strokeStyle);
                                                    setValue(`${lightPrefix}.strokeWidth`, currentDark.strokeWidth);
                                                    setValue(`${lightPrefix}.revealAnimation`, currentDark.revealAnimation);
                                                    setValue(`${lightPrefix}.revealBackgroundColor`, currentDark.revealBackgroundColor ?? '#cfc33a');
                                                    setValue(`${lightPrefix}.revealTextColor`, currentDark.revealTextColor ?? '#1c1e21');
                                                    setValue(`${lightPrefix}.boxShadowOpacity`, currentDark.boxShadowOpacity ?? 50);
                                                    setValue(`${lightPrefix}.strokeColor`, newStroke);
                                                    setValue(`${lightPrefix}.backgroundColor`, newBg);
                                                    setValue(`${lightPrefix}.textColor`, '#000000');
                                                }}
                                                style={{ fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: '1px solid #0866ff', color: '#0866ff', borderRadius: '4px', padding: '0.2rem 0.5rem', fontWeight: 'bold' }}
                                            >
                                                ✨ Auto-Generate from Dark
                                            </button>
                                        )}
                                    </div>

                                    {/* 1. Size & Colors */}
                                    <div style={styles.configRow}>
                                        {!isDark && (
                                            <Controller
                                                name={getFieldName(`${prefix}.textColor`)}
                                                control={control}
                                                defaultValue="#000000"
                                                render={({ field }) => (
                                                    <ColorInput label="Text Color" value={field.value ?? '#000000'} onChange={field.onChange} />
                                                )}
                                            />
                                        )}

                                        <Controller
                                            name={getFieldName(`${prefix}.backgroundColor`)}
                                            control={control}
                                            defaultValue={isDark ? "#1a1a1a" : "#f5f5f5"}
                                            render={({ field }) => (
                                                <ColorInput label="Background Color" value={field.value ?? (isDark ? '#1a1a1a' : '#f5f5f5')} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>

                                    {/* 2. Spacing & Shadow */}
                                    <div style={{ ...styles.configRow, marginTop: '1rem' }}>
                                        <div style={styles.configItem}>
                                            <label>Vertical Spacing (px)</label>
                                            <Controller
                                                name={getFieldName(`${prefix}.spacing`)}
                                                control={control}
                                                defaultValue={15}
                                                render={({ field }) => (
                                                    <input 
                                                        type="number" min="0" max="120"
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') field.onChange('');
                                                            else {
                                                                const num = Number(val);
                                                                if (!isNaN(num) && num <= 120 && num >= 0) field.onChange(num);
                                                            }
                                                        }}
                                                        style={styles.input}
                                                        placeholder=""
                                                    />
                                                )}
                                            />
                                        </div>
                                        
                                        <div style={styles.configItem}>
                                            <label>Box Shadow Opacity (%)</label>
                                            <Controller
                                                name={getFieldName(`${prefix}.boxShadowOpacity`)}
                                                control={control}
                                                defaultValue={15}
                                                render={({ field }) => (
                                                    <input 
                                                        type="number" min="0" max="100"
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') field.onChange('');
                                                            else {
                                                                const num = Number(val);
                                                                if (!isNaN(num) && num <= 100 && num >= 0) field.onChange(num);
                                                            }
                                                        }}
                                                        style={styles.input}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* 3. Padding Controls */}
                                    <div style={{ ...styles.configRow, marginTop: '1rem' }}>
                                        <div style={styles.configItem}>
                                            <label>Padding Top (px)</label>
                                            <Controller
                                                name={getFieldName(`${prefix}.paddingTop`)}
                                                control={control}
                                                defaultValue={20}
                                                render={({ field }) => (
                                                    <input 
                                                        type="number" min="0" max="120"
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') field.onChange('');
                                                            else {
                                                                const num = Number(val);
                                                                if (!isNaN(num) && num <= 120 && num >= 0) field.onChange(num);
                                                            }
                                                        }}
                                                        style={styles.input}
                                                        placeholder=""
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div style={styles.configItem}>
                                            <label>Padding Bottom (px)</label>
                                            <Controller
                                                name={getFieldName(`${prefix}.paddingBottom`)}
                                                control={control}
                                                defaultValue={20}
                                                render={({ field }) => (
                                                    <input 
                                                        type="number" min="0" max="120"
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') field.onChange('');
                                                            else {
                                                                const num = Number(val);
                                                                if (!isNaN(num) && num <= 120 && num >= 0) field.onChange(num);
                                                            }
                                                        }}
                                                        style={styles.input}
                                                        placeholder=""
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div style={styles.configItem}>
                                            <label>Padding Sides (px)</label>
                                            <Controller
                                                name={getFieldName(`${prefix}.paddingX`)}
                                                control={control}
                                                defaultValue={20}
                                                render={({ field }) => (
                                                    <input 
                                                        type="number" min="0" max="120"
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') field.onChange('');
                                                            else {
                                                                const num = Number(val);
                                                                if (!isNaN(num) && num <= 120 && num >= 0) field.onChange(num);
                                                            }
                                                        }}
                                                        style={styles.input}
                                                        placeholder=""
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* 4. Stroke Controls */}
                                    <div style={{ ...styles.configRow, marginTop: '1rem' }}>
                                        <div style={styles.configItem}>
                                            <label>Stroke Style</label>
                                            <select {...register(getFieldName(`${prefix}.strokeStyle`))} style={styles.input} defaultValue="dashed">
                                                <option value="dashed">Dashed</option>
                                                <option value="solid">Solid</option>
                                                <option value="dotted">Dotted</option>
                                                <option value="none">None</option>
                                            </select>
                                        </div>
                                        <div style={styles.configItem}>
                                            <label>Stroke Width (px)</label>
                                            <Controller
                                                name={getFieldName(`${prefix}.strokeWidth`)}
                                                control={control}
                                                defaultValue={2}
                                                render={({ field }) => (
                                                    <input 
                                                        type="number" min="0" max="50"
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') field.onChange('');
                                                            else {
                                                                const num = Number(val);
                                                                if (!isNaN(num) && num <= 50 && num >= 0) field.onChange(num);
                                                            }
                                                        }}
                                                        style={styles.input}
                                                        placeholder=""
                                                    />
                                                )}
                                            />
                                        </div>
                                        <Controller
                                            name={getFieldName(`${prefix}.strokeColor`)}
                                            control={control}
                                            defaultValue={isDark ? "#cfc33a" : "#333333"}
                                            render={({ field }) => (
                                                <ColorInput label="Stroke Color" value={field.value ?? (isDark ? '#cfc33a' : '#333333')} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>
                                    
                                </div>
                            );
                        })}

                        {/* --- CONDITIONAL: Coupon Logic & Reveal (Hide if Hoisted) --- */}
                        {!hideCouponConfiguration && (
                            <>
                                <h4 style={{ ...styles.h4, marginTop: '2rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Coupon Code & Logic</h4>
                        
                                <div style={styles.configRow}>
                                    <div style={styles.configItem}>
                                        <label>Coupon Type</label>
                                        <select {...register(getFieldName("codeType"))} style={styles.input}>
                                            <option value="static">Static Code</option>
                                            <option value="dynamic" disabled>Dynamic (Coming Soon)</option>
                                        </select>
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Static Code</label>
                                        <input 
                                            type="text" 
                                            placeholder="" 
                                            {...register(getFieldName("staticCode"), {
                                                onChange: (e) => {
                                                    // Force Uppercase in Data
                                                    setValue(getFieldName("staticCode"), e.target.value.toUpperCase());
                                                }
                                            })} 
                                            style={{ ...styles.input, textTransform: 'uppercase' }} // Visual Uppercase
                                        />
                                    </div>
                                </div>
                                <div style={{...styles.configRow, marginTop: '1rem'}}>
                                    <div style={styles.configItem}>
                                        <label>Discount Type</label>
                                        <select {...register(getFieldName("discountType"))} style={styles.input}>
                                            <option value="percentage">% Percentage</option>
                                            <option value="fixed_amount">$ Fixed</option>
                                        </select>
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Value</label>
                                        <Controller
                                            name={getFieldName("discountValue")}
                                            control={control}
                                            render={({ field }) => {
                                                const type = watch(getFieldName("discountType"));
                                                const max = type === 'percentage' ? 100 : undefined;
                                                return (
                                                    <input 
                                                        type="number" step="0.01" 
                                                        min="0" max={max}
                                                        value={field.value ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') field.onChange('');
                                                            else {
                                                                const num = Number(val);
                                                                // Apply strict max if percentage, otherwise open (or add common sense cap for $)
                                                                if (max && num > max) return;
                                                                if (num < 0) return;
                                                                field.onChange(num);
                                                            }
                                                        }}
                                                        style={styles.input} 
                                                    />
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                        
                                {/* Reveal Settings Block (Standard, keeping brief) */}
                                <div style={{ marginTop: '1rem', backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', width: '100%' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
                                            <input 
                                                type="checkbox" 
                                                {...register(getFieldName("clickToReveal"), {
                                                    onChange: (e) => {
                                                        if (e.target.checked) {
                                                            // 1. Text & Icon Defaults
                                                            setValue(getFieldName("maskConfig.headline"), "Click to Reveal the Coupon Code");
                                                            setValue(getFieldName("maskConfig.showIcon"), true);
                                                            
                                                            // 2. Color Defaults based on Scope
                                                            // We must read the current scope value to decide
                                                            const currentScope = getValues(getFieldName("revealScope"));
                                                
                                                            if (currentScope === 'code_only') {
                                                                // Dark Theme Defaults (Yellow/Black)
                                                                setValue(getFieldName("maskConfig.style.backgroundColor"), "#cfc33a");
                                                                setValue(getFieldName("maskConfig.style.textColor"), "#000000");
                                                    
                                                                // Light Theme Defaults (Dark/White)
                                                                setValue(getFieldName("maskConfig.lightStyle.backgroundColor"), "#1a1a1a");
                                                                setValue(getFieldName("maskConfig.lightStyle.textColor"), "#ffffff");
                                                            } else {
                                                                // Full Reveal Defaults (Standard Dark/White)
                                                                setValue(getFieldName("maskConfig.style.backgroundColor"), "#1a1a1a");
                                                                setValue(getFieldName("maskConfig.style.textColor"), "#ffffff");
                                                                // Reset Light Theme to defaults if needed, or leave empty to inherit structure
                                                            }
                                                        }
                                                    }
                                                })} 
                                            />
                                            <span style={{ fontWeight: 'bold' }}>Enable Click to Reveal</span>
                                        </label>
                                        <button type="button" onClick={onRefreshPreview} title="Reset Preview State" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                        </button>
                                    </div>
                                    {watch(getFieldName("clickToReveal")) && (
                                        <div style={{ marginTop: '1rem', backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '4px' }}>
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <div style={styles.configItem}>
                                                    <label>Reveal Scope</label>
                                                    <select 
                                                        {...register(getFieldName("revealScope"), {
                                                            onChange: (e) => {
                                                                const val = e.target.value;
                                                                if (val === 'code_only') {
                                                                    // Code Only Defaults (Yellow/Black)
                                                                    setValue(getFieldName("maskConfig.style.backgroundColor"), "#cfc33a");
                                                                    setValue(getFieldName("maskConfig.style.textColor"), "#000000");
                                                                    
                                                                    setValue(getFieldName("maskConfig.lightStyle.backgroundColor"), "#1a1a1a");
                                                                    setValue(getFieldName("maskConfig.lightStyle.textColor"), "#ffffff");
                                                                } else {
                                                                    // Full Reveal Defaults
                                                                    
                                                                    // Dark Theme (Dark/White)
                                                                    setValue(getFieldName("maskConfig.style.backgroundColor"), "#1a1a1a");
                                                                    setValue(getFieldName("maskConfig.style.textColor"), "#ffffff");
                                                                    
                                                                    // Light Theme (Light/Black) - Resetting to standard defaults
                                                                    setValue(getFieldName("maskConfig.lightStyle.backgroundColor"), "#f5f5f5");
                                                                    setValue(getFieldName("maskConfig.lightStyle.textColor"), "#000000");
                                                                }
                                                            }
                                                        })} 
                                                        style={styles.input} 
                                                        defaultValue="entire_card"
                                                    >
                                                        <option value="entire_card">Cover Entire Coupon</option>
                                                        <option value="code_only">Cover Code Only</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <MaskConfigurationForm 
                                                register={register}
                                                control={control}
                                                prefix={getFieldName("maskConfig")}
                                                defaultHeadline="Click to Reveal the Coupon Code"
                                                isCodeOnlyScope={revealScope === 'code_only'}
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {selectedType === 'email_capture' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* 1. LAYOUT & SIZING */}
                        {/* Remove for now since nothing inside this section
                        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Layout & Sizing</h4>
                        </div>
                        */}

                        {/* 2. VERTICAL SPACING GROUP */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Vertical Spacing</h4>
                            <div style={styles.configRow}>
                                <div style={styles.configItem}>
                                    <label>Between Content & Field (px)</label>
                                    <Controller
                                        name={getFieldName("style.spacing")}
                                        control={control}
                                        defaultValue={20}
                                        render={({ field }) => (
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="120"
                                                value={field.value ?? ''} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '') {
                                                        field.onChange('');
                                                    } else {
                                                        const num = Number(val);
                                                        if (!isNaN(num) && num >= 0 && num <= 120) field.onChange(num);
                                                    }
                                                }}
                                                style={styles.input}
                                                // No placeholder per instruction
                                            />
                                        )}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Between Field & Button (px)</label>
                                    <Controller
                                        name={getFieldName("style.buttonSpacing")}
                                        control={control}
                                        defaultValue={15}
                                        render={({ field }) => (
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="120"
                                                value={field.value ?? ''} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '') {
                                                        field.onChange('');
                                                    } else {
                                                        const num = Number(val);
                                                        if (!isNaN(num) && num >= 0 && num <= 120) field.onChange(num);
                                                    }
                                                }}
                                                style={styles.input}
                                                // No placeholder per instruction
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. EMAIL FIELD CONFIG */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Email Field</h4>
                            <div style={styles.configItem}>
                                <label>Placeholder (Gray Text)</label>
                                <input 
                                    type="text" 
                                    {...register(getFieldName("emailPlaceholderText"))} 
                                    style={styles.input} 
                                    placeholder="Enter your email..." 
                                />
                            </div>
                        </div>

                        {/* 4. SUBMIT BUTTON CONFIG */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Submit Button</h4>
                            
                            <div style={styles.configItem}>
                                <label>Button Text</label>
                                <input type="text" {...register(getFieldName("submitButtonText"))} style={styles.input} placeholder="Submit" />
                            </div>

                            {/* DARK THEME COLORS */}
                            <h5 style={{ fontSize: '0.9rem', color: '#666', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>Dark Theme</h5>
                            <div style={{ ...styles.configRow, marginTop: '0.5rem' }}>
                                <Controller
                                    name={getFieldName("style.buttonColor")}
                                    control={control}
                                    defaultValue="#1532c1"
                                    render={({ field }) => (
                                        <ColorInput label="Button Color" value={field.value ?? '#1532c1'} onChange={field.onChange} />
                                    )}
                                />
                                <Controller
                                    name={getFieldName("style.buttonTextColor")}
                                    control={control}
                                    defaultValue="#ffffff"
                                    render={({ field }) => (
                                        <ColorInput label="Text Color" value={field.value ?? '#ffffff'} onChange={field.onChange} />
                                    )}
                                />
                            </div>

                            {/* LIGHT THEME COLORS */}
                            <h5 style={{ fontSize: '0.9rem', color: '#666', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>Light Theme</h5>
                            <div style={{ ...styles.configRow, marginTop: '0.5rem' }}>
                                <Controller
                                    name={getFieldName("lightStyle.buttonColor")}
                                    control={control}
                                    defaultValue="#1532c1"
                                    render={({ field }) => (
                                        <ColorInput label="Button Color" value={field.value ?? '#1532c1'} onChange={field.onChange} />
                                    )}
                                />
                                <Controller
                                    name={getFieldName("lightStyle.buttonTextColor")}
                                    control={control}
                                    defaultValue="#ffffff"
                                    render={({ field }) => (
                                        <ColorInput label="Text Color" value={field.value ?? '#ffffff'} onChange={field.onChange} />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {selectedType === 'form_submit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* 1. FORM FIELDS SECTION */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Form Fields</h4>
                            
                            {formFields.map((field: any, index: number) => {
                                // 1. Watch local row state for this field
                                const watchedRow = watch(`${fieldsName}.${index}.row`);
                                const rowVal = watchedRow !== undefined ? watchedRow : (index + 1);
                                
                                // 2. Watch GLOBAL state to calculate the true maximum row currently in use
                                const allFields = watch(fieldsName);
                                const globalMaxRow = allFields 
                                    ? Math.max(...allFields.map((f: any, i: number) => f.row || (i + 1))) 
                                    : formFields.length;

                                const showRowControls = formFields.length >= 2;
                                const maxCols = getMaxColumns();

                                // 3. CALC: Effective Visual Row (Portrait Mode)
                                let portraitVisualRow = rowVal;
                                if (previewOrientation === 'portrait' && allFields) {
                                     // Group all fields by row to simulate the rendering logic
                                     const groups: Record<number, number[]> = {};
                                     allFields.forEach((f: any, i: number) => {
                                         const r = f.row || (i + 1);
                                         if (!groups[r]) groups[r] = [];
                                         groups[r].push(i);
                                     });

                                     let vRowCounter = 0;
                                     const sortedRows = Object.keys(groups).map(Number).sort((a,b)=>a-b);
                                     
                                     for (const r of sortedRows) {
                                         const indices = groups[r];
                                         // In portrait, we chunk into groups of 2
                                         const chunkCount = Math.ceil(indices.length / 2);
                                         
                                         // Check if current field is in this row group
                                         const internalPos = indices.indexOf(index);
                                         if (internalPos !== -1) {
                                             // Found it. Calculate which chunk it belongs to.
                                             const chunkIndex = Math.floor(internalPos / 2);
                                             portraitVisualRow = vRowCounter + chunkIndex + 1;
                                             break;
                                         }
                                         vRowCounter += chunkCount;
                                     }
                                }

                                return (
                                    <div key={field.id} style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '1rem' }}>
                                        <div style={{...styles.configRow, marginBottom: '0.75rem'}}>
                                            <div style={styles.configItem}>
                                                <label>Label</label>
                                                <input placeholder="e.g. First Name" {...register(`${fieldsName}.${index}.label`)} style={styles.input}/>
                                            </div>
                                            <div style={styles.configItem}>
                                                <label>Type</label>
                                                <select {...register(`${fieldsName}.${index}.type`)} style={styles.input}>
                                                    <option value="text">Text</option>
                                                    <option value="email">Email</option>
                                                    <option value="tel">Phone</option>
                                                    <option value="number">Number</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* ROW SELECTION & REORDER */}
                                        {showRowControls && (
                                            <div style={{...styles.configRow, marginBottom: '0.75rem', alignItems: 'flex-start'}}>
                                                <div style={styles.configItem}>
                                                    <label>Row</label>
                                                    <select 
                                                        value={rowVal}
                                                        onChange={(e) => handleRowChange(index, e.target.value)}
                                                        style={styles.input}
                                                    >
                                                        {formFields.map((_, i) => {
                                                            const optionRowNum = i + 1;
                                                            
                                                            // 1. Calculate Limits
                                                            const currentCount = getFieldsInRow(optionRowNum);
                                                            const isCurrentRow = rowVal === optionRowNum;
                                                            const isFull = !isCurrentRow && currentCount >= maxCols;
                                                            
                                                            // 2. Determine if we should show the "Next" row option
                                                            // If the current field is the ONLY one in the LAST row, 
                                                            // we don't allow creating a new row (because the current one would become empty/disappear).
                                                            let maxOption = globalMaxRow + 1;
                                                            const isLastRow = rowVal === globalMaxRow;
                                                            const isAloneInRow = getFieldsInRow(rowVal) === 1;
                                                            
                                                            if (isLastRow && isAloneInRow) {
                                                                maxOption = globalMaxRow;
                                                            }
                                                            
                                                            // Don't render options beyond the allowed max
                                                            if (optionRowNum > maxOption) return null;

                                                            // 3. Generate Label
                                                            let label = `Row ${optionRowNum}`;
                                                            if (isFull) label += ` (Full - Max ${maxCols})`;
                                                            
                                                            // =Add "(New)" if this row index is higher than the current highest row
                                                            if (optionRowNum > globalMaxRow) label += ` (New)`;

                                                            return (
                                                                <option key={optionRowNum} value={optionRowNum} disabled={isFull}>
                                                                    {label}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                    
                                                    {/* PORTRAIT ROW HINT */}
                                                    {previewOrientation === 'portrait' && portraitVisualRow !== rowVal && (
                                                        <div style={{ fontSize: '0.8rem', color: '#f39c12', marginTop: '4px', fontWeight: 500 }}>
                                                            Shifted to Row {portraitVisualRow}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '24px' }}>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleSmartMove(index, 'up')}
                                                        disabled={index === 0}
                                                        style={{ ...styles.secondaryButton, padding: '0.5rem', opacity: index === 0 ? 0.5 : 1 }}
                                                        title="Move Up"
                                                    >
                                                        ↑
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleSmartMove(index, 'down')}
                                                        disabled={index === formFields.length - 1}
                                                        style={{ ...styles.secondaryButton, padding: '0.5rem', opacity: index === formFields.length - 1 ? 0.5 : 1 }}
                                                        title="Move Down"
                                                    >
                                                        ↓
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                                                <input type="checkbox" {...register(`${fieldsName}.${index}.required`)} defaultChecked={true} />
                                                Required Field
                                            </label>
                                            <button 
                                                type="button" 
                                                onClick={() => removeFormField(index)} 
                                                style={{ ...styles.deleteButton, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                                title="Remove Field"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            <button 
                                type="button" 
                                onClick={() => appendFormField({ label: 'New Field', type: 'text', required: true, name: `field_${Date.now()}`, row: getNextRow() })} 
                                style={{ ...styles.secondaryButton, width: '100%', justifyContent: 'center' }}
                            >
                                + Add Field
                            </button>
                        </div>

                        {/* 2. LAYOUT & SIZING */}
                        {/* Hide for now since nothing in section
                        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Layout & Sizing</h4>
                        </div>
                        */}

                        {/* 3. VERTICAL SPACING */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Vertical Spacing</h4>
                            <div style={styles.configRow}>
                                <div style={styles.configItem}>
                                    <label>Between Content & Form (px)</label>
                                    <Controller
                                        name={getFieldName("style.spacing")}
                                        control={control}
                                        defaultValue={15}
                                        render={({ field }) => (
                                            <input type="number" min="0" max="120" value={field.value ?? ''} 
                                                onChange={e => { const val = e.target.value; if(val==='') field.onChange(''); else { const num=Number(val); if(!isNaN(num) && num>=0 && num<=120) field.onChange(num); }}} 
                                                style={styles.input} 
                                            />
                                        )}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Between Form Fields (px)</label>
                                    <Controller
                                        name={getFieldName("style.fieldSpacing")}
                                        control={control}
                                        defaultValue={10}
                                        render={({ field }) => (
                                            <input type="number" min="0" max="120" value={field.value ?? ''} 
                                                onChange={e => { const val = e.target.value; if(val==='') field.onChange(''); else { const num=Number(val); if(!isNaN(num) && num>=0 && num<=120) field.onChange(num); }}} 
                                                style={styles.input} 
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. SUBMIT BUTTON SECTION */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Submit Button</h4>
                            
                            <div style={styles.configItem}>
                                <label>Button Text</label>
                                <input type="text" {...register(getFieldName("submitButtonText"))} style={styles.input} placeholder="Submit" />
                            </div>

                            {/* DARK THEME COLORS */}
                            <h5 style={{ fontSize: '0.9rem', color: '#666', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>Dark Theme Colors</h5>
                            <div style={{ ...styles.configRow, marginTop: '0.5rem' }}>
                                <Controller name={getFieldName("style.buttonColor")} control={control} defaultValue="#1532c1" render={({ field }) => (<ColorInput label="Button Color" value={field.value ?? '#1532c1'} onChange={field.onChange} />)} />
                                <Controller name={getFieldName("style.buttonTextColor")} control={control} defaultValue="#ffffff" render={({ field }) => (<ColorInput label="Text Color" value={field.value ?? '#ffffff'} onChange={field.onChange} />)} />
                            </div>

                            {/* LIGHT THEME COLORS */}
                            <h5 style={{ fontSize: '0.9rem', color: '#666', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>Light Theme Colors</h5>
                            <div style={{ ...styles.configRow, marginTop: '0.5rem' }}>
                                <Controller name={getFieldName("lightStyle.buttonColor")} control={control} defaultValue="#1532c1" render={({ field }) => (<ColorInput label="Button Color" value={field.value ?? '#1532c1'} onChange={field.onChange} />)} />
                                <Controller name={getFieldName("lightStyle.buttonTextColor")} control={control} defaultValue="#ffffff" render={({ field }) => (<ColorInput label="Text Color" value={field.value ?? '#ffffff'} onChange={field.onChange} />)} />
                            </div>
                        </div>
                    </div>
                )}

                {selectedType === 'social_follow' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
                        {/* --- 1. Colors & Basic Style --- */}
                        <div style={{ ...styles.configRow, borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                            {/* Dark Theme Color */}
                            <div style={styles.configItem}>
                                <label style={styles.label}>Dark Theme Icon</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        {...register('style.iconColor')}
                                        style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                            {/* Light Theme Color */}
                             <div style={styles.configItem}>
                                <label style={styles.label}>Light Theme Icon</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        {...register('lightStyle.iconColor')}
                                        style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                            {/* Icon Size */}
                            <div style={styles.configItem}>
                                <label style={styles.label}>Icon Size (px)</label>
                                <Controller
                                    name={getFieldName("style.iconSize")}
                                    control={control}
                                    defaultValue={40}
                                    render={({ field }) => {
                                        // Global Limits
                                        const GLOBAL_MAX = 75;
                                        const GLOBAL_MIN = 20;
                                        const PORTRAIT_CAP = 40;

                                        // Validation Helpers
                                        const valNum = Number(field.value);
                                        const isError = field.value !== '' && (isNaN(valNum) || valNum < GLOBAL_MIN || valNum > GLOBAL_MAX);
                                        const isWarning = !isError && previewOrientation === 'portrait' && valNum > PORTRAIT_CAP;

                                        return (
                                            <>
                                                <input
                                                    type="number"
                                                    min={GLOBAL_MIN}
                                                    max={GLOBAL_MAX}
                                                    placeholder="20"
                                                    value={field.value ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        
                                                        // STRICT MAX CHECK (Global): Block input > 75
                                                        if (val !== '' && Number(val) > GLOBAL_MAX) return;

                                                        if (val === '') {
                                                            field.onChange('');
                                                        } else {
                                                            field.onChange(Number(val));
                                                        }
                                                    }}
                                                    style={{
                                                        ...styles.input,
                                                        // Red for Error, Yellow for Warning, Default Gray
                                                        borderColor: isError ? '#e74c3c' : isWarning ? '#f39c12' : '#ccc',
                                                        outlineColor: isError ? '#e74c3c' : isWarning ? '#f39c12' : undefined
                                                    }}
                                                />
                                                
                                                {/* Error Message */}
                                                {isError && (
                                                    <span style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                                                        Value must be {GLOBAL_MIN}-{GLOBAL_MAX}
                                                    </span>
                                                )}

                                                {/* Warning Message */}
                                                {isWarning && (
                                                    <span style={{ color: '#f39c12', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                                                        Value &gt; 40px will be capped at 40px in portrait view.
                                                    </span>
                                                )}
                                            </>
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        {/* --- 2. Platforms List --- */}
                        <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                            <label style={{...styles.label, marginBottom: 0}}>Social Platforms</label>
                            {socialLinks.map((field, index) => {
                                const isEnabled = watch(`${linksName}.${index}.isEnabled`);
                                return (
                                    <div key={field.id} style={{ ...styles.configRow, alignItems: 'center', padding: '0.5rem', border: '1px solid #eee', borderRadius: '4px', background: '#fafafa' }}>
                        
                                        {/* Checkbox & Name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '140px' }}>
                                            <input
                                                type="checkbox"
                                                {...register(`${linksName}.${index}.isEnabled`)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            {/* Hidden input to ensure platform persists */}
                                            <input type="hidden" {...register(`${linksName}.${index}.platform`)} />
                            
                                            <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.95rem', color: isEnabled ? '#000' : '#999' }}>
                                                {field.platform || ['facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube'][index]}
                                            </span>
                                        </div>

                                        {/* URL Input (Only visible if checked) */}
                                        <div style={{ flex: 1, opacity: isEnabled ? 1 : 0.3, pointerEvents: isEnabled ? 'auto' : 'none' }}>
                                            <input
                                                placeholder={`https://${field.platform || 'social'}.com/...`}
                                                type="url"
                                                {...register(`${linksName}.${index}.url`)}
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* --- 3. Layout & Sizing Section --- */}
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <h4 style={{ ...styles.h4, marginBottom: '1rem' }}>Layout & Sizing</h4>
            
                            <div style={styles.configRow}>
                                {/* Vertical Spacing - Exact copy from Link Redirect */}
                                <div style={styles.configItem}>
                                    <label style={styles.label}>Vertical Spacing (px)</label>
                                    <Controller
                                        name={getFieldName("style.spacing")}
                                        control={control}
                                        defaultValue={20}
                                        render={({ field }) => (
                                            <input type="number" min="0" max="120" value={field.value ?? ''} 
                                                onChange={e => { const val = e.target.value; if(val==='') field.onChange(''); else { const num=Number(val); if(!isNaN(num) && num>=0 && num<=120) field.onChange(num); }}} 
                                                style={styles.input} 
                                            />
                                        )}
                                    />
                                </div>

                                {/* Icon Spacing - Matching pattern with max 75 */}
                                <div style={styles.configItem}>
                                    <label style={styles.label}>Icon Spacing (px)</label>
                                    <Controller
                                        name={getFieldName("style.iconSpacing")}
                                        control={control}
                                        defaultValue={15}
                                        render={({ field }) => (
                                            <input type="number" min="0" max="75" value={field.value ?? ''} 
                                                onChange={e => { const val = e.target.value; if(val==='') field.onChange(''); else { const num=Number(val); if(!isNaN(num) && num>=0 && num<=75) field.onChange(num); }}} 
                                                style={styles.input} 
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};