import React, { useState, useEffect } from 'react';
import useContract from "@/hooks/useContract"; // Import your custom hook
import styles from "@/styles/ShowRegReq.module.css";
import useContract2 from '@/hooks/useContract2';
import { toast } from 'react-toastify';

const ShowRegRequest = () => {
  const { contract } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Smart contract address
  const {contract2,currentNonce} = useContract2("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const [pendingContractors, setPendingContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
 
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
          toast.error("Error fetching pending contractors:", err);
          console.error("Error fetching pending contractors:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPendingContractors();
  }, [contract]);

    // Approve contractor function
    const approveContractor = async(address) => {

      if (!contract) {
        toast.error("Contract not initialized or account not connected");
        console.error("Contract not initialized or account not connected");
        return;
      }

      setApproving(true);

      try {
         const tx = await contract2.registerContractor(address,{
          nonce: currentNonce, // Include the nonce in the transaction options
        }); 
        await tx.wait();
        toast.success(`Contractor ${address}} approved successfully`);
        console.log(`Contractor ${address} approved successfully`);

         // Remove approved contractor from the list
        setPendingContractors((prev) =>
          prev.filter((contractor) => contractor.contractorAddress !== address)
        );
        
      } catch (error) {
        toast.error("Error approving contractor");
        console.error(error);
      }

      finally {
        setApproving(false);
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
              <p><strong>Name:</strong> {contractor.companyName}</p>
              <p><strong>Email:</strong> {contractor.email}</p>
              <p><strong>Account:</strong> {contractor.contractorAddress}</p>
              <button className={styles.approveButton}
              onClick={() => approveContractor(contractor.contractorAddress)}
              disabled={approving}
              >
              {approving ? "Approving..." : "Approve"}
              </button>
            </div>
          ))
        )}
      </div>
    )}
  </div>
  )
}

export default ShowRegRequest