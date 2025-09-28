// src/scripts/seedDatabase.ts

import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Microgame } from '../types';

// This is the new master list of microgames with authoritative metadata.
const microgames: Omit<Microgame, 'id' | 'skins' | 'isFavorite' | 'isActive'>[] = [
  { name: 'Avoid!', baseType: 'Player Movement', mechanicType: 'skill', controls: 'WASD or Arrows for movement', length: 5, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter', 'Indecisive Shopper'] },
  { name: 'Build!', baseType: 'Jigsaw Puzzle', mechanicType: 'skill', controls: 'Click and Drag', length: 7, tempo: 'Normal', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Bargain Hunter', 'Indecisive Shopper'] },
  { name: 'Catch!', baseType: 'Catch Falling Objects', mechanicType: 'skill', controls: 'A and D or Left and Right Arrows', length: 5, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
  { name: 'Claw!', baseType: 'Claw Machine', mechanicType: 'skill', controls: 'A and D or Left and Right Arrows and Spacebar or Click', length: 10, tempo: 'Normal', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
  { name: 'Clean!', baseType: 'Wipe to Reveal', mechanicType: 'skill', controls: 'Click and Drag', length: 5, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter', 'Indecisive Shopper'] },
  { name: 'Collect!', baseType: 'Collection', mechanicType: 'skill', controls: 'Point and Click', length: 5, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter', 'Indecisive Shopper'] },
  { name: 'Consume!', baseType: 'Rapid Clicking', mechanicType: 'skill', controls: 'Point and Click', length: 5, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter', 'Indecisive Shopper'] },
  { name: 'Drop!', baseType: 'Timing Drop', mechanicType: 'skill', controls: 'Click or Spacebar', length: 7, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
  { name: 'Escape!', baseType: 'Maze Navigation', mechanicType: 'skill', controls: 'WASD or Arrows for movement', length: 5, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter', 'Indecisive Shopper'] },
  { name: 'Frame!', baseType: 'Positioning', mechanicType: 'skill', controls: 'Click and Drag', length: 5, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
  { name: 'Grab!', baseType: 'Reaction / Tapping', mechanicType: 'skill', controls: 'Click or Spacebar', length: 7, tempo: 'Normal', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
  { name: 'Grow!', baseType: 'Collection / Growth', mechanicType: 'skill', controls: 'Click, Drag, and Drop', length: 7, tempo: 'Normal', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Bargain Hunter'] },
  { name: 'Like!', baseType: 'Reaction / Identification', mechanicType: 'skill', controls: 'Point and Click', length: 7, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
  { name: 'LineUp!', baseType: 'Sequencing / Ordering', mechanicType: 'skill', controls: 'Click, Drag, and Drop', length: 7, tempo: 'Normal', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Bargain Hunter'] },
  { name: 'Match!', baseType: 'Memory / Card Flip', mechanicType: 'skill', controls: 'Point and Click', length: 10, tempo: 'Slow', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Bargain Hunter'] },
  { name: 'MatchUp!', baseType: 'Matching Pairs', mechanicType: 'skill', controls: 'Point and Click', length: 10, tempo: 'Slow', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Bargain Hunter'] },
  { name: 'Organize!', baseType: 'Categorization', mechanicType: 'skill', controls: 'Click, Drag, and Drop', length: 10, tempo: 'Slow', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Bargain Hunter'] },
  { name: 'Package!', baseType: 'Drag and Drop', mechanicType: 'skill', controls: 'Click, Drag, and Drop', length: 7, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter'] },
  { name: 'Pop!', baseType: 'Reaction / Tapping', mechanicType: 'skill', controls: 'Point and Click', length: 7, tempo: 'Normal', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
  { name: 'Spot!', baseType: 'Reaction / Identification', mechanicType: 'skill', controls: 'Point and Click', length: 7, tempo: 'Normal', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Bargain Hunter'] },
  { name: 'Trade!', baseType: 'Selection', mechanicType: 'skill', controls: 'Point and Click', length: 7, tempo: 'Normal', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Bargain Hunter', 'Indecisive Shopper'] },
  { name: 'Vote!', baseType: 'Selection', mechanicType: 'skill', controls: 'Point and Click', length: 7, tempo: 'Fast', gameplayExperience: 'Generalized', compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'], compatibleProductCategories: ['All'], compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'] },
  // ... after the 'Vote!' game object ...
    {
      name: 'SpinTheWheel!',
      baseType: 'Prize Wheel', // Corrected baseType
      mechanicType: 'chance',
      controls: 'Click to Spin',
      length: 10, // Corrected length
      tempo: 'Slow', // Corrected tempo based on length
      gameplayExperience: 'Generalized',
      compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'],
      compatibleProductCategories: ['All'],
      compatibleCustomerTypes: ['All']
    },
    { 
      name: 'CupAndBall!', 
      baseType: 'Shell Game', 
      mechanicType: 'chance', 
      controls: 'Click to Choose', 
      length: 10, // Corrected length
      tempo: 'Slow', // Corrected tempo
      gameplayExperience: 'Generalized', 
      compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'],
      compatibleProductCategories: ['All'], 
      compatibleCustomerTypes: ['All'] 
    },
    { 
      name: 'PickAGift!', 
      baseType: 'Mystery Box', 
      mechanicType: 'chance', 
      controls: 'Click to Open', 
      length: 10, // Corrected length
      tempo: 'Slow', // Corrected tempo
      gameplayExperience: 'Generalized', 
      compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'],
      compatibleProductCategories: ['All'], 
      compatibleCustomerTypes: ['All'] 
    },
    { 
      name: 'RolltheDice!', 
      baseType: 'Dice Roll', 
      mechanicType: 'chance', 
      controls: 'Click to Roll', 
      length: 10, // Corrected length
      tempo: 'Slow', // Corrected tempo
      gameplayExperience: 'Generalized', 
      compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'],
      compatibleProductCategories: ['All'], 
      compatibleCustomerTypes: ['All'] 
    },
    { 
      name: 'ScratchCard!', 
      baseType: 'Scratch-Off', 
      mechanicType: 'chance', 
      controls: 'Click and Drag to Scratch', 
      length: 10, // Corrected length
      tempo: 'Slow', // Corrected tempo
      gameplayExperience: 'Generalized', 
      compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'],
      compatibleProductCategories: ['All'], 
      compatibleCustomerTypes: ['All'] 
    }
];

export async function seedMicrogames() {
    const microgamesCollection = collection(db, 'microgames');
    
    console.log("Clearing existing microgames...");
    const existingDocs = await getDocs(microgamesCollection);
    for (const docSnapshot of existingDocs.docs) {
        await deleteDoc(doc(db, 'microgames', docSnapshot.id));
    }
    console.log("Existing microgames cleared.");

    console.log("Seeding new master list of microgames with metadata...");
    for (const game of microgames) {
        const docId = game.name.toLowerCase().replace(/!/g, '');
        const docRef = doc(microgamesCollection, docId);
        
        // Add default properties that are not in the base list
        const fullGameData: Omit<Microgame, 'id'> = {
            ...game,
            isActive: true, // All seeded games are active by default
            skins: {},      // Skins are added later
            isFavorite: false
        };
        
        try {
            await setDoc(docRef, fullGameData);
            console.log(`Successfully seeded: ${game.name}`);
        } catch (error) {
            console.error(`Error seeding ${game.name}:`, error);
        }
    }
    console.log("Database master list seeding complete!");
}