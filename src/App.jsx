import React, { useState, useEffect, useRef } from 'react';
// Import necessary Firestore functions
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCfhDEOLVcdz8nwu-QDHGhTDU4KIcl3pX4",
  authDomain: "macrogame-admin.firebaseapp.com",
  projectId: "macrogame-admin",
  storageBucket: "macrogame-admin.firebasestorage.app",
  messagingSenderId: "268677369966",
  appId: "1:268677369966:web:55d43f2d86ab2bdaf4967f",
  measurementId: "G-50SL5Z5V6X"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- READ-ONLY MOCK DATA ---
const MOCK_MICROGAMES = [
  { id: 'avoid_v1', name: 'Avoid', category: 'Gaming', type: 'Modern', description: 'Dodge the bouncing shapes for 5 seconds.', controls: 'WASD/ARROWS', length: 5, gameFile: 'avoid.js' },
  { id: 'catch_v1', name: 'Catch', category: 'Gaming', type: 'Retro', description: 'Catch the good fruit, avoid the bad ones.', controls: 'LEFT/RIGHT ARROWS', length: 7, gameFile: 'catch.js' },
  { id: 'escape_v1', name: 'Escape', category: 'Gaming', type: 'Retro', description: 'Find the exit of the maze before time runs out.', controls: 'WASD/ARROWS', length: 8, gameFile: 'escape.js' },
  { id: 'clean_v1', name: 'Clean', category: 'Cosmetics', type: 'Modern', description: 'Clean the items.', controls: 'CLICK & DRAG', length: 5, gameFile: 'clean.js' },
  { id: 'collect_v1', name: 'Collect', category: 'Gaming', type: 'Modern', description: 'Collect as many good items while avoiding bad items.', controls: 'WASD/ARROWS', length: 5, gameFile: 'collect.js' },
  { id: 'consume_v1', name: 'Consume', category: 'Gaming', type: 'Modern', description: 'Consume all of the good food while avoiding the bad food.', controls: 'CLICK', length: 6, gameFile: 'consume.js' },
  { id: 'dance_v1', name: 'Dance', category: 'Gaming', type: 'Retro', description: 'Click the arrows to the beat.', controls: 'WASD/ARROWS', length: 5, gameFile: 'dance.js' },
  { id: 'dress_up_v1', name: 'Dress Up', category: 'Clothing', type: 'Formal', description: 'Style the mannequin with the featured items.', controls: 'CLICK & DRAG', length: 10, gameFile: 'dress_up.js' },
  { id: 'makeup_v1', name: 'Touch Up', category: 'Cosmetics', type: 'Modern', description: 'Apply the correct makeup to match the look.', controls: 'CLICK', length: 10, gameFile: 'makeup.js' },
  { id: 'plushie_catch_v1', name: 'Plushie Claw', category: 'Toys', type: 'Plushies', description: 'Use the claw to grab a prize-winning plushie.', controls: 'CLICK', length: 8, gameFile: 'plushie_catch.js' }
];
const CATEGORIES = ['Gaming', 'Clothing', 'Cosmetics', 'Toys', 'General'];
const TYPES_BY_CATEGORY = {
  Gaming: ['All', 'Retro', 'Modern'], Clothing: ['All', 'Streetwear', 'Formal'],
  Cosmetics: ['All', 'Modern', 'Luxury'], Toys: ['All', 'Plushies', 'Action Figures', 'Board Games'], General: ['All'],
};
const MUSIC_OPTIONS = {
    'None': null, 'Default': '/sounds/default.mp3', 'Fast-Paced': '/sounds/fast.mp3',
    'Chill': '/sounds/chill.mp3', 'Retro-8-Bit': '/sounds/retro.mp3',
};


// --- HELPER & PAGE COMPONENTS ---

const Nav = ({ currentPage, setCurrentPage }) => (
    <nav style={styles.nav}>
        <button onClick={() => setCurrentPage({ page: 'creator' })} style={currentPage.page === 'creator' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>Macrogame Creator</button>
        <button onClick={() => setCurrentPage({ page: 'manager' })} style={currentPage.page === 'manager' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>My Macrogames</button>
        <button onClick={() => setCurrentPage({ page: 'popups' })} style={currentPage.page === 'popups' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>My Popups</button>
        <button onClick={() => setCurrentPage({ page: 'rewards' })} style={currentPage.page === 'rewards' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>Rewards</button>
    </nav>
);

const PopupManager = ({ macrogames, popups, allRewards, currentPage }) => {
    const [newPopupName, setNewPopupName] = useState('');
    const [selectedMacrogameId, setSelectedMacrogameId] = useState('');

    // This hook pre-selects a macrogame if one was passed via the "Publish" button
    useEffect(() => {
        if (currentPage.payload?.macrogameId) {
            setSelectedMacrogameId(currentPage.payload.macrogameId);
        }
    }, [currentPage]);

    const handleSavePopup = async (e) => {
        e.preventDefault();
        if (!newPopupName || !selectedMacrogameId) {
            alert('Please provide a popup name and select a macrogame.');
            return;
        }
        const selectedGame = macrogames.find(g => g.id === selectedMacrogameId);
        const newPopup = {
            name: newPopupName,
            macrogameId: selectedGame.id,
            macrogameName: selectedGame.name,
            status: 'Draft',
            views: 0,
            engagements: 0,
            createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'popups'), newPopup);
        setNewPopupName('');
        setSelectedMacrogameId('');
    };

    const handlePreview = (popup) => {
      const macrogameData = macrogames.find(
        (mg) => mg.id === popup.macrogameId
      );
      if (!macrogameData) {
        alert("Macrogame data not found for this popup!");
        return;
      }
      const flowWithDetails = macrogameData.flow
        .map(flowItem => MOCK_MICROGAMES.find(mg => mg.id === flowItem.microgameId))
        .filter(Boolean);

      const previewConfig = {
        popup,
        macrogame: { ...macrogameData, flow: flowWithDetails },
        rewards: allRewards,
      };

      localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
      window.open('/preview.html', '_blank');
    };

    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Popup Manager</h2>
            <div style={styles.rewardsPageLayout}>
                <div style={styles.rewardsListContainer}>
                    <h3 style={styles.h3}>Existing Popups</h3>
                    {popups.length > 0 ? (
                        <ul style={styles.rewardsListFull}>
                            {popups.map(popup => (
                                <li key={popup.id} style={styles.rewardListItem}>
                                    <div style={styles.rewardInfo}>
                                        <strong>{popup.name}</strong>
                                        <div style={styles.rewardAnalytics}>
                                            <span>Macrogame: {popup.macrogameName}</span>
                                            <span>Status: <span style={popup.status === 'Active' ? styles.statusActive : styles.statusDraft}>{popup.status}</span></span>
                                            <span>Views: {popup.views}</span>
                                            <span>Engagements: {popup.engagements}</span>
                                        </div>
                                    </div>
                                    <div style={styles.rewardActions}>
                                        <button onClick={() => handlePreview(popup)} style={styles.previewButton}>Preview</button>
                                        <button style={styles.editButton}>Edit</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p>No popups created yet.</p>}
                </div>
                <form onSubmit={handleSavePopup} style={styles.rewardsCreateForm}>
                    <h3 style={styles.h3}>Create New Popup</h3>
                    <div style={styles.configItem}><label>Popup Name</label><input type="text" placeholder="e.g., Summer Sale Popup" value={newPopupName} onChange={e => setNewPopupName(e.target.value)} style={styles.input} /></div>
                    <div style={styles.configItem}>
                        <label>Macrogame</label>
                        <select value={selectedMacrogameId} onChange={e => setSelectedMacrogameId(e.target.value)} style={styles.input}>
                            <option value="">Select a macrogame...</option>
                            {macrogames.map(game => (
                                <option key={game.id} value={game.id}>{game.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.configItem}><label>Trigger</label><select style={styles.input}><option>On Exit Intent</option><option>On Page Load</option><option>After 5 seconds</option></select></div>
                    <div style={styles.configItem}><label>Audience</label><select style={styles.input}><option>All Visitors</option><option>New Visitors</option><option>Returning Visitors</option></select></div>
                    <button type="submit" style={styles.createButton}>Save Popup</button>
                </form>
            </div>
        </div>
    );
};

const RewardsPage = ({ allRewards }) => {
    const [newRewardName, setNewRewardName] = useState('');
    const [newRewardType, setNewRewardType] = useState('percentage_discount');
    const [newRewardValue, setNewRewardValue] = useState('');
    const [newRewardCodeType, setNewRewardCodeType] = useState('single');

    const handleCreateReward = async (e) => {
        e.preventDefault();
        if (!newRewardName.trim()) { alert("Please enter a reward name."); return; }
        const newReward = { name: newRewardName, type: newRewardType, value: newRewardValue, codeType: newRewardCodeType, createdAt: new Date().toISOString(), redemptions: 0, conversionRate: 0 };
        
        await addDoc(collection(db, 'rewards'), newReward);
        
        setNewRewardName(''); 
        setNewRewardValue('');
    };

    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Reward Management</h2>
            <div style={styles.rewardsPageLayout}>
                <div style={styles.rewardsListContainer}>
                    <h3 style={styles.h3}>Existing Rewards</h3>
                    {allRewards.length > 0 ? (
                        <ul style={styles.rewardsListFull}>
                            {allRewards.map(reward => (<li key={reward.id} style={styles.rewardListItem}><div style={styles.rewardInfo}><strong>{reward.name}</strong><div style={styles.rewardAnalytics}><span>Redemptions: {reward.redemptions}</span><span>Conv. Rate: {(reward.conversionRate * 100).toFixed(1)}%</span></div></div><div style={styles.rewardActions}><button style={styles.editButton}>Edit</button></div></li>))}
                        </ul>
                    ) : <p>No rewards created yet.</p>}
                </div>
                <form onSubmit={handleCreateReward} style={styles.rewardsCreateForm}>
                    <h3 style={styles.h3}>Create New Reward</h3>
                    <div style={styles.configItem}><label>Reward Name</label><input type="text" placeholder="e.g., 15% Off Summer Sale" value={newRewardName} onChange={e => setNewRewardName(e.target.value)} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Reward Type</label><select value={newRewardType} onChange={e => setNewRewardType(e.target.value)} style={styles.input}><option value="percentage_discount">% Discount</option><option value="fixed_discount">$ Discount</option><option value="free_shipping">Free Shipping</option><option value="free_gift">Free Gift</option><option value="loyalty_points">Loyalty Points</option></select></div>
                    <div style={styles.configItem}><label>Value / Amount</label><input type="text" placeholder={newRewardType === 'free_gift' ? 'SKU' : 'e.g., 15'} value={newRewardValue} onChange={e => setNewRewardValue(e.target.value)} style={styles.input} /></div>
                    <div style={styles.configItem}><label>Code Type</label><select value={newRewardCodeType} onChange={e => setNewRewardCodeType(e.target.value)} style={styles.input}><option value="single">Single Static Code</option><option value="unique">List of Unique Codes</option></select></div>
                    <button type="submit" style={styles.createButton}>Create Reward</button>
                </form>
            </div>
        </div>
    );
};

const MyMacrogames = ({ macrogames, handlePublishMacrogame, handleEditMacrogame, handleDeleteMacrogame }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredGames = macrogames.filter(game => game.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}><h2 style={styles.h2}>My Macrogames</h2><input type="text" placeholder="Search macrogames..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.input} /></div>
            <div style={styles.managerList}>
                {filteredGames.map(game => (
                    <div key={game.id} style={styles.listItem}>
                        <div><strong>{game.name}</strong></div>
                        <div style={styles.managerActions}>
                            <span style={styles.tag}>#{game.category}</span>
                            <span style={styles.tag}>#{game.type}</span>
                            <span>{game.flow?.length || 0} microgames</span>
                            <button onClick={() => handlePublishMacrogame(game)} style={styles.publishButton}>Publish</button>
                            <button onClick={() => handleEditMacrogame(game)} style={styles.editButton}>Edit</button>
                            <button onClick={() => handleDeleteMacrogame(game.id)} style={styles.deleteButton}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MicrogameCard = ({ game, onSelect, isSelected, isExpanded, onExpand }) => (
  <div style={isSelected ? {...styles.card, ...styles.cardSelected} : styles.card} onClick={onSelect}>
    <div style={styles.cardHeader}><span>{game.name}</span><button style={styles.accordionButton} onClick={(e) => { e.stopPropagation(); onExpand(); }}>{isExpanded ? '▲' : '▼'}</button></div>
    {isExpanded && (<div style={styles.cardDetails}><p><strong>Description:</strong> {game.description}</p><p><strong>Controls:</strong> {game.controls}</p><p><strong>Length:</strong> {game.length}s</p></div>)}
  </div>
);

const FlowCard = ({ game, index, onMove, onDuplicate, onRemove, isFirst, isLast }) => (
  <div style={{...styles.flowCard}}>
    <div style={styles.flowCardStep}>{index + 1}</div>
    <button title="Remove" onClick={onRemove} style={styles.flowCardRemoveButton}>&times;</button>
    <span>{game.name}</span>
    <div style={styles.flowCardActions}>
        <button title="Duplicate" onClick={onDuplicate} style={styles.flowCardButton}>❐</button>
        <button title="Move Up" disabled={isFirst} onClick={() => onMove('up')} style={styles.flowCardButton}>▲</button>
        <button title="Move Down" disabled={isLast} onClick={() => onMove('down')} style={styles.flowCardButton}>▼</button>
    </div>
  </div>
);

const RewardsModal = ({ isOpen, onClose, existingRewards, allRewards, onSave, setCurrentPage }) => {
    const [rewards, setRewards] = useState(existingRewards);
    useEffect(() => { setRewards(existingRewards); }, [existingRewards, isOpen]);

    const handlePointChange = (rewardId, points) => {
        const numericPoints = points === '' ? '' : Number(points);
        if (numericPoints < 0) return;
        setRewards(prev => prev.map(r => r.rewardId === rewardId ? { ...r, pointsCost: numericPoints } : r));
    };
    const handleToggleReward = (reward) => {
        const isExisting = rewards.some(r => r.rewardId === reward.id);
        if (isExisting) { setRewards(prev => prev.filter(r => r.rewardId !== reward.id)); }
        else { setRewards(prev => [...prev, { rewardId: reward.id, name: reward.name, pointsCost: 100 }]); }
    };
    const handleSave = () => { onSave(rewards); onClose(); };
    if (!isOpen) return null;
    const availableRewardsFiltered = allRewards.filter(mock => !rewards.some(r => r.rewardId === mock.id));
    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <div style={styles.modalHeader}><h2>Add Rewards</h2><button onClick={onClose} style={styles.modalCloseButton}>&times;</button></div>
                {rewards.length > 0 && (<><h4 style={styles.h4}>Existing Rewards</h4><ul style={styles.rewardsList}>{rewards.map(reward => (<li key={reward.rewardId} style={styles.rewardItem}><input type="checkbox" id={reward.rewardId} checked={true} onChange={() => handleToggleReward({id: reward.rewardId})} /><label htmlFor={reward.rewardId} style={{flex: 1}}>{reward.name}</label><input type="number" placeholder="Points" value={reward.pointsCost} onChange={(e) => handlePointChange(reward.rewardId, e.target.value)} style={styles.pointsInput}/></li>))}</ul></>)}
                {availableRewardsFiltered.length > 0 && (<><h4 style={styles.h4}>Available Rewards</h4><ul style={styles.rewardsList}>{availableRewardsFiltered.map(reward => (<li key={reward.id} style={styles.rewardItem}><input type="checkbox" id={reward.id} checked={false} onChange={() => handleToggleReward(reward)} /><label htmlFor={reward.id}>{reward.name}</label></li>))}</ul></>)}
                <div style={styles.modalFooter}><button onClick={() => { onClose(); setCurrentPage({ page: 'rewards' }); }} style={styles.secondaryButton}>Create New Reward</button><button onClick={handleSave} style={styles.saveButton}>Save</button></div>
            </div>
        </div>
    );
};

const MacrogameForm = ({ existingMacrogame, onSave, onCancel, setCurrentPage, allRewards }) => {
    const [gameName, setGameName] = useState('');
    const [category, setCategory] = useState('');
    const [type, setType] = useState('');
    const [selectedForFlow, setSelectedForFlow] = useState([]);
    const [flow, setFlow] = useState([]);
    const [expandedCard, setExpandedCard] = useState(null);
    const [rewardsConfig, setRewardsConfig] = useState([]);
    const [introText, setIntroText] = useState('GET READY!');
    const [introTime, setIntroTime] = useState(3);
    const [titleTime, setTitleTime] = useState(2);
    const [controlsTime, setControlsTime] = useState(3);
    const [music, setMusic] = useState('Default');
    const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const audioRef = useRef(null);

    const resetForm = () => {
        setGameName(''); setCategory(''); setType(''); setFlow([]); setSelectedForFlow([]);
        setRewardsConfig([]); setIntroText('GET READY!'); setIntroTime(3);
        setTitleTime(2); setControlsTime(3); setMusic('Default');
    };

    useEffect(() => {
        if (existingMacrogame) {
            setGameName(existingMacrogame.name);
            setCategory(existingMacrogame.category);
            setType(existingMacrogame.type);
            setFlow(existingMacrogame.flow.map(f => MOCK_MICROGAMES.find(m => m.id === f.microgameId)).filter(Boolean));
            setRewardsConfig(existingMacrogame.rewards);
            setIntroText(existingMacrogame.config.introScreenText);
            setIntroTime(existingMacrogame.config.introScreenDuration / 1000);
            setTitleTime(existingMacrogame.config.titleScreenDuration / 1000);
            setControlsTime(existingMacrogame.config.controlsScreenDuration / 1000);
            const musicOption = Object.keys(MUSIC_OPTIONS).find(key => MUSIC_OPTIONS[key] === existingMacrogame.config.backgroundMusicUrl) || 'None';
            setMusic(musicOption);
        } else {
            resetForm();
        }
    }, [existingMacrogame]);

    const handleSaveClick = () => {
        if (!gameName || flow.length < 1) {
            alert('Please provide a name and add at least 1 microgame.');
            return;
        }
        const newMacrogame = {
            id: existingMacrogame ? existingMacrogame.id : null,
            name: gameName,
            category,
            type,
            createdAt: existingMacrogame ? existingMacrogame.createdAt : new Date().toISOString(),
            config: { introScreenText: introText, introScreenDuration: introTime * 1000, titleScreenDuration: titleTime * 1000, controlsScreenDuration: controlsTime * 1000, backgroundMusicUrl: MUSIC_OPTIONS[music] },
            flow: flow.map((game, index) => ({ microgameId: game.id, order: index + 1 })),
            rewards: rewardsConfig,
        };
        onSave(newMacrogame);
        if (!existingMacrogame) {
            resetForm();
        }
    };
    
    const handleCategoryChange = (e) => { setCategory(e.target.value); setType('All'); };
    const handleSelectGame = (gameId) => { setSelectedForFlow(p => p.includes(gameId) ? p.filter(id => id !== gameId) : [...p, gameId]); };
    const handleAddToFlow = () => { setFlow(prev => [...prev, ...MOCK_MICROGAMES.filter(g => selectedForFlow.includes(g.id))]); setSelectedForFlow([]); };
    const handleMoveInFlow = (index, direction) => { const newFlow = [...flow]; const [item] = newFlow.splice(index, 1); newFlow.splice(direction === 'up' ? index - 1 : index + 1, 0, item); setFlow(newFlow); };
    const handleDuplicateInFlow = (index) => { const newFlow = [...flow]; newFlow.splice(index + 1, 0, newFlow[index]); setFlow(newFlow); };
    const handleRemoveFromFlow = (indexToRemove) => {
        setFlow(prevFlow => prevFlow.filter((_, index) => index !== indexToRemove));
    };
    const handlePreviewMusic = () => {
        if (isPreviewPlaying) { audioRef.current.pause(); return; }
        const soundSrc = MUSIC_OPTIONS[music]; if (!soundSrc) return;
        audioRef.current = new Audio(soundSrc); audioRef.current.play(); setIsPreviewPlaying(true);
        const stopPlayback = () => setIsPreviewPlaying(false);
        audioRef.current.addEventListener('pause', stopPlayback, { once: true });
        setTimeout(() => { if (audioRef.current) audioRef.current.pause() }, 5000);
    };

    const formTitle = existingMacrogame ? 'Edit Macrogame' : 'Create New Macrogame';
    const saveButtonText = existingMacrogame ? 'Save Changes' : 'Create Macrogame';

    return (
        <>
            <RewardsModal isOpen={isRewardsModalOpen} onClose={() => setIsRewardsModalOpen(false)} existingRewards={rewardsConfig} allRewards={allRewards} onSave={setRewardsConfig} setCurrentPage={setCurrentPage} />
            <div style={styles.creatorSection}>
                <div style={styles.formHeader}>
                    <h2 style={styles.h2}>{formTitle}</h2>
                    {onCancel && <button onClick={onCancel} style={styles.secondaryButton}>Cancel</button>}
                </div>
                <div style={styles.formRow}><input type="text" placeholder="Macrogame Name" value={gameName} onChange={e => setGameName(e.target.value)} style={{...styles.input, flex: 2}}/><select value={category} onChange={handleCategoryChange} style={{...styles.input, flex: 1.5}}><option value="">Category</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select><select value={type} onChange={e => setType(e.target.value)} disabled={!category} style={{...styles.input, flex: 1.5}}><option value="All">Type</option>{(TYPES_BY_CATEGORY[category] || []).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <h3 style={styles.h3}>Select Microgames</h3>
                <div style={styles.cardContainer}>{category ? (MOCK_MICROGAMES.filter(g => g.category === category && (type === 'All' || g.type === type || g.type === 'All')).length > 0 ? MOCK_MICROGAMES.filter(g => g.category === category && (type === 'All' || g.type === type || g.type === 'All')).map(game => <MicrogameCard key={game.id} game={game} isSelected={selectedForFlow.includes(game.id)} isExpanded={expandedCard === game.id} onSelect={() => handleSelectGame(game.id)} onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} />) : <p>No games found.</p>) : <p>Select a category to see available games.</p>}</div>
                {selectedForFlow.length > 0 && <button onClick={handleAddToFlow} style={styles.addButton}>Add ({selectedForFlow.length}) to Flow</button>}
                <h3 style={styles.h3}>Macrogame Flow</h3>
                <div style={styles.flowContainer}><div style={{...styles.flowCard, ...styles.staticFlowCard}}><div style={styles.flowCardStep}>0</div>Intro</div><div style={styles.flowArrow}>&rarr;</div>{flow.map((game, index) => (<React.Fragment key={`${game.id}-${index}`}><FlowCard index={index} game={game} isFirst={index === 0} isLast={index === flow.length - 1} onMove={(dir) => handleMoveInFlow(index, dir)} onDuplicate={() => handleDuplicateInFlow(index)} onRemove={() => handleRemoveFromFlow(index)} /><div style={styles.flowArrow}>&rarr;</div></React.Fragment>))}<div onClick={() => setIsRewardsModalOpen(true)} style={{...styles.flowCard, ...styles.staticFlowCard, cursor: 'pointer'}}><div style={styles.flowCardStep}>+</div>Rewards {rewardsConfig.length > 0 ? `(${rewardsConfig.length})` : ''}</div></div>
                <h3 style={styles.h3}>Configuration</h3>
                <div style={styles.configContainer}><div style={styles.configRow}><div style={styles.configItem}><label>Intro Screen Text</label><input type="text" value={introText} onChange={e => setIntroText(e.target.value)} style={styles.input} /></div><div style={styles.configItem}><label>Intro Duration (s)</label><input type="number" value={introTime} onChange={e => setIntroTime(e.target.value)} style={styles.input} /></div></div><div style={styles.configRow}><div style={styles.configItem}><label>Title Duration (s)</label><input type="number" value={titleTime} onChange={e => setTitleTime(e.target.value)} style={styles.input} /></div><div style={styles.configItem}><label>Controls Duration (s)</label><input type="number" value={controlsTime} onChange={e => setControlsTime(e.target.value)} style={styles.input} /></div></div><div style={styles.configRow}><div style={styles.configItem}><label>Background Music</label><select value={music} onChange={e => setMusic(e.target.value)} style={styles.input}>{Object.keys(MUSIC_OPTIONS).map(m => <option key={m} value={m}>{m}</option>)}</select></div><div style={{...styles.configItem, justifyContent: 'flex-end'}}><button onClick={handlePreviewMusic} style={{...styles.input, ...styles.secondaryButton, height: 'auto' }}>{isPreviewPlaying ? 'Stop' : 'Preview'}</button></div></div></div>
                <button onClick={handleSaveClick} style={styles.createButton}>{saveButtonText}</button>
            </div>
        </>
    );
};

const MacrogameCreator = ({ macrogames, handleCreateMacrogame, setCurrentPage, allRewards }) => {
    const handleSave = async (newMacrogame) => {
        await handleCreateMacrogame(newMacrogame);
        alert('Macrogame created successfully!');
    };

    return (
        <>
            <MacrogameForm onSave={handleSave} setCurrentPage={setCurrentPage} allRewards={allRewards} />
            <div>
                <div style={styles.managerHeader}><h2 style={styles.h2}>My Macrogames</h2><button onClick={() => setCurrentPage({ page: 'manager' })} style={styles.secondaryButton}>Manage</button></div>
                {macrogames.slice(-3).reverse().map(game => (<div key={game.id} style={styles.listItem}><div><strong>{game.name}</strong></div><div style={styles.listItemRight}><span style={styles.tag}>#{game.category}</span><span style={styles.tag}>#{game.type}</span><span>{game.flow?.length || 0} microgames</span></div></div>))}
            </div>
            <div style={{ height: '50vh' }}></div>
        </>
    );
};

// --- MAIN APP COMPONENT ---
export default function App() {
    const [currentPage, setCurrentPage] = useState({ page: 'creator', payload: null });
    const [macrogames, setMacrogames] = useState([]);
    const [popups, setPopups] = useState([]);
    const [allRewards, setAllRewards] = useState([]);
    const [editingMacrogame, setEditingMacrogame] = useState(null);

    useEffect(() => {
        const qMacrogames = query(collection(db, 'macrogames'));
        const unsubMacrogames = onSnapshot(qMacrogames, (querySnapshot) => {
            const gamesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setMacrogames(gamesData);
        });

        const qPopups = query(collection(db, 'popups'));
        const unsubPopups = onSnapshot(qPopups, (querySnapshot) => {
            const popupsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setPopups(popupsData);
        });

        const qRewards = query(collection(db, 'rewards'));
        const unsubRewards = onSnapshot(qRewards, (querySnapshot) => {
            const rewardsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setAllRewards(rewardsData);
        });

        return () => {
            unsubMacrogames();
            unsubPopups();
            unsubRewards();
        };
    }, []);

    const handleCreateMacrogame = async (newMacrogame) => {
        const { id, ...gameData } = newMacrogame;
        await addDoc(collection(db, "macrogames"), gameData);
    };

    const handleUpdateMacrogame = async (updatedMacrogame) => {
        const gameRef = doc(db, "macrogames", updatedMacrogame.id);
        const { id, ...gameData } = updatedMacrogame;
        await updateDoc(gameRef, gameData);
        setEditingMacrogame(null);
    };

    const handleDeleteMacrogame = async (gameIdToDelete) => {
        if (window.confirm("Are you sure you want to delete this macrogame?")) {
            await deleteDoc(doc(db, "macrogames", gameIdToDelete));
        }
    };

    const handlePublishMacrogame = (macrogameToPublish) => {
        setCurrentPage({ page: 'popups', payload: { macrogameId: macrogameToPublish.id } });
    };

    const handleEditMacrogame = (macrogame) => {
        setEditingMacrogame(macrogame);
    };

    return (
        <div style={styles.page}>
            {editingMacrogame && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContentLarge}>
                        <MacrogameForm 
                            existingMacrogame={editingMacrogame}
                            onSave={handleUpdateMacrogame}
                            onCancel={() => setEditingMacrogame(null)}
                            setCurrentPage={setCurrentPage}
                            allRewards={allRewards}
                        />
                    </div>
                </div>
            )}
            <header style={styles.header}>
                <h1>Macrogame Admin Portal</h1>
                <Nav currentPage={currentPage} setCurrentPage={setCurrentPage} />
            </header>
            <main style={styles.main}>
                {currentPage.page === 'creator' && <MacrogameCreator macrogames={macrogames} handleCreateMacrogame={handleCreateMacrogame} setCurrentPage={setCurrentPage} allRewards={allRewards} />}
                {currentPage.page === 'manager' && <MyMacrogames macrogames={macrogames} handlePublishMacrogame={handlePublishMacrogame} handleEditMacrogame={handleEditMacrogame} handleDeleteMacrogame={handleDeleteMacrogame} />}
                {currentPage.page === 'popups' && <PopupManager macrogames={macrogames} popups={popups} allRewards={allRewards} currentPage={currentPage} />}
                {currentPage.page === 'rewards' && <RewardsPage allRewards={allRewards} />}
            </main>
        </div>
    );
}


// --- STYLES ---
const styles = {
  page: { fontFamily: 'system-ui, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', color: '#1c1e21' },
  header: { backgroundColor: '#ffffff', padding: '1rem 2rem', borderBottom: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  nav: { display: 'flex', gap: '1rem' },
  navButton: { background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer', color: '#606770', borderBottom: '2px solid transparent' },
  navButtonActive: { color: '#0866ff', borderBottom: '2px solid #0866ff', fontWeight: 'bold' },
  main: { width: '100%', maxWidth: '1400px', margin: '2rem auto', padding: '0 2rem', boxSizing: 'border-box' },
  creatorSection: { backgroundColor: '#ffffff', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  h2: { color: '#1c1e21', fontSize: '1.75rem', marginBottom: '1.5rem' },
  h3: { color: '#606770', fontSize: '1.25rem', marginTop: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1.5rem' },
  h4: { color: '#1c1e21', fontSize: '1.1rem', marginTop: '1rem', marginBottom: '0.5rem' },
  formRow: { display: 'flex', gap: '1rem', marginBottom: '1rem' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  input: { padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1rem', width: '100%', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#1c1e21' },
  cardContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', alignItems: 'start' },
  card: { backgroundColor: '#f7f7f7', padding: '1rem', borderRadius: '8px', border: '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s', color: '#333' },
  cardSelected: { borderColor: '#0866ff', backgroundColor: '#eaf5fc' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' },
  cardDetails: { marginTop: '1rem', fontSize: '0.9rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' },
  accordionButton: { fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#606770' },
  addButton: { backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', marginTop: '1rem' },
  saveButton: { backgroundColor: '#0866ff', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer' },
  secondaryButton: { backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer' },
  publishButton: { backgroundColor: '#0866ff', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' },
  previewButton: { backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' },
  editButton: { backgroundColor: '#f0f2f5', color: '#606770', border: '1px solid #ccc', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' },
  deleteButton: { backgroundColor: '#fa383e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' },
  flowContainer: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#e4e6eb', borderRadius: '8px' },
  flowCard: { position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '180px', height: '90px', padding: '0.5rem', paddingTop: '1.5rem', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' },
  flowCardRemoveButton: { position: 'absolute', top: '2px', right: '5px', background: 'none', border: 'none', fontSize: '1.5rem', color: '#999', cursor: 'pointer', padding: '0' },
  staticFlowCard: { fontWeight: 'bold', color: '#606770', borderStyle: 'dashed' },
  flowCardStep: { position: 'absolute', top: '5px', left: '8px', backgroundColor: '#606770', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' },
  flowCardActions: { position: 'absolute', bottom: '5px', right: '5px', display: 'flex' },
  flowCardButton: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#606770', padding: '0.2rem' },
  flowArrow: { fontSize: '1.5rem', color: '#606770', fontWeight: 'bold' },
  configContainer: { display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' },
  configRow: { display: 'flex', gap: '1.5rem', alignItems: 'flex-end' },
  configItem: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 },
  createButton: { backgroundColor: '#0866ff', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '6px', fontSize: '1.1rem', cursor: 'pointer', marginTop: '2rem', fontWeight: 'bold' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  listItemRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  tag: { backgroundColor: '#e4e6eb', color: '#606770', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem' },
  managerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  managerList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  managerActions: { display: 'flex', alignItems: 'center', gap: '1rem' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' },
  modalContentLarge: { backgroundColor: 'white', borderRadius: '8px', width: '90%', maxWidth: '1400px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' },
  modalCloseButton: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' },
  rewardsList: { listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' },
  rewardItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.5rem', borderBottom: '1px solid #f0f0f0' },
  pointsInput: { width: '80px', padding: '0.5rem', marginLeft: 'auto' },
  modalFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', paddingTop: '1rem', marginTop: '1rem', borderTop: '1px solid #eee' },
  rewardsPageLayout: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' },
  rewardsListContainer: {},
  rewardsCreateForm: { display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' },
  rewardsListFull: { listStyle: 'none', padding: 0, margin: 0 },
  rewardListItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f7f7', padding: '1rem', borderRadius: '6px', marginBottom: '0.5rem' },
  rewardInfo: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  rewardAnalytics: { display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#606770' },
  rewardActions: { display: 'flex', gap: '0.5rem' },
  statusActive: { color: '#28a745', fontWeight: 'bold' },
  statusDraft: { color: '#6c757d', fontWeight: 'bold' },
};
