import React from 'react';
import styles from '@/styles/Home.module.css';

const Home = () => {

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to Bid-Chain</h1>
      <p className={styles.description}>
        Revolutionizing public procurement with <span className={styles.highlight}>blockchain</span> and{" "}
        <span className={styles.highlight}>AI-driven fuzzy logic</span> for secure and transparent bid evaluation.
      </p>
      <div className={styles.features}>
        <div className={styles.feature}>
          <h2>🔐 Secure Bidding</h2>
          <p>All bids are encrypted and stored securely on the blockchain, ensuring transparency and privacy.</p>
        </div>
        <div className={styles.feature}>
          <h2>🤖 Intelligent Evaluation</h2>
          <p>Using AI-powered fuzzy logic, we evaluate bids with fairness, efficiency, and precision.</p>
        </div>
        <div className={styles.feature}>
          <h2>📈 Real-Time Analytics</h2>
          <p>Monitor bid progress and tender results with real-time analytics and updates.</p>
        </div>
      </div>


     

      <p className={styles.footer}>
        Join us in creating a transparent and efficient future for public procurement.
      </p>
    </div>
  );
};

export default Home;
