// src/microgames/preloader.ts

// This function dynamically imports the code for a microgame.
// The bundler (Vite) will see this dynamic import and know to code-split these files.
const loadMicrogame = (gameId: string) => {
    return import(`./games/${gameId}.tsx`);
};

// This function takes an array of microgame IDs and preloads all of them in parallel.
export const preloadMicrogames = async (gameIds: string[]): Promise<void> => {
    try {
        // Create an array of promises, one for each microgame to be loaded.
        const preloadPromises = gameIds.map(id => loadMicrogame(id));
        // Wait for all promises to resolve.
        await Promise.all(preloadPromises);
        console.log('All required microgames have been preloaded.');
    } catch (error) {
        console.error("Failed to preload one or more microgames:", error);
        // We can decide to continue gracefully or show an error to the user.
        // For now, we'll log the error and let the app try to continue.
    }
};