import { useState,useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "../../abi/e-procurement.json";

/**
 * Custom hook for interacting with the BidChain smart contract.
 * @param {string} contractAddress - Deployed contract address.
 * @returns {object} Object containing contract instance and helper methods.
 */

const useContract = (contractAddress) => {
    const [contract,setContract] = useState(null);

    useEffect(() => {
         // Initialize the smart contract on mount

         const initializeContract = async () =>{
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contractInstance = new ethers.Contract(
                    contractAddress,
                    contractABI,
                    provider
                );

                setContract(contractInstance);

                
            } catch (error) {
                console.error("Error initializing contract:", error);
            }
         };

         initializeContract();

    },[contractAddress]);

    return {contract};
     
};

export default useContract;