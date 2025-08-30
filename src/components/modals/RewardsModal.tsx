// src/components/modals/RewardsModal.tsx

import React, { useState, useEffect } from 'react';
import { styles } from '../../App.styles';
import { Macrogame, Reward, CurrentPage } from '../../types';

interface RewardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingRewards: Macrogame['rewards'];
    allRewards: Reward[];
    onSave: (rewards: Macrogame['rewards']) => void;
    setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({ isOpen, onClose, existingRewards, allRewards, onSave, setCurrentPage }) => {
    const [rewards, setRewards] = useState<Macrogame['rewards']>([]);

    useEffect(() => {
        if (isOpen) {
            // Filter out any rewards that are in the macrogame but no longer in the master `allRewards` list
            const allRewardIds = new Set(allRewards.map(r => r.id));
            const validExistingRewards = (existingRewards || []).filter(r => allRewardIds.has(r.rewardId));
            setRewards(validExistingRewards);
        }
    }, [existingRewards, allRewards, isOpen]);

    const handlePointChange = (rewardId: string, points: string) => {
        const numericPoints = points === '' ? 0 : Number(points);
        if (numericPoints < 0) return;
        setRewards(prev => prev.map(r => r.rewardId === rewardId ? { ...r, pointsCost: numericPoints } : r));
    };

    const handleToggleReward = (reward: Pick<Reward, 'id' | 'name'>) => {
        const isExisting = rewards.some(r => r.rewardId === reward.id);
        if (isExisting) {
            setRewards(prev => prev.filter(r => r.rewardId !== reward.id));
        } else {
            setRewards(prev => [...prev, { rewardId: reward.id, name: reward.name, pointsCost: 100 }]);
        }
    };

    const handleSave = () => {
        onSave(rewards);
        onClose();
    };

    if (!isOpen) return null;

    const availableRewardsFiltered = allRewards.filter(mock => !rewards.some(r => r.rewardId === mock.id));

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={styles.modalHeader}>
                    <h2>Add Rewards</h2>
                    <button onClick={onClose} style={styles.modalCloseButton}>&times;</button>
                </div>
                <div style={styles.modalBody}>
                    {rewards.length > 0 && (
                        <>
                            <h4 style={styles.h4}>Existing Rewards</h4>
                            <ul style={styles.rewardsList}>
                                {rewards.map(reward => (
                                    <li key={reward.rewardId} style={styles.rewardItem}>
                                        <input type="checkbox" id={reward.rewardId} checked={true} onChange={() => handleToggleReward({ id: reward.rewardId, name: reward.name })} />
                                        <label htmlFor={reward.rewardId} style={{ flex: 1 }}>{reward.name}</label>
                                        <input type="number" placeholder="Points" value={reward.pointsCost} onChange={(e) => handlePointChange(reward.rewardId, e.target.value)} style={styles.pointsInput} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    {availableRewardsFiltered.length > 0 && (
                        <>
                            <h4 style={styles.h4}>Available Rewards</h4>
                            <ul style={styles.rewardsList}>
                                {availableRewardsFiltered.map(reward => (
                                    <li key={reward.id} style={styles.rewardItem}>
                                        <input type="checkbox" id={reward.id} checked={false} onChange={() => handleToggleReward(reward)} />
                                        <label htmlFor={reward.id}>{reward.name}</label>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={() => { onClose(); setCurrentPage({ page: 'rewards' }); }} style={styles.secondaryButton}>Create New Reward</button>
                    <button onClick={handleSave} style={styles.saveButton}>Save</button>
                </div>
            </div>
        </div>
    );
};