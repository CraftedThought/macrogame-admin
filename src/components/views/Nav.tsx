// src/components/views/Nav.tsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { styles } from '../../App.styles';

export const Nav: React.FC = () => {
    
    // The NavLink component provides an `isActive` boolean to its children.
    // We can use a function to dynamically apply our active style.
    const getNavStyle = ({ isActive }: { isActive: boolean }) => 
        isActive 
            ? {...styles.navButton, ...styles.navButtonActive} 
            : styles.navButton;

    return (
        <nav style={styles.nav}>
            <NavLink to="/creator" style={getNavStyle}>Macrogame Creator</NavLink>
            <NavLink to="/manager" style={getNavStyle}>Macrogames</NavLink>
            <NavLink to="/delivery" style={getNavStyle}>Delivery</NavLink>
            <NavLink to="/campaigns" style={getNavStyle}>Campaigns</NavLink>
            <NavLink to="/microgames" style={getNavStyle}>Microgames</NavLink>
            <NavLink to="/conversions" style={getNavStyle}>Conversions</NavLink>
        </nav>
    );
};