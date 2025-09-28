// src/components/views/ConversionsManagerPage.tsx

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionMethod, ConversionScreen } from '../../types';
import { useData } from '../../hooks/useData';
import { PaginatedList } from '../ui/PaginatedList';
import { EditConversionModal } from '../modals/EditConversionModal';
import { generateUUID } from '../../utils/helpers';
import { EditConversionScreenModal } from '../modals/EditConversionScreenModal';

// --- Sub-component for managing Conversion Methods ---
const MethodManager = () => {
    // ... (This component's code remains unchanged from the previous step)
    const { allConversionMethods, createConversionMethod, deleteConversionMethod, duplicateConversionMethod, deleteMultipleConversionMethods, updateConversionMethod } = useData();
    const [editingMethod, setEditingMethod] = useState<ConversionMethod | null>(null);
    
    const { register, handleSubmit, reset, watch, control } = useForm<Partial<Omit<ConversionMethod, 'id' | 'createdAt'>>>({
        defaultValues: { name: '', headline: '', subheadline: '', type: 'coupon_display', fields: [], links: [] }
    });

    const { fields, append: appendFormField, remove: removeFormField } = useFieldArray({ control, name: "fields" });
    const { fields: socialLinks, append: appendSocialLink, remove: removeSocialLink } = useFieldArray({ control, name: "links" });

    const selectedType = watch('type');

    useEffect(() => {
        const currentName = watch('name');
        const currentHeadline = watch('headline');
        const currentSubheadline = watch('subheadline');
        reset({ name: currentName, headline: currentHeadline, subheadline: currentSubheadline, type: selectedType, fields: [], links: [] });
    }, [selectedType, reset, watch]);

    const handleCreate: SubmitHandler<any> = async (data) => {
        if (!data.name?.trim()) { alert("Please enter a name."); return; }
        const baseData = { name: data.name, headline: data.headline || '', subheadline: data.subheadline || '', createdAt: new Date().toISOString() };
        let newMethod: Omit<ConversionMethod, 'id'>;

        switch (data.type) {
            case 'coupon_display':
                newMethod = { ...baseData, type: 'coupon_display', codeType: data.codeType || 'static', staticCode: data.staticCode || '', discountType: data.discountType || 'percentage', discountValue: Number(data.discountValue) || 0 };
                break;
            case 'email_capture':
                newMethod = { ...baseData, type: 'email_capture', submitButtonText: data.submitButtonText || 'Submit' };
                break;
            case 'link_redirect':
                newMethod = { ...baseData, type: 'link_redirect', buttonText: data.buttonText || 'Learn More', url: data.url || '', utmEnabled: data.utmEnabled || false };
                break;
            case 'form_submit':
                newMethod = { ...baseData, type: 'form_submit', fields: data.fields || [], submitButtonText: data.submitButtonText || 'Submit' };
                break;
            case 'social_follow':
                newMethod = { ...baseData, type: 'social_follow', links: data.links || [] };
                break;
            default:
                alert("Invalid method type.");
                return;
        }

        await createConversionMethod(newMethod);
        reset({ name: '', headline: '', subheadline: '', type: 'coupon_display', fields: [], links: [] });
        alert('Conversion method created successfully!');
    };

    const renderItem = (item: ConversionMethod, isSelected: boolean, onToggleSelect: () => void) => (
         <li key={item.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
            <div style={{...styles.rewardInfo, flex: 1}}>
                <strong>{item.name}</strong>
                <div style={styles.rewardAnalytics}><span style={styles.tag}>{item.type.replace(/_/g, ' ').toUpperCase()}</span></div>
            </div>
            <div style={styles.rewardActions}>
                <button onClick={() => duplicateConversionMethod(item)} style={styles.editButton}>Duplicate</button>
                <button onClick={() => setEditingMethod(item)} style={styles.editButton}>Edit</button>
                <button onClick={() => deleteConversionMethod(item.id)} style={styles.deleteButton}>Delete</button>
            </div>
        </li>
    );

    return (
        <div>
            <EditConversionModal isOpen={!!editingMethod} onClose={() => setEditingMethod(null)} conversion={editingMethod} />
            <form onSubmit={handleSubmit(handleCreate)}>
                <h3 style={styles.h3}>Create New Conversion Method</h3>
                <div style={styles.configRow}>
                    <div style={styles.configItem}><label>Internal Name</label><input type="text" placeholder="e.g., Summer Sale Coupon" {...register("name")} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Method Type</label><select {...register("type")} style={styles.input}>
                        <option value="coupon_display">Coupon Display</option>
                        <option value="email_capture">Email Capture</option>
                        <option value="link_redirect">Link Redirect</option>
                        <option value="form_submit">Form Submit</option>
                        <option value="social_follow">Social Follow</option>
                    </select></div>
                </div>
                
                <h4 style={{...styles.h4, marginTop: '2rem'}}>Configuration</h4>
                
                <div style={styles.configRow}>
                    <div style={styles.configItem}><label>Headline</label><input type="text" placeholder="e.g., You Won!" {...register("headline")} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Subheadline</label><input type="text" placeholder="e.g., Use this code at checkout." {...register("subheadline")} style={styles.input} /></div>
                </div>

                <div style={{marginTop: '1.5rem'}}>
                    {selectedType === 'coupon_display' && (
                        <div style={styles.configRow}>
                            <div style={styles.configItem}><label>Coupon Type</label><select {...register("codeType")} style={styles.input}><option value="static">Static Code</option><option value="dynamic" disabled>Dynamic Codes (Coming Soon)</option></select></div>
                            <div style={styles.configItem}><label>Static Code</label><input type="text" placeholder="SUMMER25" {...register("staticCode")} style={styles.input} /></div>
                            <div style={styles.configItem}><label>Discount Type</label><select {...register("discountType")} style={styles.input}><option value="percentage">% Percentage</option><option value="fixed_amount">$ Fixed Amount</option></select></div>
                            <div style={styles.configItem}><label>Discount Value</label><input type="number" step="0.01" {...register("discountValue")} style={styles.input} /></div>
                        </div>
                    )}
                    {selectedType === 'link_redirect' && (
                        <div>
                            <div style={styles.configRow}>
                                <div style={styles.configItem}><label>Button Text</label><input type="text" placeholder="Shop Now" {...register("buttonText")} style={styles.input} /></div>
                                <div style={styles.configItem}><label>Destination URL</label><input type="url" placeholder="https://..." {...register("url")} style={styles.input} /></div>
                            </div>
                             <div style={{...styles.configItem, marginTop: '1rem'}}><label><input type="checkbox" {...register("utmEnabled")} /> Enable UTM Tracking</label></div>
                        </div>
                    )}
                    {selectedType === 'email_capture' && (
                         <div style={styles.configItem}><label>Submit Button Text</label><input type="text" {...register("submitButtonText")} style={styles.input} /></div>
                    )}
                    {selectedType === 'form_submit' && (
                        <div>
                            {fields.map((field, index) => (
                                <div key={field.id} style={{...styles.configRow, border: '1px solid #eee', padding: '1rem', borderRadius: '6px', marginBottom: '1rem'}}>
                                    <div style={styles.configItem}><label>Field Label</label><input {...register(`fields.${index}.label`)} style={styles.input}/></div>
                                    <div style={styles.configItem}><label>Field Type</label><select {...register(`fields.${index}.type`)} style={styles.input}><option value="text">Text</option><option value="email">Email</option><option value="tel">Phone</option><option value="number">Number</option></select></div>
                                    <div style={{...styles.configItem, flex: '0 0 auto', justifyContent: 'center'}}><label><input type="checkbox" {...register(`fields.${index}.required`)} /> Required</label></div>
                                    <button type="button" onClick={() => removeFormField(index)} style={{...styles.deleteButton, alignSelf: 'flex-end'}}>Remove</button>
                                </div>
                            ))}
                            <button type="button" onClick={() => appendFormField({ label: '', type: 'text', required: true, name: `field_${fields.length + 1}` })} style={styles.secondaryButton}>Add Field</button>
                            <div style={{...styles.configItem, marginTop: '1rem'}}><label>Submit Button Text</label><input type="text" {...register("submitButtonText")} style={styles.input} /></div>
                        </div>
                    )}
                    {selectedType === 'social_follow' && (
                        <div>
                            {socialLinks.map((link, index) => (
                                <div key={link.id} style={{...styles.configRow, border: '1px solid #eee', padding: '1rem', borderRadius: '6px', marginBottom: '1rem'}}>
                                    <div style={styles.configItem}><label>Platform</label><select {...register(`links.${index}.platform`)} style={styles.input}><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="x">X (Twitter)</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="pinterest">Pinterest</option></select></div>
                                    <div style={styles.configItem}><label>Profile URL</label><input type="url" {...register(`links.${index}.url`)} style={styles.input}/></div>
                                    <button type="button" onClick={() => removeSocialLink(index)} style={{...styles.deleteButton, alignSelf: 'flex-end'}}>Remove</button>
                                </div>
                            ))}
                            <button type="button" onClick={() => appendSocialLink({ platform: 'instagram', url: '' })} style={styles.secondaryButton}>Add Link</button>
                        </div>
                    )}
                </div>
                <button type="submit" style={{...styles.createButton, marginTop: '2rem' }}>Create Method</button>
            </form>
            <div style={{marginTop: '3rem'}}>
                <h3 style={styles.h3}>Existing Conversion Methods</h3>
                <PaginatedList 
                    items={allConversionMethods} 
                    renderItem={renderItem} 
                    bulkActions={[{
                        label: 'Delete Selected',
                        onAction: (selectedItems) => deleteMultipleConversionMethods(selectedItems.map(item => item.id))
                    }]}
                    listContainerComponent="ul" 
                    listContainerStyle={styles.rewardsListFull} 
                />
            </div>
        </div>
    );
}

// --- Sub-component for managing Conversion Screens ---
const ScreenManager = () => {
    const { allConversionScreens, allConversionMethods, createConversionScreen, deleteConversionScreen, duplicateConversionScreen } = useData();
    // const [editingScreen, setEditingScreen] = useState<ConversionScreen | null>(null);

    const { register, handleSubmit, reset, control, watch } = useForm<Omit<ConversionScreen, 'id'>>({
        defaultValues: { name: '', headline: '', bodyText: '', layout: 'single_column', methods: [] }
    });

    const { fields, append, remove, move } = useFieldArray({ control, name: "methods", keyName: "key" });
    const watchedMethods = watch('methods');

    const handleCreate: SubmitHandler<Omit<ConversionScreen, 'id'>> = async (data) => {
        if (!data.name?.trim()) { alert("Please enter a screen name."); return; }
        if (data.methods.length === 0) { alert("Please add at least one conversion method to the screen."); return; }
        await createConversionScreen(data);
        reset();
        alert('Conversion Screen created!');
    };
    
    const renderItem = (item: ConversionScreen, isSelected: boolean, onToggleSelect: () => void) => (
        <li key={item.id} style={{...styles.rewardListItem, ...styles.listItemWithCheckbox}}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
            <div style={{...styles.rewardInfo, flex: 1}}>
                <strong>{item.name}</strong>
                <div style={styles.rewardAnalytics}><span>Methods: {item.methods?.length || 0}</span></div>
            </div>
            <div style={styles.rewardActions}>
                <button onClick={() => duplicateConversionScreen(item)} style={styles.editButton}>Duplicate</button>
                <button onClick={() => alert('Editing will be enabled in the next step!')} style={styles.editButton}>Edit</button>
                <button onClick={() => deleteConversionScreen(item.id)} style={styles.deleteButton}>Delete</button>
            </div>
        </li>
    );

    return (
        <div>
            {/* <EditConversionScreenModal isOpen={!!editingScreen} onClose={() => setEditingScreen(null)} screen={editingScreen} /> */}
            <form onSubmit={handleSubmit(handleCreate)}>
                <h3 style={styles.h3}>Create New Conversion Screen</h3>
                <div style={styles.configItem}><label>Internal Name</label><input type="text" placeholder="e.g., Default Post-Game Screen" {...register("name")} style={styles.input} /></div>
                
                <h4 style={{...styles.h4, marginTop: '2rem'}}>Screen Content & Styling</h4>
                <div style={styles.configRow}>
                    <div style={styles.configItem}><label>Headline</label><input type="text" placeholder="e.g., Congratulations!" {...register("headline")} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Body Text</label><input type="text" placeholder="Here are your rewards!" {...register("bodyText")} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Layout</label><select {...register("layout")} style={styles.input}><option value="single_column">Single Column</option></select></div>
                </div>
                
                <h4 style={{...styles.h4, marginTop: '2rem'}}>Conversion Methods</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {fields.map((field, index) => {
                        const availableGates = watchedMethods.filter((_, i) => i < index);
                        const selectedMethodId = watch(`methods.${index}.methodId`);
                        const selectedMethod = allConversionMethods.find(m => m.id === selectedMethodId);
                        
                        return (
                            <div key={field.key} style={{border: '1px solid #ccc', borderRadius: '8px', padding: '1rem'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <strong style={{fontSize: '1.1rem'}}>Step {index + 1}: {selectedMethod?.name || 'New Method'}</strong>
                                    <div>
                                        <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} style={styles.flowCardButton}>▲</button>
                                        <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} style={styles.flowCardButton}>▼</button>
                                        <button type="button" onClick={() => remove(index)} style={{...styles.deleteButton, marginLeft: '1rem'}}>Remove</button>
                                    </div>
                                </div>
                                <div style={styles.configRow}>
                                    <div style={styles.configItem}>
                                        <label>Method</label>
                                        <select {...register(`methods.${index}.methodId`)} style={styles.input}>
                                            <option value="">Select a method...</option>
                                            {allConversionMethods.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type.replace(/_/g, ' ')})</option>)}
                                        </select>
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Gate (Locked Offer)</label>
                                        <select {...register(`methods.${index}.gate.methodInstanceId`)} style={styles.input}>
                                            <option value="">None (Always Visible)</option>
                                            {availableGates.map(gateField => (
                                                <option key={gateField.instanceId} value={gateField.instanceId}>
                                                    Show after completing: Step {watchedMethods.findIndex(f => f.instanceId === gateField.instanceId) + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button type="button" onClick={() => append({ instanceId: generateUUID(), methodId: '', gate: undefined })} style={{...styles.secondaryButton, marginTop: '1rem'}}>Add Method to Screen</button>
                
                <button type="submit" style={{...styles.createButton, marginTop: '2rem' }}>Create Screen</button>
            </form>
            <div style={{marginTop: '3rem'}}>
                <h3 style={styles.h3}>Existing Conversion Screens</h3>
                <PaginatedList items={allConversionScreens} renderItem={renderItem} listContainerComponent="ul" listContainerStyle={styles.rewardsListFull}/>
            </div>
        </div>
    );
};

export const ConversionsManagerPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'screens' | 'methods'>('screens');

    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}>
                <h2 style={styles.h2}>Conversions Manager</h2>
            </div>
            <div style={styles.tabContainer}>
                <button onClick={() => setActiveTab('screens')} style={activeTab === 'screens' ? {...styles.tabButton, ...styles.tabButtonActive} : styles.tabButton}>Screens</button>
                <button onClick={() => setActiveTab('methods')} style={activeTab === 'methods' ? {...styles.tabButton, ...styles.tabButtonActive} : styles.tabButton}>Methods</button>
            </div>

            {activeTab === 'screens' ? <ScreenManager /> : <MethodManager />}
        </div>
    );
};