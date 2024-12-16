// src/utils/connectWallet.js

// Importing ethers.js library for interacting with Ethereum blockchain
import { ethers } from "ethers";

/**
 * Function to connect to the MetaMask wallet.
 * - Requests user permission to access their Ethereum wallet.
 * - Returns the user's wallet address.
 * @returns {Promise<string>} User's Ethereum wallet address.
 */
export const connectWallet = async () => {
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      throw new Error("MetaMask not found. Please install MetaMask.");
    }

    // Request wallet connection and get the user's accounts
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // Return the first account (default MetaMask account)
    return accounts[0];
  } catch (error) {
    console.error("Error connecting to MetaMask:", error);
    throw error;
  }
};

/**
 * Function to get the provider for interacting with the Ethereum network.
 * - Connects to MetaMask's injected provider.
 * - Returns an ethers.js provider instance.
 * @returns {ethers.providers.Web3Provider} ethers.js provider.
 */
export const getProvider = () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }
  return new ethers.BrowserProvider(window.ethereum);
};


/**
 * Retrieves the current signer.
 * @returns {Promise<ethers.Signer>} The signer for signing transactions.
 * @throws If MetaMask is not installed or not connected.
 */
export const getSigner = async () => {
  const provider = getProvider();
  try {
    return provider.getSigner();
  } catch (error) {
    throw new Error("Failed to get signer: " + error.message);
  }
};


/**
 * Switches the MetaMask network to a specified chain.
 * @param {string} chainId The chain ID to switch to (e.g., "0x1" for Ethereum mainnet).
 * @throws If switching fails or the chain ID is invalid.
 */
export const switchNetwork = async (chainId) => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    if (error.code === 4902) {
      throw new Error("Network not found in MetaMask.");
    } else {
      throw new Error("Failed to switch network: " + error.message);
    }
  }
};
