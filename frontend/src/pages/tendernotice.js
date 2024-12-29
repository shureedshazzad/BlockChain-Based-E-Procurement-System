// TenderNotice.js
import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract";
import styles from "@/styles/TenderNotice.module.css";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

const TenderNotice = () => {
  const { contract, currentNonce } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const [activeTender, setActiveTender] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isRegisteredContractor, setIsRegisteredContractor] = useState(false);
  const [isTenderOpen, setIsTenderOpen] = useState(false); // Track if a tender is already active

  const router = useRouter();

  useEffect(() => {
    const fetchTenderDetails = async () => {
      if (!contract) return;

      try {
        const owner = await contract.getContractOwner();
        
        const tenderOpenStatus = await contract.isTenderOpen();
        setIsTenderOpen(tenderOpenStatus);

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const connectedAccount = accounts[0];
        setIsOwner(owner.toLowerCase() === connectedAccount.toLowerCase());

        const registeredContractors = await contract.getRegisteredContractors();
        const contractorAddresses = registeredContractors
          .map(c => c.contractorAddress?.toLowerCase())
          .filter(Boolean);
        setIsRegisteredContractor(contractorAddresses.includes(connectedAccount.toLowerCase()));

        const tenderDetails = await contract.viewActiveTenderDetails();
        const tender = {
          description: tenderDetails[0],
          noticeDocumentHash: tenderDetails[1],
          submissionEndTime: tenderDetails[2],
          additionalInfo: tenderDetails[3],
          isOpen: tenderDetails[4],
        };
        setActiveTender(tender);

        const currentTime = Math.floor(Date.now() / 1000);
        if (tender.isOpen && BigInt(tender.submissionEndTime) > BigInt(currentTime)) {
          setTimeLeft(Number(BigInt(tender.submissionEndTime) - BigInt(currentTime)));
        } else {
          setTimeLeft(0);
        }
      } catch (error) {
        console.error("Error fetching tender details:", error);
        setActiveTender(null);
      }
    };

    fetchTenderDetails();
  }, [contract]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const closeExpiredTender = async () => {
    try {
      const tx = await contract.closeExpiredTender({ nonce: currentNonce });
      await tx.wait();
      toast.success("Tender successfully closed!");
      router.push("/");
    } catch (error) {
      toast.error("Failed to close tender!");
    }
  };

  const cancelTender = async () => {
    try {
      const tx = await contract.cancelTender({ nonce: currentNonce });
      await tx.wait();
      toast.success("Tender successfully canceled");
      setActiveTender(null);
      router.push("/");
    } catch (error) {
      toast.error("Failed to cancel tender!");
    }
  };

  useEffect(() => {
    if (timeLeft === 0 && activeTender?.isOpen) {
      closeExpiredTender();
    }
  }, [timeLeft, activeTender]);

  return (
    <div className={styles.container}>
    <h1 className={styles.heading}>Tender Notice</h1>
    {isTenderOpen ? (
      activeTender ? (
        <div className={styles.card}>
          <h2 className={styles.subheading}>Active Tender Details</h2>
          <p><strong>Description:</strong> {activeTender.description}</p>
          <p>
            <strong>Notice Document:</strong>{" "}
            <a
              href={`https://gateway.pinata.cloud/ipfs/${activeTender.noticeDocumentHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              View Document
            </a>
          </p>
          {Number(activeTender.additionalInfo) === 0 ? (
            <>
              <p>
                <strong>Time Left:</strong> {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
              </p>
              <p><strong>Status:</strong> Open</p>
              {isOwner && (
                <button className={styles.button} onClick={closeExpiredTender}>
                  Close Tender Manually
                </button>
              )}
            </>
          ) : (
            <p><strong>Status:</strong> Closed</p>
          )}
          {isOwner && (
            <button className={styles.button} onClick={cancelTender}>
              Cancel Tender
            </button>
          )}
          {isRegisteredContractor && Number(activeTender.additionalInfo) === 0 && (
            <button className={styles.button}>Submit Bid</button>
          )}
        </div>
      ) : (
        <p>No active tender notice is available at the moment.</p>
      )
    ) : (
      <p>No tender is currently published.</p>
    )}
  </div>
  );
};

export default TenderNotice;
