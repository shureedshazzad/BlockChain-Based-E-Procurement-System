import { useState,useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "../../abi/e-procurement.json";

/**
 * Custom hook for interacting with the BidChain smart contract.
 * @param {string} contractAddress - Deployed contract address.
 * @returns {object} Object containing contract instance and helper methods.
 */

const useContract2 = (contractAddress) => {
    const [contract,setContract] = useState(null);
    const [currentNonce,setCurrentNonce] = useState(null);
 

    useEffect(() => {
         // Initialize the smart contract on mount

         const initializeContract = async () =>{
            try {

                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const address = await signer.getAddress(); // Get the wallet address
                const currentNonce = await provider.getTransactionCount(address);
                const contractInstance = new ethers.Contract(
                    contractAddress,
                    contractABI,
                    signer
                );

             
                setContract(contractInstance);
                setCurrentNonce(currentNonce);
               

                
            } catch (error) {
                console.error("Error initializing contract:", error);
            }
         };

         initializeContract();

    },[contractAddress]);

    return {contract,currentNonce};
     
};

export default useContract2;