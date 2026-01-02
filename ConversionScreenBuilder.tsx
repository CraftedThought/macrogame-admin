/* src/components/builders/ConversionScreenBuilder.tsx */

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler, Controller } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionScreen, ConversionMethod, EntityStatus } from '../../types';
import { useData } from '../../hooks/useData';
import { StaticConversionPreview } from '../previews/StaticConversionPreview';
import { ConversionMethodFormFields } from '../forms/ConversionMethodFormFields';
import { SimpleTextEditor } from '../forms/SimpleTextEditor';
import { generateUUID, ensureUniqueName } from '../../utils/helpers';
import { notifications } from '../../utils/notifications';
import { MaskConfigurationForm } from '../forms/MaskConfigurationForm';

// --- Types ---

interface FormMethodItem {
    instanceId: string;
    methodId: string; 
    isCreatingNew: boolean;
    isExpanded?: boolean; 
    isSectionCollapsed?: boolean; // Tracks if the whole method card is collapsed
    draftMethod?: Partial<ConversionMethod>; 
    showContentAbove: boolean;
    contentAbove: string;
    showContentBelow: boolean;
    contentBelow: string;
    gate: {
        type: 'none' | 'on_success' | 'on_points';
        methodInstanceId?: string;
    };
}

interface ScreenBuilderFormValues {
    name: string;
    headline: string;
    bodyText: string;
    layout: 'single_column';
    style: {
        width: number;
        spacing: number; // NEW: Vertical Spacing
    };
    methods: FormMethodItem[];
}

interface ConversionScreenBuilderProps {
    initialScreen?: ConversionScreen | null;
    onSave: () => void; 
    onCancel: () => void;
}

// --- Helper: Standard Defaults (Mirrors ConversionMethodBuilder) ---
const getStandardDefaults = (type: string): Partial<ConversionMethod> => {
    const defaults: Partial<ConversionMethod> = {
        name: `New ${type.replace(/_/g, ' ')}`,
        type: type as any,
        style: { size: 60, spacing: 20 }, // Base defaults
        fields: [],
        links: []
    };

    // 1. Text Defaults
    if (type === 'coupon_display') {
        // MATCHING STANDALONE DEFAULTS
        defaults.headline = '<h2 style="text-align: center;">New Customer Deal</h2>';
        defaults.subheadline = '<p style="text-align: center;">Enjoy 50% off your first purchase as a new customer! Use the code below at checkout to redeem.</p>';
        (defaults as any).revealText = 'Click to Reveal Code';
        (defaults as any).clickToReveal = false;

        defaults.style = { 
            ...defaults.style, 
            spacing: 15,
            // Visual Defaults (Matches Form Fields)
            strokeWidth: 2,
            strokeStyle: 'dashed',
            strokeColor: '#cfc33a',
            paddingTop: 20,
            paddingBottom: 20,
            paddingX: 20,
            boxShadowOpacity: 15, // Default opacity
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff'
        };
        // Light Theme Defaults
        (defaults as any).lightStyle = {
            strokeColor: '#333333',
            backgroundColor: '#f5f5f5',
            textColor: '#000000',
            boxShadowOpacity: 15
        };
    } else if (type === 'email_capture') {
        // MATCHING STANDALONE DEFAULTS
        defaults.headline = '<h2 style="text-align: center;">Join Our Community!</h2>';
        defaults.subheadline = '<p style="text-align: center;">Sign up for exclusive discounts, updates, and insider perks.</p>';
        defaults.submitButtonText = 'Submit';
        (defaults as any).emailPlaceholderText = 'Enter your email...';
        defaults.style = { ...defaults.style, buttonSpacing: 15, buttonColor: '#1532c1', buttonTextColor: '#ffffff' };
        (defaults as any).lightStyle = { buttonColor: '#1532c1', buttonTextColor: '#ffffff' };
    } else if (type === 'link_redirect') {
        defaults.headline = '<h2 style="text-align: center;">Visit This Link</h2>';
        defaults.subheadline = '<p style="text-align: center;">Click the button below to be redirected to the destination.</p>';
        (defaults as any).buttonText = 'Continue';
        (defaults as any).redirectType = 'manual';
        (defaults as any).autoRedirectDelay = 5;
        (defaults as any).openInNewTab = true;
        (defaults as any).showCountdown = true;
        defaults.style = { ...defaults.style, buttonColor: '#1532c1', buttonTextColor: '#ffffff', autoCountdownColor: '#ffffff' };
        (defaults as any).lightStyle = { buttonColor: '#1532c1', buttonTextColor: '#ffffff', autoCountdownColor: '#000000' };
    } else if (type === 'form_submit') {
        defaults.headline = '<h2 style="text-align: center;">Submit Your Information</h2>';
        defaults.subheadline = '<p style="text-align: center;">Submit the required information using the form below.</p>';
        defaults.submitButtonText = 'Submit';
        defaults.style = { ...defaults.style, spacing: 15, fieldSpacing: 10, buttonColor: '#1532c1', buttonTextColor: '#ffffff' };
        (defaults as any).lightStyle = { buttonColor: '#1532c1', buttonTextColor: '#ffffff' };
        defaults.fields = [{ label: 'First Name', type: 'text', required: true, name: 'field_1', row: 1 }];
    } else if (type === 'social_follow') {
        defaults.headline = '<h2 style="text-align: center;">Follow Us</h2>';
        defaults.subheadline = '<p style="text-align: center;">Stay updated on our socials!</p>';
        defaults.style = { ...defaults.style, spacing: 20, iconSpacing: 15, iconColor: '#ffffff', iconSize: 40 };
        (defaults as any).lightStyle = { iconColor: '#000000' };
        defaults.links = [
            { platform: 'facebook', url: '', isEnabled: false },
            { platform: 'instagram', url: '', isEnabled: false },
            { platform: 'linkedin', url: '', isEnabled: false },
            { platform: 'tiktok', url: '', isEnabled: false },
            { platform: 'x', url: '', isEnabled: false },
            { platform: 'youtube', url: '', isEnabled: false }
        ];
    }
    return defaults;
};

// --- Component ---

export const ConversionScreenBuilder: React.FC<ConversionScreenBuilderProps> = ({ initialScreen, onSave, onCancel }) => {
    const { allConversionMethods, createConversionMethod, createConversionScreen, updateConversionScreen } = useData();
    const [isSaving, setIsSaving] = useState(false);

    // --- Simulation State for Point Threshold ---
    const [simProgress, setSimProgress] = useState(50);
    const [simReqPoints, setSimReqPoints] = useState(1000);

    // --- Preview State ---
    const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
    const [previewOrientation, setPreviewOrientation] = useState<'landscape' | 'portrait'>('landscape');

    // --- Content Memory Refs ---
    const lastScreenHeadline = React.useRef<string>('');
    const lastScreenBody = React.useRef<string>('');
    const lastMethodContent = React.useRef<Record<string, { above?: string, below?: string }>>({});

    // --- Preview Reset State ---
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

    // Helper for Editor Styling based on Preview Theme
    const editorStyle = previewTheme === 'dark' 
        ? { backgroundColor: '#080817', defaultTextColor: '#ffffff' }
        : { backgroundColor: '#ffffff', defaultTextColor: '#000000' };

    // Toggle states for main content blocks
    const [showHeadline, setShowHeadline] = useState(initialScreen ? !!initialScreen.headline : true);
    const [showBodyText, setShowBodyText] = useState(initialScreen ? !!initialScreen.bodyText : true);

    // 1. Prepare Default Method (Ensure at least one exists for new screens)
    const defaultMethodItem: FormMethodItem = {
        instanceId: generateUUID(),
        methodId: '',
        isCreatingNew: false,
        showContentAbove: false,
        contentAbove: '',
        showContentBelow: false,
        contentBelow: '',
        gate: { type: 'none' }
    };

    // Initialize Form
    const { register, control, handleSubmit, watch, setValue, getValues } = useForm<ScreenBuilderFormValues>({
        defaultValues: {
            name: initialScreen?.name || '',
            headline: initialScreen?.headline || '<h1 style="text-align: center;">Unlock Your Reward!</h1>',
            bodyText: initialScreen?.bodyText || '<p style="text-align: center;">You can redeem your special offer here on the Conversion Screen.</p>',
            layout: 'single_column',
            style: {
                width: initialScreen?.style?.width || 60,
                spacing: initialScreen?.style?.spacing !== undefined ? initialScreen.style.spacing : 20 
            },
            methods: (initialScreen?.methods && initialScreen.methods.length > 0)
                ? initialScreen.methods.map(m => {
                    // Find the existing method data to populate the draft immediately
                    const existingData = allConversionMethods.find(cm => cm.id === m.methodId);
                    
                    return {
                        ...m,
                        isCreatingNew: false, 
                        showContentAbove: !!m.contentAbove,
                        contentAbove: m.contentAbove || '',
                        showContentBelow: !!m.contentBelow,
                        contentBelow: m.contentBelow || '',
                        // Update: Force string 'true'/'false' (Default to 'false' if undefined)
                        gate: m.gate ? { 
                            ...m.gate,
                            replacePrerequisite: m.gate.replacePrerequisite ? 'true' : 'false'
                        } : { type: 'none' },
                        // Pre-fill draftMethod so Hoisted UI works immediately without clicking "Edit"
                        draftMethod: existingData ? JSON.parse(JSON.stringify(existingData)) : undefined
                    };
                })
                : [defaultMethodItem]
        }
    });

    const { fields, append, remove, move, update, replace } = useFieldArray({
        control,
        name: "methods"
    });

    // Watch form state for Live Preview
    const watchedValues = watch();

    // --- Live Preview Data Construction ---
    const previewScreen = useMemo(() => {
        const processedMethods = watchedValues.methods?.map(m => {
            // 1. Resolve Data Source
            let baseData = m.isCreatingNew 
                ? { ...m.draftMethod, id: 'PREVIEW_TEMP_ID', type: m.draftMethod?.type || 'coupon_display' } 
                : allConversionMethods.find(ex => ex.id === m.methodId);

            // 2. Clone to avoid mutating state
            let effectiveData = baseData ? { ...baseData } : undefined;

            // 3. Apply Light Theme Override for Preview
            if (effectiveData && previewTheme === 'light' && (effectiveData as any).lightStyle) {
                const lightStyle = (effectiveData as any).lightStyle;
                // Merge lightStyle into style
                effectiveData.style = {
                    ...effectiveData.style,
                    ...lightStyle,
                    // Ensure size is preserved if not overridden, though usually we force 100% in Host
                };
            }

            // Update: Sanitize Gate Boolean for Preview
            // We must convert the string "false" (from radio buttons) back to boolean false
            let previewGate = undefined;
            if (m.gate && m.gate.type !== 'none') {
                previewGate = {
                    ...m.gate,
                    replacePrerequisite: (m.gate.replacePrerequisite === true || m.gate.replacePrerequisite === 'true')
                };
            }

            return {
                instanceId: m.instanceId,
                methodId: m.methodId || 'PREVIEW_TEMP_ID',
                contentAbove: m.showContentAbove ? m.contentAbove : undefined,
                contentBelow: m.showContentBelow ? m.contentBelow : undefined,
                gate: previewGate,
                data: effectiveData as ConversionMethod
            };
        }) || [];

        return {
            id: initialScreen?.id || 'PREVIEW',
            name: watchedValues.name || 'New Screen',
            headline: showHeadline ? watchedValues.headline : '', 
            bodyText: showBodyText ? watchedValues.bodyText : '', 
            layout: 'single_column',
            
            style: { 
                ...watchedValues.style, 
                width: previewOrientation === 'portrait' 
                    ? 100 
                    : (() => {
                        const val = watchedValues.style?.width;
                        // Update: Robust check for "empty" state (includes 0 and NaN)
                        // This ensures that if the input is cleared, we default to 60 instead of clamping to 20
                        if (val === '' || val === undefined || val === null || Number.isNaN(Number(val)) || val === 0) {
                            return 60;
                        }
                        return val;
                    })()
            },
            
            methods: processedMethods,
            status: { code: 'ok', message: '' },
            // Inject Theme Colors for Preview
            textColor: previewTheme === 'light' ? '#000000' : '#ffffff',
            backgroundColor: previewTheme === 'light' ? '#ffffff' : 'transparent', 
        } as any as ConversionScreen;

    }, [watchedValues, allConversionMethods, initialScreen, previewTheme, previewOrientation]);

    const handleMethodTypeChange = (index: number, type: string) => {
        const currentItem = getValues(`methods.${index}`);
        
        // 1. Get Standard Defaults for this type
        const defaults = getStandardDefaults(type);

        // 2. Context-Aware Cleanup
        // If the Screen has a Headline or Body enabled, we start the method with EMPTY text fields.
        // The ConversionMethodFormFields component is smart enough to restore the *correct* default 
        // text (specific to the method type) if the user clicks "+ Add Headline/Body".
        if (type !== 'coupon_display' && (showHeadline || showBodyText)) {
            defaults.headline = '';
            defaults.subheadline = ''; 
        }

        update(index, {
            ...currentItem,
            methodId: '', 
            isCreatingNew: true, 
            isExpanded: false, 
            draftMethod: defaults,
            gate: currentItem.gate 
        });
    };

    const handleVariantChange = (index: number, value: string) => {
        const currentItem = getValues(`methods.${index}`);
        
        if (value === 'DEFAULT') {
            // Use the CURRENT type, do not default to coupon
            const currentType = currentItem.draftMethod?.type 
                || allConversionMethods.find(m => m.id === currentItem.methodId)?.type 
                || 'coupon_display';
                
            const defaults = getStandardDefaults(currentType);
            
            // Context-Aware Cleanup
            if (currentType !== 'coupon_display' && (showHeadline || showBodyText)) {
                defaults.headline = '';
                defaults.subheadline = '';
            }
            
            update(index, {
                ...currentItem,
                methodId: '',
                isCreatingNew: true,
                isExpanded: false,
                draftMethod: defaults
            });
        } else {
            // Select existing variant
            update(index, {
                ...currentItem,
                methodId: value,
                isCreatingNew: false, // It's an existing method
                isExpanded: false,
                draftMethod: undefined // Clear draft since we are linking
            });
        }
    };

    const handleSave: SubmitHandler<ScreenBuilderFormValues> = async (data) => {
        if (!data.name.trim()) { notifications.error("Please enter an internal name."); return; }
        
        const validMethods = data.methods.filter(m => m.methodId || m.isCreatingNew);

        if (validMethods.length === 0) { 
            notifications.error("Please add and configure at least one conversion method."); 
            return; 
        }

        // --- VALIDATION LOOP ---
        for (const [i, m] of validMethods.entries()) {
            if (m.isCreatingNew && m.draftMethod) {
                const draft = m.draftMethod;
                const label = `Method ${i + 1}`; 

                if (!draft.name?.trim()) { notifications.error(`${label}: Internal Name is required`); return; }

                if (draft.type === 'coupon_display') {
                    if (!draft.staticCode?.trim()) { notifications.error(`${label}: Coupon Code is required`); return; }
                    if (!draft.discountValue || Number(draft.discountValue) <= 0) { notifications.error(`${label}: Discount Value must be positive`); return; }
                }
                
                if (draft.type === 'email_capture') {
                    if (!draft.emailPlaceholderText?.trim()) { notifications.error(`${label}: Placeholder text is required`); return; }
                    if (!draft.submitButtonText?.trim()) { notifications.error(`${label}: Button text is required`); return; }
                }

                if (draft.type === 'link_redirect' && draft.redirectType !== 'auto') {
                    if (!draft.buttonText?.trim()) { notifications.error(`${label}: Button text is required`); return; }
                    if (!draft.url?.trim()) { notifications.error(`${label}: Destination URL is required`); return; }
                }

                if (draft.type === 'form_submit') {
                    if (!draft.submitButtonText?.trim()) { notifications.error(`${label}: Button text is required`); return; }
                    if (draft.fields?.some((f: any) => !f.label?.trim())) { notifications.error(`${label}: All form fields must have a label`); return; }
                }

                if (draft.type === 'social_follow') {
                    if (draft.links?.some((l: any) => l.isEnabled && !l.url?.trim())) { notifications.error(`${label}: All enabled social links must have a URL`); return; }
                }
            }
        }
        
        setIsSaving(true);
        const loadingToast = notifications.loading("Saving screen...");

        try {
            // --- SANITIZATION HELPERS ---
            // These ensure empty strings/undefined become valid 0s or defaults before DB save.
            
            const sanitizeStyle = (style: any) => {
                if (!style) return {};
                const s = { ...style };
                // Numeric fields to force to 0 if empty/invalid
                ['spacing', 'buttonSpacing', 'paddingTop', 'paddingBottom', 'paddingX', 'strokeWidth', 'boxShadowOpacity', 'fieldSpacing', 'iconSpacing', 'size'].forEach(k => {
                    if (k in s) s[k] = (s[k] === '' || s[k] === null || s[k] === undefined || isNaN(Number(s[k]))) ? 0 : Number(s[k]);
                });
                // Icon Size special case (default 40)
                if ('iconSize' in s) {
                    const size = Number(s.iconSize);
                    s.iconSize = (size > 0) ? size : 40;
                }
                return s;
            };

            const sanitizeMask = (mask: any) => {
                if (!mask) return undefined;
                const m = { ...mask };
                // Top level numbers
                ['strokeWidth', 'paddingTop', 'paddingBottom', 'paddingX', 'spacing'].forEach(k => {
                    if (k in m) m[k] = (m[k] === '' || m[k] === null || m[k] === undefined || isNaN(Number(m[k]))) ? 0 : Number(m[k]);
                });
                // Ensure nested style objects exist and are clean (though masks usually use strings for colors)
                m.style = m.style || {};
                m.lightStyle = m.lightStyle || {};
                return m;
            };

            // --- PROCESS METHODS ---
            const finalMethods = await Promise.all(validMethods.map(async (m) => {
                let finalMethodId = m.methodId;
                
                if (m.isCreatingNew && m.draftMethod) {
                    const existingNames = new Set(allConversionMethods.map(cm => cm.name));
                    const uniqueName = ensureUniqueName(m.draftMethod.name || "New Method", existingNames);

                    // Deep clone to apply sanitization
                    const newMethodData = JSON.parse(JSON.stringify({
                        ...m.draftMethod,
                        name: uniqueName,
                        createdAt: new Date().toISOString(),
                        status: { code: 'ok', message: '' } as EntityStatus
                    }));

                    // Apply Sanitization to Styles
                    if (newMethodData.style) newMethodData.style = sanitizeStyle(newMethodData.style);
                    if (newMethodData.lightStyle) newMethodData.lightStyle = sanitizeStyle(newMethodData.lightStyle);
                    
                    // Apply Sanitization to Coupon Mask (if exists)
                    if (newMethodData.maskConfig) newMethodData.maskConfig = sanitizeMask(newMethodData.maskConfig);

                    const savedMethod = await createConversionMethod(newMethodData);
                    if (savedMethod) finalMethodId = savedMethod.id;
                    else throw new Error("Failed to save new method.");
                }

                const methodObj: any = {
                    instanceId: m.instanceId,
                    methodId: finalMethodId,
                };

                if (m.showContentAbove && m.contentAbove) methodObj.contentAbove = m.contentAbove;
                if (m.showContentBelow && m.contentBelow) methodObj.contentBelow = m.contentBelow;

                if (m.gate && m.gate.type !== 'none') {
                    // Sanitize Gate Mask Config
                    const cleanGateMask = m.gate.maskConfig ? sanitizeMask(m.gate.maskConfig) : undefined;

                    if (m.gate.type === 'point_threshold' || m.gate.type === 'point_purchase') {
                         methodObj.gate = { 
                             type: m.gate.type,
                             ...(cleanGateMask ? { maskConfig: cleanGateMask } : {})
                         };
                    } else if (m.gate.type === 'on_success' && m.gate.methodInstanceId) {
                        const rawReplace = (m.gate as any).replacePrerequisite;
                        const isReplace = rawReplace === true || rawReplace === 'true';
                        
                        const rawVis = (m.gate as any).visibility;
                        const visibility = (rawVis === 'locked_mask' || rawVis === 'hidden') ? rawVis : 'hidden';

                        methodObj.gate = {
                            type: 'on_success',
                            methodInstanceId: m.gate.methodInstanceId,
                            visibility: visibility,
                            ...(isReplace ? { replacePrerequisite: true } : {}),
                            ...(cleanGateMask ? { maskConfig: cleanGateMask } : {})
                        };
                    }
                }

                return methodObj;
            }));

            // --- SCREEN SANITIZATION ---
            let validWidth = Number(data.style.width);
            if (data.style.width === '' || data.style.width === undefined || data.style.width === null || isNaN(validWidth) || validWidth === 0) {
                validWidth = 60;
            }

            let validSpacing = Number(data.style.spacing);
            if (data.style.spacing === '' || data.style.spacing === undefined || data.style.spacing === null || isNaN(validSpacing)) {
                validSpacing = 0;
            }

            const screenData: any = {
                name: data.name,
                layout: 'single_column',
                style: {
                    width: validWidth,
                    spacing: validSpacing
                },
                methods: finalMethods, 
                status: { code: 'ok', message: '' }
            };

            screenData.headline = showHeadline ? data.headline : '';
            screenData.bodyText = showBodyText ? data.bodyText : '';

            if (initialScreen?.id) await updateConversionScreen(initialScreen.id, screenData);
            else await createConversionScreen(screenData as Omit<ConversionScreen, 'id'>);

            await new Promise(resolve => setTimeout(resolve, 3000));
            notifications.dismiss(loadingToast);
            notifications.success("Conversion Screen saved!");
            onSave(); 
        } catch (error) {
            console.error(error);
            notifications.dismiss(loadingToast);
            notifications.error("Failed to save. Please try again.");
            setIsSaving(false);
        }
    };

    return (
        // Use height: 100% and overflow: hidden to contain the layout within the viewport
        <div style={{ display: 'flex', height: '650px', gap: '2rem', overflow: 'hidden' }}>
            
            {/* LEFT: BUILDER - Scrolls independently */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: '1rem', height: '100%' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{...styles.h2, marginBottom: '0.5rem'}}>Create New Conversion Screen</h2>
                    <p style={styles.descriptionText}>Configure the final screen of your Macrogame.</p>
                </div>

                <div style={styles.configItem}>
                    <label>Internal Name</label>
                    <input type="text" {...register("name")} placeholder="e.g., Default Reward Screen" style={styles.input} />
                </div>

                {/* Main Content Section */}
                <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    <h4 style={styles.h4}>Screen Content</h4>
                    
                    {/* HEADLINE */}
                    {!showHeadline && (
                        <button 
                            type="button" 
                            onClick={() => { 
                                // Restore from memory or use default
                                const saved = lastScreenHeadline.current;
                                setValue('headline', saved || '<h1 style="text-align: center;">Unlock Your Reward!</h1>');
                                setShowHeadline(true); 
                            }} 
                            style={{ 
                                ...styles.secondaryButton, 
                                fontSize: '0.8rem', 
                                padding: '0.25rem 0.5rem', 
                                marginBottom: '1rem', 
                                width: 'fit-content' // Prevent stretching
                            }}
                        >
                            + Add Main Headline
                        </button>
                    )}
                    {showHeadline && (
                        <div style={styles.configItem}>
                            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Headline</label>
                            <SimpleTextEditor 
                                initialHtml={getValues('headline')} 
                                onChange={(html) => setValue('headline', html)} 
                                backgroundColor={editorStyle.backgroundColor}
                                defaultTextColor={editorStyle.defaultTextColor}
                            />
                            <button 
                                type="button" 
                                onClick={() => { 
                                    // Save to memory
                                    const current = getValues('headline');
                                    if (current) lastScreenHeadline.current = current;
                                    
                                    setShowHeadline(false); 
                                    setValue('headline', ''); 
                                }} 
                                style={{ 
                                    ...styles.deleteButton, 
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    padding: '0.3rem 0.8rem',
                                    width: 'fit-content' // Prevent stretching
                                }}
                            >
                                Remove Headline
                            </button>
                        </div>
                    )}
                    
                    {/* BODY TEXT */}
                    {!showBodyText && (
                        <button 
                            type="button" 
                            onClick={() => { 
                                // Restore from memory or use default
                                const saved = lastScreenBody.current;
                                setValue('bodyText', saved || '<p style="text-align: center;">You can redeem your special offer here on the Conversion Screen.</p>');
                                setShowBodyText(true); 
                            }} 
                            style={{ 
                                ...styles.secondaryButton, 
                                fontSize: '0.8rem', 
                                padding: '0.25rem 0.5rem', 
                                marginBottom: '1rem', 
                                width: 'fit-content' // Prevent stretching
                            }}
                        >
                            + Add Main Body Text
                        </button>
                    )}
                    {showBodyText && (
                        <div style={{ ...styles.configItem, marginTop: '1.5rem' }}>
                            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Body Text</label>
                            <SimpleTextEditor 
                                initialHtml={getValues('bodyText')} 
                                onChange={(html) => setValue('bodyText', html)} 
                                backgroundColor={editorStyle.backgroundColor}
                                defaultTextColor={editorStyle.defaultTextColor}
                            />
                            <button 
                                type="button" 
                                onClick={() => { 
                                    // Save to memory
                                    const current = getValues('bodyText');
                                    if (current) lastScreenBody.current = current;

                                    setShowBodyText(false); 
                                    setValue('bodyText', ''); 
                                }} 
                                style={{ 
                                    ...styles.deleteButton, 
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    padding: '0.3rem 0.8rem',
                                    width: 'fit-content' // Prevent stretching
                                }}
                            >
                                Remove Body Text
                            </button>
                        </div>
                    )}
                </div>

                <h4 style={{ ...styles.h4, marginTop: '2rem' }}>Conversion Methods</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {fields.map((field, index) => {
                        const isCollapsed = watch(`methods.${index}.isSectionCollapsed`);
                        
                        // --- FIX: Define variables here so they are available for the Header ---
                        const selectedMethodId = watch(`methods.${index}.methodId`);
                        const selectedMethod = allConversionMethods.find(m => m.id === selectedMethodId);
                        
                        const isCreatingNew = watch(`methods.${index}.isCreatingNew`);
                        const showContentAbove = watch(`methods.${index}.showContentAbove`);
                        const showContentBelow = watch(`methods.${index}.showContentBelow`);
                        // Filter available prerequisites:
                        // 1. Must come BEFORE current method
                        // 2. If Coupon, MUST have 'clickToReveal' enabled
                        const availableGates = watchedValues.methods.filter((m, i) => {
                            if (i >= index) return false; // Must be before

                            // Resolve the actual data (Draft vs Saved)
                            const methodData = m.isCreatingNew 
                                ? m.draftMethod 
                                : allConversionMethods.find(saved => saved.id === m.methodId);

                            if (!methodData) return false;

                            // Specific Rule: Coupon Display
                            if (methodData.type === 'coupon_display') {
                                // Cast to any to access the specific field safely
                                return (methodData as any).clickToReveal === true;
                            }

                            // All other methods (Email, Form, Link, Social) imply action/success by default
                            return true;
                        });

                        return (
                            <div key={field.id} style={{ border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', marginBottom: '1rem' }}>
                                
                                {/* HEADER (Always Visible) */}
                                <div 
                                    style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: '1rem',
                                        backgroundColor: isCollapsed ? '#f9f9f9' : '#fff',
                                        borderBottom: isCollapsed ? 'none' : '1px solid #eee',
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                                        const current = getValues(`methods.${index}`);
                                        update(index, { ...current, isSectionCollapsed: !current.isSectionCollapsed });
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#666', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'inline-block' }}>▼</span>
                                        <h5 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>
                                            Method {index + 1}
                                            {isCollapsed && selectedMethod && <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>— {selectedMethod.name}</span>}
                                            {isCollapsed && isCreatingNew && <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>— (New Draft)</span>}
                                        </h5>
                                    </div>
                                    <div>
                                        <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} style={styles.flowCardButton}>▲</button>
                                        <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} style={styles.flowCardButton}>▼</button>
                                        <button type="button" onClick={() => remove(index)} style={{ ...styles.deleteButton, marginLeft: '0.5rem' }}>Remove</button>
                                    </div>
                                </div>

                                {/* CARD BODY (Collapsible) */}
                                {!isCollapsed && (
                                    <div style={{ padding: '1.5rem' }}>
                                        {/* Content Above */}
                                        {(!showContentAbove && (watch(`methods.${index}.methodId`) || watch(`methods.${index}.isCreatingNew`))) && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    // Update: Restore from memory if exists
                                                    const instanceId = getValues(`methods.${index}.instanceId`);
                                                    const saved = lastMethodContent.current[instanceId]?.above;
                                                    if (saved) setValue(`methods.${index}.contentAbove`, saved);
                                                    
                                                    setValue(`methods.${index}.showContentAbove`, true);
                                                }} 
                                                style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginBottom: '1rem', width: '100%' }}
                                            >
                                                + Add Content Block (Above Method)
                                            </button>
                                        )}
                                        {showContentAbove && (
                                            <div style={{ marginBottom: '1rem', borderLeft: '3px solid #0866ff', paddingLeft: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Content Above</label>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => { 
                                                            // Update: Save to memory before clearing
                                                            const instanceId = getValues(`methods.${index}.instanceId`);
                                                            const currentVal = getValues(`methods.${index}.contentAbove`);
                                                            if (!lastMethodContent.current[instanceId]) lastMethodContent.current[instanceId] = {};
                                                            lastMethodContent.current[instanceId].above = currentVal;

                                                            setValue(`methods.${index}.showContentAbove`, false); 
                                                            setValue(`methods.${index}.contentAbove`, ''); 
                                                        }} 
                                                        style={{ color: '#d9534f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <SimpleTextEditor initialHtml={getValues(`methods.${index}.contentAbove`)} onChange={(html) => setValue(`methods.${index}.contentAbove`, html)} backgroundColor={editorStyle.backgroundColor} defaultTextColor={editorStyle.defaultTextColor} />
                                            </div>
                                        )}

                                        {/* --- METHOD CONFIGURATION AREA --- */}
                                        <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '6px' }}>
                                            
                                            {/* 1. Method Type Selector */}
                                            <div style={styles.configItem}>
                                                <label>Method Type</label>
                                                <select value={isCreatingNew ? (watch(`methods.${index}.draftMethod.type`) || '') : (allConversionMethods.find(m => m.id === watch(`methods.${index}.methodId`))?.type || '')} onChange={(e) => handleMethodTypeChange(index, e.target.value)} style={styles.input}>
                                                    <option value="" disabled>Select a method type...</option>
                                                    <option value="coupon_display">Coupon Display</option>
                                                    <option value="email_capture">Email Capture</option>
                                                    <option value="link_redirect">Link Redirect</option>
                                                    <option value="form_submit">Form Submit</option>
                                                    <option value="social_follow">Social Follow</option>
                                                </select>
                                            </div>

                                            {/* 2. Variant Selector */}
                                            {(() => {
                                                const currentType = isCreatingNew ? watch(`methods.${index}.draftMethod.type`) : allConversionMethods.find(m => m.id === watch(`methods.${index}.methodId`))?.type;
                                                if (!currentType) return null;
                                                const variants = allConversionMethods.filter(m => m.type === currentType);
                                                if (variants.length === 0) return null;
                                                return (
                                                    <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                                                        <label>Select Variant</label>
                                                        <select value={isCreatingNew ? 'DEFAULT' : watch(`methods.${index}.methodId`)} onChange={(e) => handleVariantChange(index, e.target.value)} style={styles.input}>
                                                            <option value="DEFAULT">Default (Start Fresh)</option>
                                                            <optgroup label="My Saved Variants">
                                                                {variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                            </optgroup>
                                                        </select>
                                                    </div>
                                                );
                                            })()}

                                            {/* --- HOISTED COUPON FIELDS (Quick Access) --- */}
                                            {/* Only show if creating new (draft) and it is a coupon */}
                                            {(() => {
                                                // Update: Allow rendering if we have a draftMethod with correct type, regardless of isCreatingNew
                                                const draft = watch(`methods.${index}.draftMethod`);
                                                if (!draft || draft.type !== 'coupon_display') return null;

                                                // Helper: Auto-fork on edit
                                                const handleTouch = () => {
                                                    const current = getValues(`methods.${index}`);
                                                    if (!current.isCreatingNew) {
                                                        setValue(`methods.${index}.isCreatingNew`, true);
                                                        setValue(`methods.${index}.methodId`, ''); // Clear ID to force new creation
                                                    }
                                                };

                                                return (
                                                    <div style={{ marginTop: '1rem', padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '6px' }}>
                                                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Coupon Code & Logic</h4>
                                                        
                                                        {/* Row 1: Type & Code */}
                                                        <div style={styles.configRow}>
                                                            <div style={styles.configItem}>
                                                                <label>Coupon Type</label>
                                                                <select 
                                                                    {...register(`methods.${index}.draftMethod.codeType`, { onChange: handleTouch })} 
                                                                    style={styles.input}
                                                                >
                                                                    <option value="static">Static Code</option>
                                                                    <option value="dynamic" disabled>Dynamic (Coming Soon)</option>
                                                                </select>
                                                            </div>
                                                            <div style={styles.configItem}>
                                                                <label>Static Code</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="" 
                                                                    {...register(`methods.${index}.draftMethod.staticCode`, {
                                                                        onChange: (e) => {
                                                                            handleTouch();
                                                                            // Update: Enforce Uppercase
                                                                            setValue(`methods.${index}.draftMethod.staticCode`, e.target.value.toUpperCase());
                                                                        }
                                                                    })} 
                                                                    style={{ ...styles.input, textTransform: 'uppercase' }} 
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Row 2: Discount & Value */}
                                                        <div style={{...styles.configRow, marginTop: '1rem'}}>
                                                            <div style={styles.configItem}>
                                                                <label>Discount Type</label>
                                                                <select 
                                                                    {...register(`methods.${index}.draftMethod.discountType`, { onChange: handleTouch })} 
                                                                    style={styles.input}
                                                                >
                                                                    <option value="percentage">% Percentage</option>
                                                                    <option value="fixed_amount">$ Fixed</option>
                                                                </select>
                                                            </div>
                                                            <div style={styles.configItem}>
                                                                <label>Value</label>
                                                                <Controller
                                                                    name={`methods.${index}.draftMethod.discountValue`}
                                                                    control={control}
                                                                    render={({ field }) => {
                                                                        const type = watch(`methods.${index}.draftMethod.discountType`);
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

                                                    {/* REVEAL SETTINGS BLOCK */}
                                                    <div style={{ marginTop: '1.5rem', backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '4px', border: '1px solid #eee' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', width: '100%' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0, fontSize: '0.95rem', color: '#333' }}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    {...register(`methods.${index}.draftMethod.clickToReveal`, {
                                                                        onChange: (e) => {
                                                                            if (e.target.checked) {
                                                                                // 1. Text & Icon Defaults
                                                                                setValue(`methods.${index}.draftMethod.maskConfig.headline`, "Click to Reveal the Coupon Code");
                                                                                setValue(`methods.${index}.draftMethod.maskConfig.showIcon`, true);
                                                                                
                                                                                // 2. Color Defaults based on Scope
                                                                                const currentScope = getValues(`methods.${index}.draftMethod.revealScope`);
                                                                                const maskPrefix = `methods.${index}.draftMethod.maskConfig`;

                                                                                if (currentScope === 'code_only') {
                                                                                    // Dark Theme (Yellow/Black)
                                                                                    setValue(`${maskPrefix}.style.backgroundColor`, "#cfc33a");
                                                                                    setValue(`${maskPrefix}.style.textColor`, "#000000");
                                                                                    // Light Theme (Dark/White)
                                                                                    setValue(`${maskPrefix}.lightStyle.backgroundColor`, "#1a1a1a");
                                                                                    setValue(`${maskPrefix}.lightStyle.textColor`, "#ffffff");
                                                                                } else {
                                                                                    setValue(`${maskPrefix}.style.backgroundColor`, "#1a1a1a");
                                                                                    setValue(`${maskPrefix}.style.textColor`, "#ffffff");
                                                                                }
                                                                            }
                                                                        }
                                                                    })} 
                                                                />
                                                                <span style={{ fontWeight: 'bold' }}>Enable Click to Reveal</span>
                                                            </label>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setPreviewRefreshKey(prev => prev + 1)} 
                                                                title="Reset Preview to test reveal" 
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <span style={{ fontSize: '1.2rem' }}>↻</span>
                                                            </button>
                                                        </div>

                                                        {watch(`methods.${index}.draftMethod.clickToReveal`) && (
                                                            <>
                                                                <div style={{ marginBottom: '1.5rem' }}>
                                                                    <div style={styles.configItem}>
                                                                        <label>Reveal Scope</label>
                                                                        <select 
                                                                            {...register(`methods.${index}.draftMethod.revealScope`, {
                                                                                onChange: (e) => {
                                                                                    const val = e.target.value;
                                                                                    const maskPrefix = `methods.${index}.draftMethod.maskConfig`;

                                                                                    if (val === 'code_only') {
                                                                                        // Dark Theme (Yellow/Black)
                                                                                        setValue(`${maskPrefix}.style.backgroundColor`, "#cfc33a");
                                                                                        setValue(`${maskPrefix}.style.textColor`, "#000000");
                                                                                        
                                                                                        // Light Theme (Dark/White)
                                                                                        setValue(`${maskPrefix}.lightStyle.backgroundColor`, "#1a1a1a");
                                                                                        setValue(`${maskPrefix}.lightStyle.textColor`, "#ffffff");
                                                                                    } else {
                                                                                        // Full Reveal Defaults
                                                                                        
                                                                                        // Dark Theme (Dark/White)
                                                                                        setValue(`${maskPrefix}.style.backgroundColor`, "#1a1a1a");
                                                                                        setValue(`${maskPrefix}.style.textColor`, "#ffffff");

                                                                                        // Light Theme (Light/Black)
                                                                                        setValue(`${maskPrefix}.lightStyle.backgroundColor`, "#f5f5f5");
                                                                                        setValue(`${maskPrefix}.lightStyle.textColor`, "#000000");
                                                                                    }
                                                                                }
                                                                            })} 
                                                                            style={styles.input}
                                                                        >
                                                                            <option value="entire_card">Cover Entire Coupon</option>
                                                                            <option value="code_only">Cover Code Only</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Unified Mask Configuration Form */}
                                                                <MaskConfigurationForm 
                                                                    register={register}
                                                                    control={control}
                                                                    prefix={`methods.${index}.draftMethod.maskConfig`}
                                                                    defaultHeadline="Click to Reveal the Coupon Code"
                                                                    isCodeOnlyScope={watch(`methods.${index}.draftMethod.revealScope`) === 'code_only'}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })()}

                                            {/* 3. Edit / Customize Button */}
                                            {(watch(`methods.${index}.methodId`) || watch(`methods.${index}.isCreatingNew`)) && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const current = getValues(`methods.${index}`);
                                                            if (!current.isCreatingNew && !current.isExpanded) {
                                                                const originalId = current.methodId;
                                                                const originalData = allConversionMethods.find(m => m.id === originalId);
                                                                if (originalData) {
                                                                    update(index, {
                                                                        ...current,
                                                                        isCreatingNew: true,
                                                                        isExpanded: true,
                                                                        methodId: '',
                                                                        draftMethod: { ...originalData }
                                                                    });
                                                                    return;
                                                                }
                                                            }
                                                            update(index, { ...current, isExpanded: !current.isExpanded });
                                                        }} 
                                                        style={watch(`methods.${index}.isExpanded`) ? { ...styles.secondaryButton, backgroundColor: '#e4e6eb', color: '#666' } : styles.secondaryButton}
                                                    >
                                                        {watch(`methods.${index}.isExpanded`) ? 'Close Editor' : 'Edit / Customize Method'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* 4. The Builder Form */}
                                            {(watch(`methods.${index}.isCreatingNew`) && watch(`methods.${index}.isExpanded`)) && (
                                                <div style={{ marginTop: '1rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                                                    <ConversionMethodFormFields 
                                                        control={control} 
                                                        register={register} 
                                                        watch={watch} 
                                                        setValue={setValue} 
                                                        getValues={getValues} 
                                                        prefix={`methods.${index}.draftMethod`} 
                                                        hideTypeSelector={true}
                                                        // Note: You will need to add this prop to ConversionMethodFormFields definition
                                                        hideCouponConfiguration={true}
                                                    />
                                                </div>
                                            )}

                                            {/* 5. Gate Controls */}
                                            {(watch(`methods.${index}.methodId`) || watch(`methods.${index}.isCreatingNew`)) && (
                                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                                                    <div style={styles.configItem}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <label>Gate Type (Lock this method?)</label>
                                                            {/* REFRESH BUTTON */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewRefreshKey(prev => prev + 1)}
                                                                title="Reset Preview to test gating logic"
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: '#0866ff',
                                                                    fontSize: '0.85rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.25rem',
                                                                    padding: 0
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '1.1rem' }}>↻</span> Reset Preview
                                                            </button>
                                                        </div>
                                                        <select 
                                                            {...register(`methods.${index}.gate.type`, {
                                                                onChange: (e) => {
                                                                    const val = e.target.value;
                                                                    setValue(`methods.${index}.gate.type`, val as any);

                                                                    // 1. Clear Prerequisite ID if not on_success
                                                                    if (val !== 'on_success') {
                                                                        setValue(`methods.${index}.gate.methodInstanceId`, undefined);
                                                                    }

                                                                    // 2. Set Defaults for the Mask based on Type
                                                                    const maskPath = `methods.${index}.gate.maskConfig`;
                                                                    
                                                                    if (val === 'point_threshold') {
                                                                        setValue(`${maskPath}.headline`, "Earn enough points to unlock the reward!");
                                                                        setValue(`${maskPath}.showIcon`, true);
                                                                    } else if (val === 'point_purchase') {
                                                                        setValue(`${maskPath}.headline`, "Use your points to purchase a reward!");
                                                                        setValue(`${maskPath}.showIcon`, true);
                                                                    } else if (val === 'on_success') {
                                                                        // Set default for success gate (visible when 'locked_mask' is chosen later)
                                                                        setValue(`${maskPath}.headline`, "Complete the previous step to unlock this reward!");
                                                                        setValue(`${maskPath}.showIcon`, true);
                                                                    }
                                                                }
                                                            })} 
                                                            style={styles.input}
                                                        >
                                                            <option value="none">None (Always Visible)</option>
                                                            <option value="on_success">On Method Success</option>
                                                            <option value="point_threshold">Point Threshold (Milestone)</option>
                                                            <option value="point_purchase">Point Purchase (Spend)</option>
                                                        </select>
                                                    </div>
                                                    
                                                    {/* UI for On Success */}
                                                    {watch(`methods.${index}.gate.type`) === 'on_success' && (
                                                        <>
                                                            <div style={{ marginTop: '0.5rem' }}>
                                                                <label style={{ fontSize: '0.9rem' }}>Required Method</label>
                                                                <select {...register(`methods.${index}.gate.methodInstanceId`)} style={styles.input}>
                                                                    <option value="">Select prerequisite...</option>
                                                                    {availableGates.map((g, i) => (
                                                                        <option key={g.instanceId} value={g.instanceId}>Method {i + 1}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Show Locked Mask?</label>
                                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                            <input type="radio" value="hidden" {...register(`methods.${index}.gate.visibility` as any)} defaultChecked={!watch(`methods.${index}.gate.visibility`) || watch(`methods.${index}.gate.visibility`) === 'hidden'} style={{ marginRight: '0.3rem' }} /> No (Hide)
                                                                        </label>
                                                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                            <input type="radio" value="locked_mask" {...register(`methods.${index}.gate.visibility` as any)} style={{ marginRight: '0.3rem' }} /> Yes (Mask)
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Replace Prerequisite?</label>
                                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                            <input 
                                                                                type="radio" 
                                                                                value="false" 
                                                                                {...register(`methods.${index}.gate.replacePrerequisite` as any)} 
                                                                                style={{ marginRight: '0.3rem' }} 
                                                                            /> 
                                                                            No
                                                                        </label>
                                                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                            <input 
                                                                                type="radio" 
                                                                                value="true" 
                                                                                {...register(`methods.${index}.gate.replacePrerequisite` as any)} 
                                                                                style={{ marginRight: '0.3rem' }} 
                                                                            /> 
                                                                            Yes
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Helper UI for Points */}
                                                    {(watch(`methods.${index}.gate.type`) === 'point_threshold' || watch(`methods.${index}.gate.type`) === 'point_purchase') && (
                                                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#eaf5fc', borderRadius: '4px', border: '1px solid #b6d4fe', color: '#084298', fontSize: '0.85rem' }}>
                                                            <strong>Note:</strong> You will set the actual point value for this reward in the <em>Macrogame Creator</em>. The controls below are just for previewing the look.
                                                        </div>
                                                    )}

                                                    {/* Point Threshold Simulation Controls */}
                                                    {watch(`methods.${index}.gate.type`) === 'point_threshold' && (
                                                        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '6px', background: '#fafafa' }}>
                                                            <h6 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Preview Simulation</h6>
                                                            
                                                            <div style={{ marginBottom: '1rem' }}>
                                                                <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                                                    Progress
                                                                    <span>{simProgress}%</span>
                                                                </label>
                                                                <input 
                                                                    type="range" 
                                                                    min="0" max="100" 
                                                                    value={simProgress} 
                                                                    onChange={(e) => setSimProgress(Number(e.target.value))}
                                                                    style={{ width: '100%' }} 
                                                                />
                                                            </div>

                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                                                                <input type="checkbox" {...register(`methods.${index}.gate.maskConfig.showPointLabel`)} />
                                                                Include "Point Label" (e.g. 500 / 1000 Points)
                                                            </label>

                                                            {watch(`methods.${index}.gate.maskConfig.showPointLabel`) && (
                                                                <div style={styles.configItem}>
                                                                    <label style={{ fontSize: '0.8rem' }}>Simulated "Required Points"</label>
                                                                    <input 
                                                                        type="number" 
                                                                        value={simReqPoints} 
                                                                        onChange={(e) => setSimReqPoints(Number(e.target.value))}
                                                                        style={styles.input} 
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* --- MASK CONFIGURATION FORM --- */}
                                                    {/* Show if: 
                                                        1. Gate is Point Purchase
                                                        2. Gate is On Success AND Visibility is 'locked_mask' 
                                                        3. Gate is Point Threshold
                                                    */}
                                                    {(() => {
                                                        const gType = watch(`methods.${index}.gate.type`);
                                                        const gVis = watch(`methods.${index}.gate.visibility`);
                                                        
                                                        const showMaskConfig = 
                                                            gType === 'point_purchase' || 
                                                            gType === 'point_threshold' ||
                                                            (gType === 'on_success' && gVis === 'locked_mask');

                                                        if (!showMaskConfig) return null;

                                                        return (
                                                            <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                                                                <MaskConfigurationForm 
                                                                    register={register}
                                                                    control={control}
                                                                    prefix={`methods.${index}.gate.maskConfig`}
                                                                    defaultHeadline={gType === 'point_purchase' ? "Purchase Reward" : "LOCKED"}
                                                                    maskType={gType as any} // Pass the gate type to control color pickers
                                                                />
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Below */}
                                        {(!showContentBelow && (watch(`methods.${index}.methodId`) || watch(`methods.${index}.isCreatingNew`))) && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    // Update: Restore from memory if exists
                                                    const instanceId = getValues(`methods.${index}.instanceId`);
                                                    const saved = lastMethodContent.current[instanceId]?.below;
                                                    if (saved) setValue(`methods.${index}.contentBelow`, saved);

                                                    setValue(`methods.${index}.showContentBelow`, true);
                                                }} 
                                                style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginTop: '1rem', width: '100%' }}
                                            >
                                                + Add Content Block (Below Method)
                                            </button>
                                        )}
                                        {showContentBelow && (
                                            <div style={{ marginTop: '1rem', borderLeft: '3px solid #0866ff', paddingLeft: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Content Below</label>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => { 
                                                            // Update: Save to memory before clearing
                                                            const instanceId = getValues(`methods.${index}.instanceId`);
                                                            const currentVal = getValues(`methods.${index}.contentBelow`);
                                                            if (!lastMethodContent.current[instanceId]) lastMethodContent.current[instanceId] = {};
                                                            lastMethodContent.current[instanceId].below = currentVal;

                                                            setValue(`methods.${index}.showContentBelow`, false); 
                                                            setValue(`methods.${index}.contentBelow`, ''); 
                                                        }} 
                                                        style={{ color: '#d9534f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <SimpleTextEditor initialHtml={getValues(`methods.${index}.contentBelow`)} onChange={(html) => setValue(`methods.${index}.contentBelow`, html)} backgroundColor={editorStyle.backgroundColor} defaultTextColor={editorStyle.defaultTextColor} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add Method Button with Auto-Collapse Logic */}
                    {(() => {
                        const lastMethod = fields[fields.length - 1];
                        // Logic: Can add if NO methods exist, OR if the last method has a selection
                        const canAdd = !lastMethod || (watch(`methods.${fields.length - 1}.methodId`) || watch(`methods.${fields.length - 1}.isCreatingNew`));
                        
                        return canAdd && (
                            <button 
                                type="button" 
                                onClick={() => {
                                    // 1. Collapse all existing methods to save space
                                    const currentMethods = getValues('methods');
                                    const collapsedMethods = currentMethods.map(m => ({ ...m, isSectionCollapsed: true }));
                                    
                                    // 2. Update the list with collapsed items + new open item
                                    replace([
                                        ...collapsedMethods,
                                        { 
                                            instanceId: generateUUID(), 
                                            methodId: '', 
                                            isCreatingNew: false, 
                                            isSectionCollapsed: false, // New one starts open
                                            showContentAbove: false, 
                                            contentAbove: '', 
                                            showContentBelow: false, 
                                            contentBelow: '', 
                                            gate: { type: 'none' } 
                                        }
                                    ]);
                                }} 
                                style={{ ...styles.secondaryButton, marginTop: '1rem' }}
                            >
                                + Add Method
                            </button>
                        );
                    })()}
                </div>

                {/* Layout & Sizing Section (Below Methods) */}
                <div style={{ marginTop: '3rem', padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                    <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1.5rem' }}>Layout & Sizing</h4>
                    <div style={styles.configRow}>
                        <div style={styles.configItem}>
                            <label>
                                Container Width (%)
                                {previewOrientation === 'portrait' && <span style={{ color: '#f39c12', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(Locked in Portrait)</span>}
                            </label>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* 1. Slider (Coarse Adjustment) */}
                                <input 
                                    type="range" 
                                    min="20" 
                                    max="100" 
                                    step="5"
                                    {...register("style.width", { valueAsNumber: true })} 
                                    disabled={previewOrientation === 'portrait'}
                                    style={{
                                        flex: 1, // Takes up remaining space
                                        cursor: previewOrientation === 'portrait' ? 'not-allowed' : 'pointer',
                                        opacity: previewOrientation === 'portrait' ? 0.5 : 1,
                                        margin: 0
                                    }}
                                />

                                {/* 2. Number Input (Fine Adjustment) */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100"
                                        placeholder="60"
                                        value={watch("style.width") ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            // 1. Allow empty string
                                            if (val === '') {
                                                setValue("style.width", '' as any);
                                                return;
                                            }
                                            
                                            // 2. Parse and Clamp
                                            let num = parseInt(val);
                                            if (isNaN(num)) return;
                                            
                                            if (num > 100) num = 100;
                                            if (num < 0) num = 0;
                                            
                                            setValue("style.width", num);
                                        }}
                                        onBlur={(e) => {
                                            // Enforce visual floor on blur only
                                            let val = parseInt(e.target.value);
                                            if (isNaN(val)) return;
                                            if (val < 20 && val !== 0) setValue("style.width", 20); 
                                        }}
                                        disabled={previewOrientation === 'portrait'}
                                        style={{
                                            ...styles.input,
                                            // Update: Increased width to accommodate arrows + text + %
                                            width: '100px',
                                            // Update: Align text left so right-side arrows don't cover digits
                                            textAlign: 'left',
                                            // Update: clear space on right for % sign and arrows
                                            paddingRight: '2.5rem', 
                                            backgroundColor: previewOrientation === 'portrait' ? '#e9ecef' : '#fff',
                                            color: previewOrientation === 'portrait' ? '#6c757d' : 'inherit',
                                            cursor: previewOrientation === 'portrait' ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <span style={{ 
                                        position: 'absolute', 
                                        // Update: Move % leftward (25px) to sit to the left of the hover spinner arrows
                                        right: '25px', 
                                        fontSize: '0.8rem', 
                                        color: '#666',
                                        opacity: previewOrientation === 'portrait' ? 0.5 : 1 
                                    }}>%</span>
                                </div>
                            </div>
                        </div>
                        <div style={styles.configItem}>
                            <label>Vertical Spacing (px)</label>
                            <input 
                                type="number" 
                                min="0" 
                                max="120" 
                                placeholder=""
                                {...register("style.spacing")} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // 1. Allow empty string (User backspaced everything)
                                    if (val === '') {
                                        setValue("style.spacing", '' as any);
                                        return;
                                    }

                                    // 2. Parse and Clamp
                                    let num = parseInt(val);
                                    if (isNaN(num)) return;

                                    if (num > 120) { num = 120; e.target.value = "120"; }
                                    if (num < 0) { num = 0; e.target.value = "0"; }
                                    
                                    setValue("style.spacing", num);
                                }}
                                style={styles.input} 
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingBottom: '2rem' }}>
                    <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancel</button>
                    <button type="button" onClick={handleSubmit(handleSave)} style={styles.saveButton} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Conversion Screen'}</button>
                </div>
            </div>

            {/* RIGHT: PREVIEW - Fits nicely, doesn't force page scroll */}
            <div style={{ flex: 1, minWidth: 0, height: '100%', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '1rem', border: '1px solid #eee' }}>
                <StaticConversionPreview 
                    key={previewRefreshKey} 
                    screen={previewScreen} 
                    themeMode={previewTheme}
                    onThemeChange={setPreviewTheme}
                    orientation={previewOrientation}
                    onOrientationChange={setPreviewOrientation}
                    // Calculate simulated score based on slider %
                    previewTotalScore={Math.floor(simReqPoints * (simProgress / 100))}
                    // Construct a map of instanceId -> simulatedCost
                    previewPointCosts={
                        previewScreen.methods.reduce((acc: any, m: any) => {
                            acc[m.instanceId] = simReqPoints;
                            return acc;
                        }, {})
                    }
                />
            </div>
        </div>
    );
};