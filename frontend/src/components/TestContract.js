import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract";

const TestContract = ({ contractAddress }) => {
  const { contract } = useContract(contractAddress); // Use the custom hook
  const [owner, setOwner] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Function to fetch contract owner
    const fetchOwner = async () => {
      if (contract) {
        try {
          const contractOwner = await contract.getContractOwner(); // Call the smart contract function
          setOwner(contractOwner); // Set the owner address
        } catch (err) {
          setError(err.message); // Handle errors
        }
      }
    };

    fetchOwner(); // Trigger the fetchOwner function
  }, [contract]);

  return (
    <div>
      <h2>Contract Information</h2>
      {error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : (
        <p>Contract Owner: {owner || "Fetching..."}</p>
      )}
    </div>
  );
};

export default TestContract;
