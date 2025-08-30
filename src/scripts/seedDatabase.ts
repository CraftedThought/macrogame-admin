// src/scripts/seedDatabase.ts

import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Microgame } from '../types';

// This is the new master list of 22 microgames from the final spec document.
const microgames: Omit<Microgame, 'id'>[] = [
    { name: 'Avoid!', baseType: 'Player Movement', controls: 'WASD or Arrows for movement', length: 5, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Build!', baseType: 'Jigsaw Puzzle', controls: 'Click and Drag', length: 7, tempo: 'Normal', skins: {}, isActive: false },
    { name: 'Catch!', baseType: 'Catch Falling Objects', controls: 'A and D or Left and Right Arrows', length: 5, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Claw!', baseType: 'Claw Machine', controls: 'A and D or Left and Right Arrows and Spacebar or Click', length: 10, tempo: 'Normal', skins: {}, isActive: true },
    { name: 'Clean!', baseType: 'Wipe to Reveal', controls: 'Click and Drag', length: 5, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Collect!', baseType: 'Collection', controls: 'Point and Click', length: 5, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Consume!', baseType: 'Rapid Clicking', controls: 'Point and Click', length: 5, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Drop!', baseType: 'Timing Drop', controls: 'Click or Spacebar', length: 7, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Escape!', baseType: 'Maze Navigation', controls: 'WASD or Arrows for movement', length: 5, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Frame!', baseType: 'Positioning', controls: 'Click and Drag', length: 5, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Grab!', baseType: 'Reaction / Tapping', controls: 'Click or Spacebar', length: 7, tempo: 'Normal', skins: {}, isActive: true },
    { name: 'Grow!', baseType: 'Collection / Growth', controls: 'Click, Drag, and Drop', length: 7, tempo: 'Normal', skins: {}, isActive: true },
    { name: 'Like!', baseType: 'Reaction / Identification', controls: 'Point and Click', length: 7, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'LineUp!', baseType: 'Sequencing / Ordering', controls: 'Click, Drag, and Drop', length: 7, tempo: 'Normal', skins: {}, isActive: true },
    { name: 'Match!', baseType: 'Memory / Card Flip', controls: 'Point and Click', length: 10, tempo: 'Slow', skins: {}, isActive: true },
    { name: 'MatchUp!', baseType: 'Matching Pairs', controls: 'Point and Click', length: 10, tempo: 'Slow', skins: {}, isActive: true },
    { name: 'Organize!', baseType: 'Categorization', controls: 'Click, Drag, and Drop', length: 10, tempo: 'Slow', skins: {}, isActive: true },
    { name: 'Package!', baseType: 'Drag and Drop', controls: 'Click, Drag, and Drop', length: 7, tempo: 'Fast', skins: {}, isActive: true },
    { name: 'Pop!', baseType: 'Reaction / Tapping', controls: 'Point and Click', length: 7, tempo: 'Normal', skins: {}, isActive: true },
    { name: 'Spot!', baseType: 'Reaction / Identification', controls: 'Point and Click', length: 7, tempo: 'Normal', skins: {}, isActive: true },
    { name: 'Trade!', baseType: 'Selection', controls: 'Point and Click', length: 7, tempo: 'Normal', skins: {}, isActive: true },
    { name: 'Vote!', baseType: 'Selection', controls: 'Point and Click', length: 7, tempo: 'Fast', skins: {}, isActive: true },
];

export async function seedMicrogames() {
    const microgamesCollection = collection(db, 'microgames');
    
    console.log("Clearing existing microgames...");
    const existingDocs = await getDocs(microgamesCollection);
    for (const docSnapshot of existingDocs.docs) {
        await deleteDoc(doc(db, 'microgames', docSnapshot.id));
    }
    console.log("Existing microgames cleared.");

    console.log("Seeding new master list of microgames...");
    for (const game of microgames) {
        const docId = game.name.toLowerCase().replace(/!/g, '');
        const docRef = doc(microgamesCollection, docId);
        try {
            await setDoc(docRef, game);
            console.log(`Successfully seeded: ${game.name}`);
        } catch (error) {
            console.error(`Error seeding ${game.name}:`, error);
        }
    }
    console.log("Database master list seeding complete!");
}