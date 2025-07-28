import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../App'; // Assuming db is exported from App.tsx
import { Microgame } from '../types';

const microgames: Omit<Microgame, 'id'>[] = [
    {
        name: 'Avoid!',
        baseType: 'Player Movement',
        controls: 'WASD/Arrows to Move',
        length: 8,
        skins: {
            'Gaming & Electronics': {
                description: 'Dodge the incoming fireballs!',
                visuals: 'player-ship, fireballs',
                sfx: 'laser-whoosh.wav'
            },
            'Cannabis': {
                description: 'Avoid the red tape!',
                visuals: 'leaf, red-tape',
                sfx: 'paper-rustle.wav'
            },
            'Pet Products': {
                description: 'Keep the puppy away from the chocolate!',
                visuals: 'puppy, chocolate-bar',
                sfx: 'bark.wav'
            }
        }
    },
    {
        name: 'Catch!',
        baseType: 'Catch Falling Objects',
        controls: 'Left/Right Arrows',
        length: 10,
        skins: {
            'Gaming & Electronics': {
                description: 'Catch the falling coins!',
                visuals: 'basket, coins',
                sfx: 'coin-collect.wav'
            },
            'Cannabis': {
                description: 'Catch the falling drops!',
                visuals: 'bottle, drops',
                sfx: 'droplet.wav'
            },
            'Pet Products': {
                description: 'Catch the falling dog treats!',
                visuals: 'dog-bowl, treats',
                sfx: 'crunch.wav'
            }
        }
    },
    {
        name: 'Claw!',
        baseType: 'Claw Machine',
        controls: 'Arrows to Move, Space to Drop',
        length: 12,
        skins: {
            'Gaming & Electronics': {
                description: 'Grab the rare CPU!',
                visuals: 'claw, cpu-chip',
                sfx: 'mechanical-whir.wav'
            },
            'Cannabis': {
                description: 'Grab the best bud!',
                visuals: 'claw, bud',
                sfx: 'mechanical-whir.wav'
            },
            'Pet Products': {
                description: 'Grab the squeaky toy!',
                visuals: 'claw, squeaky-toy',
                sfx: 'squeak.wav'
            }
        }
    },
    {
        name: 'Clean!',
        baseType: 'Click and Drag',
        controls: 'Click and Drag Mouse',
        length: 8,
        skins: {
            'Gaming & Electronics': {
                description: 'Wipe the dust off the screen!',
                visuals: 'cloth, dusty-screen',
                sfx: 'wipe.wav'
            },
            'Cannabis': {
                description: 'Clean the glass!',
                visuals: 'cloth, dirty-glass',
                sfx: 'wipe.wav'
            },
            'Pet Products': {
                description: 'Brush the dog\'s fur!',
                visuals: 'brush, matted-fur',
                sfx: 'brushing.wav'
            }
        }
    },
    {
        name: 'Collect!',
        baseType: 'Collection',
        controls: 'WASD/Arrows to Move',
        length: 10,
        skins: {
            'Gaming & Electronics': {
                description: 'Collect all the battery packs!',
                visuals: 'character, batteries',
                sfx: 'power-up.wav'
            },
            'Cannabis': {
                description: 'Collect all the ripe buds!',
                visuals: 'character, buds',
                sfx: 'pickup.wav'
            },
            'Pet Products': {
                description: 'Collect all the tennis balls!',
                visuals: 'dog, tennis-balls',
                sfx: 'pickup.wav'
            }
        }
    },
    {
        name: 'Consume!',
        baseType: 'Rapid Clicking',
        controls: 'Click repeatedly',
        length: 7,
        skins: {
            'Gaming & Electronics': {
                description: 'Mash the button to power up!',
                visuals: 'power-bar, button',
                sfx: 'click-powerup.wav'
            },
            'Cannabis': {
                description: 'Tap to consume!',
                visuals: 'joint, smoke-effect',
                sfx: 'inhale.wav'
            },
            'Pet Products': {
                description: 'Help the dog eat its food!',
                visuals: 'dog-eating, food-bowl',
                sfx: 'eating-fast.wav'
            }
        }
    },
    {
        name: 'Escape!',
        baseType: 'Maze Navigation',
        controls: 'WASD/Arrows to Move',
        length: 12,
        skins: {
            'Gaming & Electronics': {
                description: 'Escape the digital maze!',
                visuals: 'player-avatar, digital-walls',
                sfx: 'digital-step.wav'
            },
            'Cannabis': {
                description: 'Navigate the greenhouse!',
                visuals: 'person, plant-walls',
                sfx: 'footstep-dirt.wav'
            },
            'Pet Products': {
                description: 'Help the hamster escape the maze!',
                visuals: 'hamster, maze-walls',
                sfx: 'scamper.wav'
            }
        }
    },
    {
        name: 'Grow!',
        baseType: 'Timing/Hold and Release',
        controls: 'Hold and Release Spacebar',
        length: 8,
        skins: {
            'Gaming & Electronics': {
                description: 'Charge the power beam!',
                visuals: 'power-meter, beam',
                sfx: 'charge-up.wav'
            },
            'Cannabis': {
                description: 'Grow the plant to the perfect height!',
                visuals: 'plant-stalk, light-meter',
                sfx: 'grow-sound.wav'
            },
            'Pet Products': {
                description: 'Fill the water bowl just right!',
                visuals: 'water-level, bowl',
                sfx: 'water-fill.wav'
            }
        }
    },
    {
        name: 'Package!',
        baseType: 'Drag and Drop',
        controls: 'Drag items to the box',
        length: 10,
        skins: {
            'Gaming & Electronics': {
                description: 'Put the components in the box!',
                visuals: 'cpu, ram, box',
                sfx: 'item-drop.wav'
            },
            'Cannabis': {
                description: 'Package the product!',
                visuals: 'product-bag, shipping-box',
                sfx: 'tape-sound.wav'
            },
            'Pet Products': {
                description: 'Pack the pet carrier!',
                visuals: 'toy, blanket, carrier',
                sfx: 'zip-sound.wav'
            }
        }
    },
    {
        name: 'Trim!',
        baseType: 'Precision Clicking',
        controls: 'Click the targets',
        length: 9,
        skins: {
            'Gaming & Electronics': {
                description: 'Trim the excess circuits!',
                visuals: 'circuit-board, snips',
                sfx: 'snip.wav'
            },
            'Cannabis': {
                description: 'Trim the leaves!',
                visuals: 'plant, scissors',
                sfx: 'snip.wav'
            },
            'Pet Products': {
                description: 'Clip the dog\'s nails!',
                visuals: 'paw, clippers',
                sfx: 'clip.wav'
            }
        }
    }
];

export async function seedMicrogames() {
    const microgamesCollection = collection(db, 'microgames');
    
    // This new version ALWAYS clears the collection first.
    console.log("Clearing existing microgames...");
    const existingDocs = await getDocs(microgamesCollection);
    for (const docSnapshot of existingDocs.docs) {
        await deleteDoc(doc(db, 'microgames', docSnapshot.id));
    }
    console.log("Existing microgames cleared.");

    // Add new microgames
    console.log("Seeding new microgames...");
    for (const game of microgames) {
        // Use the game name (lowercase, no '!') as the document ID for consistency.
        const docId = game.name.toLowerCase().replace('!', '');
        const docRef = doc(microgamesCollection, docId);
        try {
            await setDoc(docRef, game);
            console.log(`Successfully seeded: ${game.name}`);
        } catch (error) {
            console.error(`Error seeding ${game.name}:`, error);
        }
    }
    console.log("Database seeding complete!");
}
