import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract"; // Custom hook to interact with the contract
import styles from "@/styles/TenderNotice.module.css"; // Importing styles
import { toast } from "react-toastify"; // For showing toast notifications
import { useRouter } from "next/router"; // Next.js router for page navigation

const TenderNotice = () => {
  // Contract and current nonce from the custom hook
  const { contract, currentNonce } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  
  // States to hold various data for the tender and user's status
  const [activeTender, setActiveTender] = useState(null); // Active tender details
  const [timeLeft, setTimeLeft] = useState(0); // Time left for tender submission
  const [isOwner, setIsOwner] = useState(false); // Whether the current user is the owner
  const [isRegisteredContractor, setIsRegisteredContractor] = useState(false); // Whether the current user is a registered contractor
  const [isTenderOpen, setIsTenderOpen] = useState(false); // Whether the tender is open
  const [hasSubmittedBid, setHasSubmittedBid] = useState(false); // Whether the user has already submitted a bid

  const router = useRouter(); // Using Next.js router to navigate between pages

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

        // Get list of registered contractors and check if the connected account is a registered contractor
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
          setTimeLeft(0); // Set timeLeft to 0 if the tender is closed
        }

        // Check if the user has already submitted a bid
        const bidStatus = await contract.hasSubmittedBid(connectedAccount); 
        setHasSubmittedBid(bidStatus);

      } catch (error) {
        console.error("Error fetching tender details:", error);
        setActiveTender(null);
      }
    };

    fetchTenderDetails();
  }, [contract]); // Effect runs when the contract changes

  // Updating the countdown timer every second
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer); // Clean up the interval on component unmount
    }
  }, [timeLeft]);

  // Function to close the tender if expired
  const closeExpiredTender = async () => {
    try {
      const tx = await contract.closeExpiredTender({ nonce: currentNonce });
      await tx.wait();
      toast.success("Tender successfully closed!");
      router.push("/"); // Redirecting to the home page
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
      setActiveTender(null); // Clear active tender details
      router.push("/"); // Redirect to the home page
    } catch (error) {
      toast.error("Failed to cancel tender!");
    }
  };

  // Automatically close the tender when time left reaches zero
  useEffect(() => {
    if (timeLeft === 0 && activeTender?.isOpen) {
      closeExpiredTender();
    }
  }, [timeLeft, activeTender]); // Effect runs when timeLeft or activeTender changes

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
              hasSubmittedBid ? (
                <p className={styles.submittedMessage}>You have already submitted your bid.</p>
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
