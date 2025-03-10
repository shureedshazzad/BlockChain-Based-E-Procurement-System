import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract"; // Custom hook to interact with the contract
import styles from "@/styles/TenderNotice.module.css"; // Importing styles
import { toast } from "react-toastify"; // For showing toast notifications
import { useRouter } from "next/router"; // Next.js router for page navigation

import dotenv from "dotenv";

dotenv.config();

const TenderNotice = () => {
  // Contract and nonce from the custom hook
  const { contract, currentNonce } = useContract(process.env.NEXT_PUBLIC_DEPLOYED_ADDRESS);

  // States to hold various tender and user-related data
  const [activeTender, setActiveTender] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isRegisteredContractor, setIsRegisteredContractor] = useState(false);
  const [isTenderOpen, setIsTenderOpen] = useState(false);
  const [hasSubmittedBid, setHasSubmittedBid] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false); // Loading state for withdrawing
  const [noticeText, setNoticeText] = useState(""); // State to store the fetched notice text

  const router = useRouter(); // Next.js router for navigation

  // Fetching tender details when the component is mounted or the contract changes
  useEffect(() => {
    const fetchTenderDetails = async () => {
      if (!contract) return;

      try {
        // Fetch contract owner address
        const owner = await contract.getContractOwner();
        // Check if the tender is open
        const tenderOpenStatus = await contract.isTenderOpen();
        setIsTenderOpen(tenderOpenStatus);

        // Get connected account address
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const connectedAccount = accounts[0];

        // Check if the connected account is the owner
        setIsOwner(owner.toLowerCase() === connectedAccount.toLowerCase());

        // Get list of registered contractors and check if the connected account is registered
        const registeredContractors = await contract.getRegisteredContractors();
        const contractorAddresses = registeredContractors
          .map(c => c.contractorAddress?.toLowerCase())
          .filter(Boolean);
        setIsRegisteredContractor(contractorAddresses.includes(connectedAccount.toLowerCase()));

        // Fetch the active tender details
        const tenderDetails = await contract.viewActiveTenderDetails();
        const tender = {
          description: tenderDetails[0],
          noticeDocumentHash: tenderDetails[1],
          submissionEndTime: tenderDetails[2],
          additionalInfo: tenderDetails[3],
          isOpen: tenderDetails[4],
        };
        setActiveTender(tender);

        // Calculate time left for tender submission
        const currentTime = Math.floor(Date.now() / 1000);
        if (tender.isOpen && BigInt(tender.submissionEndTime) > BigInt(currentTime)) {
          setTimeLeft(Number(BigInt(tender.submissionEndTime) - BigInt(currentTime)));
        } else {
          setTimeLeft(0);
        }

        // Check if the user has already submitted a bid
        const bidStatus = await contract.hasSubmittedBid(connectedAccount);
        setHasSubmittedBid(bidStatus);

        // Fetch the notice text from IPFS
        if (tender.noticeDocumentHash) {
          const response = await fetch(`https://gateway.pinata.cloud/ipfs/${tender.noticeDocumentHash}`);
          const tenderData = await response.json();
          setNoticeText(tenderData.noticeText); // Extract and set the notice text
        }

      } catch (error) {
        console.error("Error fetching tender details:", error);
        setActiveTender(null);
      }
    };

    fetchTenderDetails();
  }, [contract]);

  // Updating the countdown timer every second
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  // Function to withdraw a bid
  const withdrawBid = async () => {
    if (!contract) return;

    try {
      setIsWithdrawing(true); // Start loading state
      const tx = await contract.withdrawBid({ nonce: currentNonce });
      await tx.wait();
      toast.success("Bid successfully withdrawn!");
      router.back(); // Redirect to the previous page
    } catch (error) {
      console.error("Withdraw bid failed:", error);
      toast.error("Failed to withdraw bid!");
    } finally {
      setIsWithdrawing(false); // Stop loading state
    }
  };

  // Function to close the tender if expired
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

  // Function to cancel the tender
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

  // Automatically close the tender when time left reaches zero
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
            {noticeText && (
              <div className={styles.noticeContainer}>
                <h3 className={styles.noticeHeading}>Tender Notice:</h3>
                <pre className={styles.noticeText}>{noticeText}</pre>
              </div>
            )}
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
              <>     
              <p><strong>Status:</strong> Closed</p>
              <button
                className={styles.button}
                onClick={() => router.push("/allsubmittedbid")}
              >
                Show All Submitted Bids
              </button>
              </>
            )}
            {isOwner && (
              <button className={styles.button} onClick={cancelTender}>
                Cancel Tender
              </button>
            )}
            {isRegisteredContractor && Number(activeTender.additionalInfo) === 0 && (
              hasSubmittedBid ? (
                <>
                  <p className={styles.submittedMessage}>You have already submitted your bid.</p>
                  <button 
                    className={styles.button} 
                    onClick={withdrawBid}
                    disabled={isWithdrawing}
                  >
                    {isWithdrawing ? "Withdrawing..." : "Withdraw Bid"}
                  </button>
                </>
              ) : (
                <button
                  className={styles.button}
                  onClick={() => router.push("/bidsubmissionpage")}
                >
                  Submit Bid
                </button>
              )
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