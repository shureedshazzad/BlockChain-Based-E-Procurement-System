import React, { useState } from "react";
import useContract from "@/hooks/useContract"; // Import the custom hook for interacting with the smart contract
import { toast } from "react-toastify"; // Import toast for notifications
import { uploadToPinata } from "@/utils/pinata"; // Import Pinata upload utility to handle file uploads
import styles from "@/styles/TenderInit.module.css"; // Import component-specific styles
import { useRouter } from "next/router"; // Import Next.js router for navigation

const TenderInitialize = () => {
  const router = useRouter(); // Initialize router for page navigation after success
  const { contract, currentNonce } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Get the contract and current nonce for transaction management
  const [description, setDescription] = useState(""); // State for storing the tender description
  const [duration, setDuration] = useState(0); // State for storing the tender duration in seconds
  const [file, setFile] = useState(null); // State for storing the uploaded file
  const [loading, setLoading] = useState(false); // State to manage loading state during file upload and contract interaction
  const [noticeDocumentHash, setNoticeDocumentHash] = useState(""); // State for storing the uploaded file's IPFS hash

  // Handle file change (when a user selects a file)
  const handleFileChange = (e) => {
    setFile(e.target.files[0]); // Set the selected file
  };

  // Handle form submission (tender initialization)
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    if (!contract || !file) {
      toast.error("Please connect wallet and upload a file."); // Notify if contract or file is missing
      return;
    }

    try {
      setLoading(true); // Set loading state to true to indicate ongoing operations
      console.log("Uploading file to Pinata...");
      const hash = await uploadToPinata(file); // Upload the file to Pinata and get the IPFS hash
      console.log("File uploaded with hash:", hash);
      setNoticeDocumentHash(hash); // Store the hash in state

      console.log("Calling smart contract method...");
      // Call the smart contract method `openTender` with description, file hash, and duration
      const tx = await contract.openTender(description, hash, duration, {
        nonce: currentNonce, // Pass the current nonce to prevent replay attacks
      });
      await tx.wait(); // Wait for the transaction to be mined

      toast.success("Tender initialized successfully!"); // Notify user of success
      router.push("/"); // Redirect to the homepage or other relevant page
    } catch (error) {
      console.error("Error initializing tender:", error);
      toast.error("Error initializing tender"); // Notify user in case of error
    } finally {
      setLoading(false); // Reset loading state after completion (success or failure)
    }
  };

  return (
    <div className={styles.container}>
      {/* Form to initialize a new tender */}
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Tender description input field */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Description:</label>
          <input
            type="text"
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)} // Update description state on input change
            required
          />
        </div>

        {/* Tender duration input field */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Duration (in seconds):</label>
          <input
            type="number"
            className={styles.input}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))} // Update duration state on input change
            required
          />
        </div>

        {/* File upload field for the notice document */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Notice Document (PDF):</label>
          <input
            type="file"
            className={styles.inputFile}
            accept=".pdf" // Only accept PDF files
            onChange={handleFileChange} // Handle file change event
            required
          />
        </div>

        {/* Submit button for the form */}
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Initializing..." : "Initialize Tender"} {/* Button text changes based on loading state */}
        </button>
      </form>

      {/* Display the uploaded notice document hash (IPFS hash) after successful upload */}
      {noticeDocumentHash && (
        <div className={styles.result}>
          <p className={styles.noticeHash}>
            Notice Document Hash:{" "}
            <a
              href={`https://gateway.pinata.cloud/ipfs/${noticeDocumentHash}`} // Link to the uploaded file in Pinata
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {noticeDocumentHash} {/* Display the IPFS hash */}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default TenderInitialize;
