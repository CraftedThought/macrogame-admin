import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../App'; // We will export 'db' from App.tsx
import { Microgame } from '../types';

// This is the data that will be added to your Firestore database.
// It's taken directly from your old MOCK_MICROGAMES array.
const MICROGAMES_TO_SEED: Microgame[] = [
    { id: 'avoid_v1', name: 'Avoid', category: 'Gaming', type: 'Modern', description: 'Dodge the bouncing shapes for 5 seconds.', controls: 'WASD/ARROWS', length: 5, gameFile: 'avoid.js' },
    { id: 'catch_v1', name: 'Catch', category: 'Gaming', type: 'Retro', description: 'Catch the good fruit, avoid the bad ones.', controls: 'LEFT/RIGHT ARROWS', length: 7, gameFile: 'catch.js' },
    { id: 'escape_v1', name: 'Escape', category: 'Gaming', type: 'Retro', description: 'Find the exit of the maze before time runs out.', controls: 'WASD/ARROWS', length: 8, gameFile: 'escape.js' },
    { id: 'clean_v1', name: 'Clean', category: 'Cosmetics', type: 'Modern', description: 'Clean the items.', controls: 'CLICK & DRAG', length: 5, gameFile: 'clean.js' },
    { id: 'collect_v1', name: 'Collect', category: 'Gaming', type: 'Modern', description: 'Collect as many good items while avoiding bad items.', controls: 'WASD/ARROWS', length: 5, gameFile: 'collect.js' },
    { id: 'consume_v1', name: 'Consume', category: 'Gaming', type: 'Modern', description: 'Consume all of the good food while avoiding the bad food.', controls: 'CLICK', length: 6, gameFile: 'consume.js' },
    { id: 'dance_v1', name: 'Dance', category: 'Gaming', type: 'Retro', description: 'Click the arrows to the beat.', controls: 'WASD/ARROWS', length: 5, gameFile: 'dance.js' },
    { id: 'dress_up_v1', name: 'Dress Up', category: 'Clothing', type: 'Formal', description: 'Style the mannequin with the featured items.', controls: 'CLICK & DRAG', length: 10, gameFile: 'dress_up.js' },
    { id: 'makeup_v1', name: 'Touch Up', category: 'Cosmetics', type: 'Modern', description: 'Apply the correct makeup to match the look.', controls: 'CLICK', length: 10, gameFile: 'makeup.js' },
    { id: 'claw_v1', name: 'Claw', category: 'Toys', type: 'Plushies', description: 'Use the claw to grab a prize-winning plushie.', controls: 'CLICK', length: 8, gameFile: 'claw.js' }
];

/**
 * A one-time script to populate the 'microgames' collection in Firestore.
 * This function checks if the collection is empty before seeding to prevent duplicates.
 * To run this, call `seedMicrogames()` from your browser's developer console.
 */
export const seedMicrogames = async () => {
    const microgamesCollection = collection(db, 'microgames');
    const snapshot = await getDocs(microgamesCollection);

    if (!snapshot.empty) {
        console.log('Database already seeded. Aborting.');
        alert('Database already seeded. Aborting.');
        return;
    }

    const batch = writeBatch(db);
    MICROGAMES_TO_SEED.forEach((game) => {
        // Use the game's string 'id' as the document ID
        const docRef = doc(microgamesCollection, game.id);
        batch.set(docRef, game);
    });

    try {
        await batch.commit();
        console.log('Database seeded successfully with microgames!');
        alert('Database seeded successfully with microgames!');
    } catch (error) {
        console.error('Error seeding database:', error);
        alert('Error seeding database. Check the console for details.');
    }
};
