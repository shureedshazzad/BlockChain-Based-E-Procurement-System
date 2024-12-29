import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract"; // Import your custom hook
import styles from "@/styles/ShowRegContractors.module.css";
import { toast } from "react-toastify";

const ShowRegContractors = () => {
  const { contract } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Smart contract address
  const [registeredContractors, setRegisteredContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingStatus, setDeletingStatus] = useState({}); // Track deleting state for each contractor

  // Fetch registered contractors from the contract
  useEffect(() => {
    const fetchRegisteredContractors = async () => {
      if (contract) {
        setLoading(true);
        try {
          // Call the getRegisteredContractors function
          const contractors = await contract.getRegisteredContractors();
          setRegisteredContractors(contractors);
        } catch (err) {
          toast.error("Error fetching registered contractors");
          console.error("Error fetching registered contractors:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRegisteredContractors();
  }, [contract]);

  // Delete contractor function
  const deleteContractor = async (address) => {
    setDeletingStatus((prev) => ({ ...prev, [address]: true })); // Set deleting state for the specific contractor
    try {
      if (!contract) {
        toast.error("Contract is not available. Please connect your wallet.");
        return;
      }
      // Call the deleteRegisteredContractor function
      const tx = await contract.deleteRegisteredContractor(address);
      await tx.wait();
      toast.success(`Contractor ${address} deleted successfully`);
      console.log(`Contractor ${address} deleted successfully`);
      // Remove deleted contractor from the list
      setRegisteredContractors((prev) =>
        prev.filter((contractor) => contractor.contractorAddress !== address)
      );
    } catch (error) {
      toast.error("Error deleting contractor");
      console.error("Error deleting contractor:", error);
    } finally {
      setDeletingStatus((prev) => ({ ...prev, [address]: false })); // Reset deleting state for the specific contractor
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Registered Contractors</h1>

      {loading ? (
        <p className={styles.loading}>Loading...</p>
      ) : (
        <div className={styles.contractorsList}>
          {registeredContractors.length === 0 ? (
            <p>No registered contractors</p>
          ) : (
            registeredContractors.map((contractor, index) => (
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
                  className={styles.deleteButton}
                  onClick={() => deleteContractor(contractor.contractorAddress)}
                  disabled={deletingStatus[contractor.contractorAddress]}
                >
                  {deletingStatus[contractor.contractorAddress]
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ShowRegContractors;
