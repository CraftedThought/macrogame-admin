import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { styles } from '../../App.styles';
import { Reward } from '../../types';
import { useData } from '../../context/DataContext'; // <-- IMPORT HOOK

export const RewardsPage: React.FC = () => { // <-- PROPS REMOVED
    const { allRewards } = useData(); // <-- GET DATA FROM HOOK

    const [newRewardName, setNewRewardName] = useState('');
    const [newRewardType, setNewRewardType] = useState('percentage_discount');
    const [newRewardValue, setNewRewardValue] = useState('');
    const [newRewardCodeType, setNewRewardCodeType] = useState<'single' | 'unique'>('single');

    const handleCreateReward = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRewardName.trim()) {
            alert("Please enter a reward name.");
            return;
        }
        const newReward: Omit<Reward, 'id'> = {
            name: newRewardName,
            type: newRewardType as any,
            value: newRewardValue,
            codeType: newRewardCodeType,
            createdAt: new Date().toISOString(),
            redemptions: 0,
            conversionRate: 0
        };
        await addDoc(collection(db, 'rewards'), newReward);
        setNewRewardName('');
        setNewRewardValue('');
    };

    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Reward Management</h2>
            {/* The rest of the component remains the same... */}
            <div style={styles.rewardsPageLayout}>
                <div style={styles.rewardsListContainer}>
                    <h3 style={styles.h3}>Existing Rewards</h3>
                    {allRewards.length > 0 ? (
                        <ul style={styles.rewardsListFull}>
                            {allRewards.map(reward => (
                                <li key={reward.id} style={styles.rewardListItem}>
                                    <div style={styles.rewardInfo}>
                                        <strong>{reward.name}</strong>
                                        <div style={styles.rewardAnalytics}>
                                            <span>Redemptions: {reward.redemptions}</span>
                                            <span>Conv. Rate: {(reward.conversionRate * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div style={styles.rewardActions}>
                                        <button style={styles.editButton}>Edit</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p>No rewards created yet.</p>}
                </div>
                <form onSubmit={handleCreateReward} style={styles.rewardsCreateForm}>
                    <h3 style={styles.h3}>Create New Reward</h3>
                    <div style={styles.configItem}><label>Reward Name</label><input type="text" placeholder="e.g., 15% Off Summer Sale" value={newRewardName} onChange={e => setNewRewardName(e.target.value)} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Reward Type</label><select value={newRewardType} onChange={e => setNewRewardType(e.target.value)} style={styles.input}><option value="percentage_discount">% Discount</option><option value="fixed_discount">$ Discount</option><option value="free_shipping">Free Shipping</option></select></div>
                    <div style={styles.configItem}><label>Value / Amount</label><input type="text" placeholder="e.g., 15" value={newRewardValue} onChange={e => setNewRewardValue(e.target.value)} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Code Type</label><select value={newRewardCodeType} onChange={e => setNewRewardCodeType(e.target.value as 'single' | 'unique')} style={styles.input}><option value="single">Single Static Code</option><option value="unique">List of Unique Codes</option></select></div>
                    <button type="submit" style={styles.createButton}>Create Reward</button>
                </form>
            </div>
        </div>
    );
};