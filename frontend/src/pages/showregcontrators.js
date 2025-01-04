import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract"; // Import your custom hook to interact with the smart contract
import styles from "@/styles/ShowRegContractors.module.css"; // Import styles for the component
import { toast } from "react-toastify"; // Import toast for showing notifications

const ShowRegContractors = () => {
  // Initialize contract state and fetch contract address via useContract hook
  const { contract } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Smart contract address
  const [registeredContractors, setRegisteredContractors] = useState([]); // State to store registered contractors
  const [loading, setLoading] = useState(false); // State to manage loading state while fetching contractors
  const [deletingStatus, setDeletingStatus] = useState({}); // State to track deleting state for each contractor

  // useEffect hook to fetch registered contractors from the contract
  useEffect(() => {
    const fetchRegisteredContractors = async () => {
      if (contract) {
        setLoading(true); // Set loading state to true before starting the fetch operation
        try {
          // Fetch registered contractors using contract's method getRegisteredContractors()
          const contractors = await contract.getRegisteredContractors();
          setRegisteredContractors(contractors); // Update state with fetched contractors
        } catch (err) {
          // Handle any error that occurs during the fetch
          toast.error("Error fetching registered contractors");
          console.error("Error fetching registered contractors:", err);
        } finally {
          setLoading(false); // Set loading state to false after the fetch operation
        }
      }
    };

    fetchRegisteredContractors(); // Call the fetch function
  }, [contract]); // Dependency array ensures that the effect runs when the contract is available

  // Function to handle the deletion of a contractor
  const deleteContractor = async (address) => {
    setDeletingStatus((prev) => ({ ...prev, [address]: true })); // Set deleting state for the specific contractor
    try {
      if (!contract) {
        toast.error("Contract is not available. Please connect your wallet."); // Handle case when contract is unavailable
        return;
      }
      // Call the contract's deleteRegisteredContractor method with the contractor's address
      const tx = await contract.deleteRegisteredContractor(address);
      await tx.wait(); // Wait for the transaction to be mined
      toast.success(`Contractor ${address} deleted successfully`); // Show success notification
      console.log(`Contractor ${address} deleted successfully`);
      // Remove deleted contractor from the list in state
      setRegisteredContractors((prev) =>
        prev.filter((contractor) => contractor.contractorAddress !== address)
      );
    } catch (error) {
      toast.error("Error deleting contractor"); // Show error notification if deletion fails
      console.error("Error deleting contractor:", error);
    } finally {
      setDeletingStatus((prev) => ({ ...prev, [address]: false })); // Reset deleting state for the specific contractor
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Registered Contractors</h1>

      {loading ? (
        <p className={styles.loading}>Loading...</p> // Display loading text while fetching data
      ) : (
        <div className={styles.contractorsList}>
          {registeredContractors.length === 0 ? (
            <p>No registered contractors</p> // Show message if there are no contractors
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
                  onClick={() => deleteContractor(contractor.contractorAddress)} // Delete contractor on button click
                  disabled={deletingStatus[contractor.contractorAddress]} // Disable button when deleting
                >
                  {deletingStatus[contractor.contractorAddress]
                    ? "Deleting..."
                    : "Delete"} {/* Show "Deleting..." when contractor is being deleted */}
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
