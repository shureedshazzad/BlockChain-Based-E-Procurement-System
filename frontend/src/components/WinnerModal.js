import React, { useState } from 'react';
import styles from "@/styles/Winner.module.css";

const WinnerModal = ({ winner, onClose }) => {
    if (!winner) return null;
  
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <h2>🏆 Winning Bid Announcement</h2>
            <button onClick={onClose} className={styles.closeButton}>
              &times;
            </button>
          </div>
  
          <div className={styles.winnerCard}>
            <div className={styles.winnerBadge}>Winner</div>
            <h3 className={styles.companyName}>{winner.companyName}</h3>
            <p className={styles.bidderAddress}>{winner.bidder}</p>
  
            <div className={styles.scoreContainer}>
              <div className={styles.scoreCircle}>
                <span className={styles.scoreLabel}>Score</span>
                <span className={styles.scoreValue}>{winner.score.toFixed(2)}</span>
              </div>
            </div>
  
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Budget</span>
                <span className={styles.detailValue}>
                  ${winner.details.budget.toLocaleString()}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Experience</span>
                <span className={styles.detailValue}>
                  {winner.details.experience} years
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Workforce</span>
                <span className={styles.detailValue}>
                  {winner.details.workforce} workers
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Timeline</span>
                <span className={styles.detailValue}>
                  {winner.details.timeline}
                </span>
              </div>
            </div>
  
            <div className={styles.qualitativeSection}>
              <h4>Quality Factors</h4>
              <div className={styles.qualityPills}>
                <div className={styles.pill}>
                  <span>Safety:</span> 
                  <span className={styles.pillScore}>{winner.details.safetyStandards.score}/10</span>
                  <div className={styles.tooltip}>{winner.details.safetyStandards.description}</div>
                </div>
                <div className={styles.pill}>
                  <span>Materials:</span> 
                  <span className={styles.pillScore}>{winner.details.materialQuality.score}/10</span>
                  <div className={styles.tooltip}>{winner.details.materialQuality.description}</div>
                </div>
                <div className={styles.pill}>
                  <span>Environment:</span> 
                  <span className={styles.pillScore}>{winner.details.environmentalImpact.score}/10</span>
                  <div className={styles.tooltip}>{winner.details.environmentalImpact.description}</div>
                </div>
              </div>
            </div>
  
            <button className={styles.celebrateButton} onClick={() => alert('Congratulations!')}>
              Celebrate Winner 🎉
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  export default WinnerModal;
