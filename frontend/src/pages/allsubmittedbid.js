import React, { useEffect, useState } from "react";
import useContract from "@/hooks/useContract";
import styles from "@/styles/AllSubmittedBid.module.css";
import { useRouter } from "next/router";
import axios from "axios";
import CryptoJS from "crypto-js";
import dotenv from "dotenv";
import init, * as ecies from "ecies-wasm";
import { ec as EC } from "elliptic";
import WinnerModal from "@/components/WinnerModal";

dotenv.config();

const AllSubmittedBids = () => {
  const { contract } = useContract(process.env.NEXT_PUBLIC_DEPLOYED_ADDRESS);
  const [bidderAddresses, setBidderAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false); // For Test button loading state


  const [winner, setWinner] = useState(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  const router = useRouter();


  //fetch all bidder addresses when contract in loaded
  useEffect(() => {
    const fetchBidderAddresses = async () => {
      if (!contract) return;
      try {
        setLoading(true);
        const addresses = await contract.getBidderAddresses();
        setBidderAddresses(addresses);
      } catch (error) {
        console.error("Error fetching bidder addresses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBidderAddresses();
  }, [contract]);

  // Navigate to the BidInfoOfSpecificBidder page with the bidder's address
  const handleButtonClick = (address) => {
    router.push(`/bidinfoofspecificbidder?address=${address}`);
  };


    // Function to send bid data to the Python backend for fuzzy logic evaluation
    const sendBidsForEvaluation = async (bids, tender) => {
      try {
        const response = await fetch("/api/evaluate_bids", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tenderDetails: tender,
            bids: bids,
          }),
        });
  
        const result = await response.json();
        console.log("Fuzzy Logic Evaluation Result:", result);
      } catch (error) {
        console.error("Error sending bid data for evaluation:", error);
      }
    };
  




  // Function to fetch & decrypt all bid data
  const fetchAndDecryptAllBids = async () => {
    if (!contract) return;
    try {
      setIsDecrypting(true);
      console.log("Fetching submitted bids...");

      // Fetch all submitted bid details
      const [addresses, amounts, ipfsHashes, encryptedKeyHashes] = await contract.viewSubmittedBids();

      //fecth the tender details from ipfs
      const tenderDetails = await contract.viewActiveTenderDetails();
      const tender = {
        description: tenderDetails[0],
        noticeDocumentHash: tenderDetails[1],
        submissionEndTime: tenderDetails[2],
        additionalInfo: tenderDetails[3],
        isOpen: tenderDetails[4],
      };

        
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${tender.noticeDocumentHash}`);
        const tenderData = await response.json();
        console.log(tenderData.tenderData);
        
        let allBids = [];


       for (let i = 0; i < addresses.length; i++) {
        console.log("Bidder Address:", addresses[i]);

        // Fetch encrypted bid document from IPFS
        const dataResponse = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHashes[i]}`);
        const encryptedData = dataResponse.data;

        // Fetch encrypted symmetric key from IPFS
        const keyResponse = await axios.get(`https://gateway.pinata.cloud/ipfs/${encryptedKeyHashes[i]}`);
        const encryptedKey = keyResponse.data;

        // Decrypt the AES key
        const decryptedKey = await decryptSymmetricKey(encryptedKey);

        // Decrypt bid details using AES key
        const decryptedBidDetails = await decryptData(encryptedData, decryptedKey);

        console.log("Decrypted Bid Data:", decryptedBidDetails);

              // Add decrypted bid details to the list
       allBids.push({
        bidder: addresses[i],
        companyName: decryptedBidDetails.companyName,
        projectStartTime: decryptedBidDetails.projectStartTime,
        projectEndTime: decryptedBidDetails.projectEndTime,
        budget: parseFloat(decryptedBidDetails.budget),
        requiredExperience: parseFloat(decryptedBidDetails.requiredExperience),
        safetyStandards: decryptedBidDetails.safetyStandards,
        materialQuality: decryptedBidDetails.materialQuality,
        workforceSize: parseFloat(decryptedBidDetails.workforceSize),
        environmentalImpact: decryptedBidDetails.environmentalImpact,
        });


        
      // Send all decrypted bids to the Python backend for fuzzy logic evaluation
      sendBidsForEvaluation(allBids, tenderData);

      const evaluationResponse = await sendBidsForEvaluation(allBids, tenderData);
      setWinner(evaluationResponse.winner);
      setShowWinnerModal(true);
      }
    } catch (error) {
      console.error("Error fetching or decrypting bid details:", error);
    } finally {
      setIsDecrypting(false);
    }
  };

  // Decrypt the symmetric AES key (using a password-based key derivation)
  const decryptSymmetricKey = async (encryptedKey) => {
    const password = process.env.NEXT_PUBLIC_ELIPTIC_CRYPTOGRAPHY_PASSWORD;
    const hashedPassword = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    const ec = new EC("secp256k1");
    const keyPair = ec.keyFromPrivate(hashedPassword);

    // Extract private key as bytes
    const privateKey = fromHexString(keyPair.getPrivate("hex"));

    // Initialize WASM module
    await init();

    // Decrypt AES key
    const encryptedKeyBytes = fromHexString(encryptedKey);
    const decryptedKeyBytes = ecies.decrypt(privateKey, encryptedKeyBytes);

    // Convert decrypted key back to a string
    return new TextDecoder().decode(decryptedKeyBytes);
  };

  // Helper function to convert hex string to Uint8Array
  const fromHexString = (hexString) =>
    new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

  // Decrypt data using AES-256
  const decryptData = (encryptedData, aesKey) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, aesKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Bidder Addresses</h1>

      {loading ? (
        <p className={styles.loading}>Loading bidder addresses...</p>
      ) : (
        <div className={styles.bidList}>
          {bidderAddresses.length > 0 ? (
            bidderAddresses.map((address, index) => (
              <div key={index} className={styles.bidCard}>
                <p><strong>Bidder Address:</strong> {address}</p>
                <button 
                  className={styles.bidderButton}
                  onClick={() => handleButtonClick(address)}
                >
                  View Details
                </button>
              </div>
            ))
          ) : (
            <p>No bidder addresses found.</p>
          )}
        </div>
      )}

      {/* Centered Test Button for Better UI */}
      <div className={styles.buttonContainer}>
        <button
          className={styles.testButton}
          onClick={fetchAndDecryptAllBids}
          disabled={isDecrypting}
        >
          {isDecrypting ? "Decrypting..." : "Announce Winner"}
        </button>
      </div>

      {showWinnerModal && (
      <WinnerModal 
        winner={winner} 
        onClose={() => setShowWinnerModal(false)} 
      />
    )}

    </div>
  );
};

export default AllSubmittedBids;
