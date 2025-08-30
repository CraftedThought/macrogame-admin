// src/components/views/RewardsPage.tsx

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { styles } from '../../App.styles';
import { Reward } from '../../types';
import { useData } from '../../context/DataContext';
import { EditRewardModal } from '../modals/EditRewardModal';
import { PaginatedList } from '../ui/PaginatedList';

type RewardFormInputs = Partial<Omit<Reward, 'id' | 'createdAt' | 'redemptions' | 'conversionRate'>>;

const DEFAULT_REWARD_STATE: RewardFormInputs = {
    name: '', type: 'percentage_discount', value: '', codeType: 'single',
    appliesTo: 'entire_order', minimumPurchaseAmount: 0, limitToOneUsePerCustomer: true,
    startDate: '', endDate: '',
};

export const RewardsPage: React.FC = () => {
    const { allRewards, createReward, deleteReward, duplicateReward, deleteMultipleRewards } = useData();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [rewardToEdit, setRewardToEdit] = useState<Reward | null>(null);

    const { register, handleSubmit, reset, watch } = useForm<RewardFormInputs>({
        defaultValues: DEFAULT_REWARD_STATE
    });

    const rewardType = watch('type');

    const handleCreateReward: SubmitHandler<RewardFormInputs> = async (data) => {
        if (!data.name?.trim()) { alert("Please enter a reward name."); return; }
        const newReward: Omit<Reward, 'id'> = {
            ...data,
            name: data.name,
            type: data.type || 'percentage_discount',
            value: data.value || '',
            codeType: data.codeType || 'single',
            minimumPurchaseAmount: data.minimumPurchaseAmount === null ? null : Number(data.minimumPurchaseAmount) || null,
            createdAt: new Date().toISOString(),
            redemptions: 0,
            conversionRate: 0,
        };
        await createReward(newReward);
        reset(DEFAULT_REWARD_STATE);
        alert('Reward created successfully!');
    };

    const handleEditClick = (reward: Reward) => {
        setRewardToEdit(reward);
        setIsEditModalOpen(true);
    };

    const renderRewardItem = (reward: Reward, isSelected: boolean, onToggleSelect: () => void) => (
        <li key={reward.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
             <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
            <div style={{...styles.rewardInfo, flex: 1}}>
                <strong>{reward.name}</strong>
                <div style={styles.rewardAnalytics}>
                    <span>Redemptions: {reward.redemptions}</span>
                    <span>Conv. Rate: {(reward.conversionRate * 100).toFixed(1)}%</span>
                </div>
            </div>
            <div style={styles.rewardActions}>
                <button onClick={() => duplicateReward(reward)} style={styles.editButton}>Duplicate</button>
                <button onClick={() => handleEditClick(reward)} style={styles.editButton}>Edit</button>
                <button onClick={() => deleteReward(reward.id)} style={styles.deleteButton}>Delete</button>
            </div>
        </li>
    );

    const showValueField = rewardType === 'percentage_discount' || rewardType === 'fixed_discount';

    return (
        <>
            <EditRewardModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} reward={rewardToEdit}/>
            <div style={styles.creatorSection}>
                <h2 style={styles.h2}>Reward Manager</h2>
                <form onSubmit={handleSubmit(handleCreateReward)}>
                    <h3 style={styles.h3}>Create New Reward</h3>
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
                        <div style={styles.configItem}><label>Start Date</label><input type="date" {...register("startDate")} style={styles.input} /></div>
                        <div style={styles.configItem}><label>End Date</label><input type="date" {...register("endDate")} style={styles.input} /></div>
                    </div>
                    <div style={{...styles.configRow, marginTop: '1rem'}}>
                        <div style={{...styles.configItem, flex: '0 0 auto', alignItems: 'center', flexDirection: 'row'}}><input type="checkbox" {...register("limitToOneUsePerCustomer")} id="limit-one-use" /><label htmlFor="limit-one-use" style={{marginLeft: '0.5rem'}}>Limit to one use per customer</label></div>
                        <div style={styles.configItem}><label>Code Type</label><select {...register("codeType")} style={styles.input}><option value="single">Single Static Code</option><option value="unique">List of Unique Codes</option></select></div>
                    </div>
                    <button type="submit" style={{...styles.createButton, marginTop: '2rem' }}>Create Reward</button>
                </form>
                <div style={styles.rewardsListContainer}>
                    <h3 style={{...styles.h3, marginTop: '3rem'}}>Existing Rewards</h3>
                    {allRewards.length > 0 ? (
                        <PaginatedList
                            items={allRewards}
                            renderItem={renderRewardItem}
                            bulkActions={[{
                                label: 'Delete Selected',
                                onAction: (selectedItems) => deleteMultipleRewards(selectedItems.map(item => item.id))
                            }]}
                            listContainerComponent="ul"
                            listContainerStyle={styles.rewardsListFull}
                        />
                    ) : <p>No rewards created yet.</p>}
                </div>
            </div>
        </>
    );
};