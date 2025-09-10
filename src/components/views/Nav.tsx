// src/components/views/Nav.tsx

import React from 'react';
import { styles } from '../../App.styles';
import { CurrentPage } from '../../types';

interface NavProps {
  currentPage: CurrentPage;
  setCurrentPage: React.Dispatch<React.SetStateAction<CurrentPage>>;
}

export const Nav: React.FC<NavProps> = ({ currentPage, setCurrentPage }) => (
    <nav style={styles.nav}>
        <button onClick={() => setCurrentPage({ page: 'creator' })} style={currentPage.page === 'creator' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>Macrogame Creator</button>
        <button onClick={() => setCurrentPage({ page: 'manager' })} style={currentPage.page === 'manager' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>Macrogames</button>
        <button onClick={() => setCurrentPage({ page: 'popups' })} style={currentPage.page === 'popups' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>Popups</button>
        <button onClick={() => setCurrentPage({ page: 'campaigns' })} style={currentPage.page === 'campaigns' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>Campaigns</button>
        <button onClick={() => setCurrentPage({ page: 'microgames' })} style={currentPage.page === 'microgames' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>Microgames</button>
        <button onClick={() => setCurrentPage({ page: 'rewards' })} style={currentPage.page === 'rewards' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}>Rewards</button>
    </nav>
);