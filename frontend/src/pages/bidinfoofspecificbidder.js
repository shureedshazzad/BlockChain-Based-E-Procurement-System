import React, { useEffect, useState } from "react";
import useContract from "@/hooks/useContract";
import { useRouter } from "next/router";
import axios from "axios";
import CryptoJS from "crypto-js";
import init, * as ecies from "ecies-wasm";
import { ec as EC } from "elliptic"; // For ECIES encryption (Elliptic Curve)
import styles from "@/styles/BidInfoOfSpecificBidder.module.css";
import dotenv from "dotenv";

dotenv.config();

const BidInfoOfSpecificBidder = () => {
  const router = useRouter();
  const { address } = router.query; // Get the address from the query parameter
  const { contract } = useContract(process.env.NEXT_PUBLIC_DEPLOYED_ADDRESS);
  const [loading, setLoading] = useState(false);
  const [bidDocument, setBidDocument] = useState(""); // State to store the bid document


  // Fetch submitted bid details from the smart contract
  const fetchBidDetails = async () => {
    if (!contract || !address) return;
    try {
      setLoading(true);
      const [addresses, amounts, ipfsHashes, encryptedKeyHashes] = await contract.viewSubmittedBids();
      const index = addresses.indexOf(address);

      if (index !== -1) {
        const ipfsHash = ipfsHashes[index];
        const encryptedKeyHash = encryptedKeyHashes[index];

        // Fetch encrypted data and key from IPFS
        const dataResponse = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
        const encryptedData = dataResponse.data;
        const keyResponse = await axios.get(`https://gateway.pinata.cloud/ipfs/${encryptedKeyHash}`);
        const encryptedKey = keyResponse.data;

        // Decrypt the data
        const decryptedKey = await decryptSymmetricKey(encryptedKey);
        const decryptedBidDetails = await decryptData(encryptedData, decryptedKey);

        // Extract the bid document from the decrypted data


        if (decryptedBidDetails.bidDocument) {
          setBidDocument(decryptedBidDetails.bidDocument);
        }
      }
    } catch (error) {
      console.error("Error fetching bid details:", error);
    } finally {
      setLoading(false);
    }
  };

  // Decrypt the symmetric key using ECIES
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

  // Effect to fetch bid details when component mounts
  useEffect(() => {
    fetchBidDetails();
  }, [contract, address]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.heading}>Bid Document</h2>
        {loading ? (
          <p className={styles.loadingText}>Loading...</p>
        ) : bidDocument ? (
          <div className={styles.formGroup}>
            <textarea
              value={bidDocument}
              readOnly
              className={styles.textarea}
              placeholder="Bid document will be displayed here..."
            />
          </div>
        ) : (
          <p>No bid document found.</p>
        )}
      </div>
    </div>
  );
};

export default BidInfoOfSpecificBidder;