// components/Footer.js
import React from 'react';
import styles from '@/styles/Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      Developed by <span className={styles.developer}>Shureed Shazzad</span>
    </footer>
  );
};

export default Footer;