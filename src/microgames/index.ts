// src/microgames/index.ts

import { lazy, LazyExoticComponent, FC } from 'react';

// Vite's import.meta.glob feature automatically finds all files matching the pattern.
// { eager: false } creates dynamic import functions for each file.
const modules = import.meta.glob('./games/*.tsx');

export const microgames: { [key: string]: LazyExoticComponent<FC<any>> } = {};

// This loop processes the object from Vite and populates our microgames object.
for (const path in modules) {
  // Extract the filename without the path and extension (e.g., "./games/DiceRoll.tsx" -> "DiceRoll")
  const gameId = path.match(/\.\/games\/(.*)\.tsx$/)?.[1];
  
  if (gameId) {
    // For each gameId, we create a lazy-loaded component.
    microgames[gameId] = lazy(modules[path] as () => Promise<{ default: FC<any> }>);
  }
}