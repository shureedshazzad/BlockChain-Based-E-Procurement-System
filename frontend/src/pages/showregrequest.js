import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract"; // Import your custom hook
import styles from "@/styles/ShowRegReq.module.css";
import { toast } from "react-toastify";

const ShowRegRequest = () => {
  const { contract, currentNonce } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Smart contract address
  const [pendingContractors, setPendingContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvingStatus, setApprovingStatus] = useState({}); // Track approving state for each contractor

  // Fetch pending contractors from the contract
  useEffect(() => {
    const fetchPendingContractors = async () => {
      if (contract) {
        setLoading(true);
        try {
          // Call the getPendingContractors function
          const contractors = await contract.getPendingContractors();
          setPendingContractors(contractors);
        } catch (err) {
          toast.error("Error fetching pending contractors");
          console.error("Error fetching pending contractors:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPendingContractors();
  }, [contract]);

  // Approve contractor function
  const approveContractor = async (address) => {
    setApprovingStatus((prev) => ({ ...prev, [address]: true })); // Set approving state for the specific contractor
    try {
      if (!contract) {
        toast.error("Contract is not available. Please connect your wallet.");
        return;
      }
      // Use the currentNonce for the transaction
      const tx = await contract.registerContractor(address, {
        nonce: currentNonce, // Include the nonce in the transaction options
      });
      await tx.wait();
      toast.success(`Contractor ${address} approved successfully`);
      console.log(`Contractor ${address} approved successfully`);
      // Remove approved contractor from the list
      setPendingContractors((prev) =>
        prev.filter((contractor) => contractor.contractorAddress !== address)
      );
    } catch (error) {
      toast.error("Error approving contractor");
      console.error("Error approving contractor:", error);
    } finally {
      setApprovingStatus((prev) => ({ ...prev, [address]: false })); // Reset approving state for the specific contractor
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Pending Contractor Requests</h1>

      {loading ? (
        <p className={styles.loading}>Loading...</p>
      ) : (
        <div className={styles.contractorsList}>
          {pendingContractors.length === 0 ? (
            <p>No pending contractors</p>
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
                  onClick={() => approveContractor(contractor.contractorAddress)}
                  disabled={approvingStatus[contractor.contractorAddress]}
                >
                  {approvingStatus[contractor.contractorAddress]
                    ? "Approving..."
                    : "Approve"}
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
