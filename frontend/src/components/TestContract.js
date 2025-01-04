import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract";

const TestContract = ({ contractAddress }) => {
  const { contract } = useContract(contractAddress); // Use the custom hook
  const [owner, setOwner] = useState(null); // Contract owner address
  const [publicKey, setPublicKey] = useState(null); // Encryption public key
  const [error, setError] = useState(null); // Error message
  const [hasFetchedPublicKey, setHasFetchedPublicKey] = useState(false); // Track if the public key has been fetched

  // Function to get the encryption public key using MetaMask
  const getEncryptionPublicKey = async (address) => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      // Check if the public key has already been fetched
      if (hasFetchedPublicKey) return publicKey;

      // Request the encryption public key from MetaMask
      const fetchedPublicKey = await window.ethereum.request({
        method: "eth_getEncryptionPublicKey",
        params: [address], // Address whose public key you want to fetch
      });

      console.log("Encryption Public Key:", fetchedPublicKey);
      setPublicKey(fetchedPublicKey);
      setHasFetchedPublicKey(true); // Mark as fetched
      return fetchedPublicKey;
    } catch (error) {
      if (error.code === 4001) {
        console.error("User denied the request.");
      } else {
        console.error("An error occurred:", error);
      }
      throw error;
    }
  };

  useEffect(() => {
    // Function to fetch contract owner and encryption public key
    const fetchContractData = async () => {
      if (contract) {
        try {
          // Fetch contract owner
          const contractOwner = await contract.getContractOwner();
          setOwner(contractOwner);

          // Fetch public key if owner is available
          if (contractOwner && !hasFetchedPublicKey) {
            await getEncryptionPublicKey(contractOwner);
          }
        } catch (err) {
          setError(err.message); // Handle errors
        }
      }
    };

    fetchContractData(); // Trigger the function
  }, [contract, hasFetchedPublicKey]);

  return (
    <div>
      <h2>Contract Information</h2>
      {error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : (
        <>
          <p>Contract Owner: {owner || "Fetching..."}</p>
          <p>Public Key: {publicKey || "Fetching..."}</p>
        </>
      )}
    </div>
  );
};

export default TestContract;
