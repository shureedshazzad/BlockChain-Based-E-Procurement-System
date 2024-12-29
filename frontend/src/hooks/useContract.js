import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "../../abi/e-procurement.json";

/**
 * Custom hook for interacting with the BidChain smart contract.
 * Combines read and write functionality using provider and signer.
 * @param {string} contractAddress - Deployed contract address.
 * @returns {object} Object containing contract instance, wallet address, current nonce, and helper data.
 */
const useContract = (contractAddress) => {
  const [contract, setContract] = useState(null); // Contract instance
  const [currentNonce, setCurrentNonce] = useState(null); // Nonce for transactions
  const [walletAddress, setWalletAddress] = useState(null); // Connected wallet address
  const [networkName, setNetworkName] = useState(null); // Network name

  useEffect(() => {
    // Initialize the smart contract
    const initializeContract = async () => {
      try {
        if (!window.ethereum) {
          console.error("Ethereum provider is not available.");
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress(); // Get wallet address
        const nonce = await provider.getTransactionCount(address); // Get current nonce
        const network = await provider.getNetwork(); // Get network name

        const contractInstance = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        setContract(contractInstance);
        setWalletAddress(address);
        setCurrentNonce(nonce);
        setNetworkName(network.name);
      } catch (error) {
        console.error("Error initializing contract:", error);
      }
    };

    initializeContract();
  }, [contractAddress]);

  return { contract, currentNonce, walletAddress, networkName };
};

export default useContract;
