// src/components/modals/EditRewardModal.tsx

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { styles } from '../../App.styles';
import { Reward } from '../../types';
import { useData } from '../../context/DataContext';

interface EditRewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    reward: Reward | null;
}

type RewardFormInputs = Partial<Omit<Reward, 'id'>>;

export const EditRewardModal: React.FC<EditRewardModalProps> = ({ isOpen, onClose, reward }) => {
    const { updateReward } = useData();
    
    const { register, handleSubmit, reset, watch } = useForm<RewardFormInputs>();
    
    const rewardType = watch('type');

    useEffect(() => {
        if (reward) {
            reset({
                name: reward.name,
                type: reward.type,
                value: reward.value,
                codeType: reward.codeType,
                appliesTo: reward.appliesTo || 'entire_order',
                minimumPurchaseAmount: reward.minimumPurchaseAmount ?? 0, // Default to 0 if null/undefined
                limitToOneUsePerCustomer: reward.limitToOneUsePerCustomer !== false,
            });
        }
    }, [reward, reset]);

    const handleSave: SubmitHandler<RewardFormInputs> = async (data) => {
        if (!reward || !data.name?.trim()) { alert("Reward name cannot be empty."); return; }
        
        const dataToUpdate = {
            ...data,
            minimumPurchaseAmount: data.minimumPurchaseAmount === null ? null : Number(data.minimumPurchaseAmount) || null,
        };
        
        await updateReward(reward.id, dataToUpdate);
        alert('Reward updated successfully!');
        onClose();
    };

    if (!isOpen || !reward) return null;

    const showValueField = rewardType === 'percentage_discount' || rewardType === 'fixed_discount';

    return (
        <div style={styles.modalOverlay}>
            <form onSubmit={handleSubmit(handleSave)} style={styles.modalContent}>
                <div style={styles.modalHeader}><h2>Edit Reward</h2><button type="button" onClick={onClose} style={styles.modalCloseButton}>&times;</button></div>
                <div style={styles.modalBody}>
                    <div style={styles.configItem}><label>Internal Reward Name</label><input type="text" placeholder="e.g., 15% Off Sitewide" {...register("name")} style={styles.input} /></div>
                    <div style={{...styles.configRow, marginTop: '1rem'}}>
                       <div style={styles.configItem}><label>Reward Type</label><select {...register("type")} style={styles.input}><option value="percentage_discount">% Discount</option><option value="fixed_discount">$ Discount</option><option value="free_shipping">Free Shipping</option><option value="bogo">Buy X, Get Y (BOGO)</option></select></div>
                        {showValueField && (<div style={styles.configItem}><label>Discount Value</label><input type="text" placeholder="e.g., 15" {...register("value")} style={styles.input} /></div>)}
                        {showValueField && (<div style={styles.configItem}><label>Applies To</label><select {...register("appliesTo")} style={styles.input}><option value="entire_order">Entire Order</option><option value="specific_products">Specific Products</option><option value="specific_collections">Specific Collections</option></select></div>)}
                    </div>
                    <h4 style={{...styles.h4, marginTop: '2rem'}}>Validation & Usage Rules</h4>
                    <div style={styles.configRow}>
                        <div style={styles.configItem}>
                            <label>Minimum Purchase Amount ($)</label>
                            <input
                                type="number"
                                placeholder="e.g., 50"
                                {...register("minimumPurchaseAmount", { setValueAs: v => v === "" ? null : parseInt(v, 10) })}
                                style={styles.input}
                            />
                        </div>
                    </div>
                     <div style={{...styles.configRow, marginTop: '1rem'}}>
                        <div style={{...styles.configItem, flex: '0 0 auto', alignItems: 'center', flexDirection: 'row'}}><input type="checkbox" {...register("limitToOneUsePerCustomer")} id="limit-one-use-edit" /><label htmlFor="limit-one-use-edit" style={{marginLeft: '0.5rem'}}>Limit to one use per customer</label></div>
                        <div style={styles.configItem}><label>Code Type</label><select {...register("codeType")} style={styles.input}><option value="single">Single Static Code</option><option value="unique">List of Unique Codes</option></select></div>
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
                    <button type="submit" style={styles.saveButton}>Save Changes</button>
                </div>
            </form>
        </div>
    );
};