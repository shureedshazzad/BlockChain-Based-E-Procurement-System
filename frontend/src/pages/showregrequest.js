import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract"; // Import your custom hook to interact with the smart contract
import styles from "@/styles/ShowRegReq.module.css"; // Import styles for the component
import { toast } from "react-toastify"; // Import toast for showing notifications

const ShowRegRequest = () => {
  // Initialize contract state and fetch contract address via useContract hook, along with currentNonce for transaction management
  const { contract, currentNonce } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Smart contract address
  const [pendingContractors, setPendingContractors] = useState([]); // State to store pending contractors
  const [loading, setLoading] = useState(false); // State to manage loading state while fetching contractors
  const [approvingStatus, setApprovingStatus] = useState({}); // State to track approving state for each contractor

  // useEffect hook to fetch pending contractors from the contract
  useEffect(() => {
    const fetchPendingContractors = async () => {
      if (contract) {
        setLoading(true); // Set loading state to true before starting the fetch operation
        try {
          // Fetch pending contractors using contract's method getPendingContractors()
          const contractors = await contract.getPendingContractors();
          setPendingContractors(contractors); // Update state with fetched contractors
        } catch (err) {
          // Handle any error that occurs during the fetch
          toast.error("Error fetching pending contractors");
          console.error("Error fetching pending contractors:", err);
        } finally {
          setLoading(false); // Set loading state to false after the fetch operation
        }
      }
    };

    fetchPendingContractors(); // Call the fetch function
  }, [contract]); // Dependency array ensures that the effect runs when the contract is available

  // Function to handle the approval of a contractor
  const approveContractor = async (address) => {
    setApprovingStatus((prev) => ({ ...prev, [address]: true })); // Set approving state for the specific contractor
    try {
      if (!contract) {
        toast.error("Contract is not available. Please connect your wallet."); // Handle case when contract is unavailable
        return;
      }
      // Use the currentNonce for the transaction to prevent replay attacks and manage transaction order
      const tx = await contract.registerContractor(address, {
        nonce: currentNonce, // Include the nonce in the transaction options
      });
      await tx.wait(); // Wait for the transaction to be mined
      toast.success(`Contractor ${address} approved successfully`); // Show success notification
      console.log(`Contractor ${address} approved successfully`);
      // Remove approved contractor from the list in state
      setPendingContractors((prev) =>
        prev.filter((contractor) => contractor.contractorAddress !== address)
      );
    } catch (error) {
      toast.error("Error approving contractor"); // Show error notification if approval fails
      console.error("Error approving contractor:", error);
    } finally {
      setApprovingStatus((prev) => ({ ...prev, [address]: false })); // Reset approving state for the specific contractor
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Pending Contractor Requests</h1>

      {loading ? (
        <p className={styles.loading}>Loading...</p> // Display loading text while fetching data
      ) : (
        <div className={styles.contractorsList}>
          {pendingContractors.length === 0 ? (
            <p>No pending contractors</p> // Show message if there are no pending contractors
          ) : (
            pendingContractors.map((contractor, index) => (
              <div key={index} className={styles.contractorCard}>
                <p>
                  <strong>Name:</strong> {contractor.companyName}
                </p>
                <p>
                  <strong>Email:</strong> {contractor.email}
                </p>
                <p>
                  <strong>Account:</strong> {contractor.contractorAddress}
                </p>
                <button
                  className={styles.approveButton}
                  onClick={() => approveContractor(contractor.contractorAddress)} // Approve contractor on button click
                  disabled={approvingStatus[contractor.contractorAddress]} // Disable button when approval is in progress
                >
                  {approvingStatus[contractor.contractorAddress]
                    ? "Approving..."
                    : "Approve"} {/* Show "Approving..." when contractor is being approved */}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ShowRegRequest;
