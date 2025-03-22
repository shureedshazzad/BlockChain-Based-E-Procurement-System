import React, { useState, useEffect } from "react";
import useContract from "@/hooks/useContract"; // Hook to interact with the Ethereum contract
import { toast } from "react-toastify"; // Toast notifications for feedback
import { uploadToPinata } from "@/utils/pinata"; // Utility for uploading to IPFS (Pinata)
import { useRouter } from "next/router"; // Next.js router for navigation
import CryptoJS from "crypto-js"; // CryptoJS library for AES encryption
import { ec as EC } from "elliptic"; // For ECIES encryption (Elliptic Curve)
import styles from "@/styles/BidSubmission.module.css"; // CSS for styling the component
import init, * as ecies from "ecies-wasm"; // ECIES encryption using WebAssembly
import dotenv from "dotenv";
import "fast-text-encoding";

dotenv.config();

const SubmitBid = () => {
  // Ethereum contract and current nonce (via useContract hook)
  const { contract, currentNonce } = useContract(process.env.NEXT_PUBLIC_DEPLOYED_ADDRESS);
  const [activeTender, setActiveTender] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [location, setLocation] = useState("");
  const router = useRouter(); // Router for navigation

  // Fetch tender details on component mount
  useEffect(() => {
    const fetchTenderDetails = async () => {
      if (!contract) return;
      try {
        // Fetch the active tender details
        const tenderDetails = await contract.viewActiveTenderDetails();
        const tender = {
          description: tenderDetails[0],
          noticeDocumentHash: tenderDetails[1],
          submissionEndTime: tenderDetails[2],
          additionalInfo: tenderDetails[3],
          isOpen: tenderDetails[4],
        };
        setActiveTender(tender);

        // Fetch the notice text from IPFS
        if (tender.noticeDocumentHash) {
          const response = await fetch(`https://gateway.pinata.cloud/ipfs/${tender.noticeDocumentHash}`);
          const tenderData = await response.json();
          setProjectName(tenderData.projectName);
          setProjectDescription(tenderData.description);
          setLocation(tenderData.location);
        }
      } catch (error) {
        console.error("Error fetching tender details:", error);
        setActiveTender(null);
      }
    };
    fetchTenderDetails();
  }, [contract]);

  // Bid details state
  const [bidDetails, setBidDetails] = useState({
    companyName: "", // Bidder's company name
    projectStartTime: "", // Project start time from tender
    projectEndTime: "", // Project end time from tender
    budget: "", // Bidder's proposed budget
    requiredExperience: "", // Bidder's experience
    safetyStandards: "", // Bidder's safety standards
    materialQuality: "", // Bidder's material quality
    workforceSize: "", // Bidder's workforce size
    environmentalImpact: "", // Bidder's environmental impact plan
  });

  const [bidDocument, setBidDocument] = useState(""); // Bid document text
  const [loading, setLoading] = useState(false); // Loading state
  const [encryptedDataHash, setEncryptedDataHash] = useState(""); // Encrypted data IPFS hash
  const [encryptedKeyHash, setEncryptedKeyHash] = useState(""); // Encrypted symmetric key IPFS hash
  const [isBidConfirmed, setIsBidConfirmed] = useState(false); // State to track if bid is confirmed

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBidDetails({ ...bidDetails, [name]: value });
  };

  // Validate project start and end times
  const validateDates = () => {
    const { projectStartTime, projectEndTime } = bidDetails;
    const currentTime = new Date().toISOString().slice(0, 16); // Current time in YYYY-MM-DDTHH:MM format

    if (projectStartTime < currentTime) {
      toast.error("Project start time must be in the future.");
      return false;
    }

    if (projectEndTime <= projectStartTime) {
      toast.error("Project end time must be after the start time.");
      return false;
    }

    return true;
  };

  // Generate bid document based on input fields
  const generateBidDocument = () => {
    if (!validateDates()) return;

    const currentDate = new Date().toLocaleDateString(); // Get current date
    const bidText = `
      Bid Application for Construction Project

      Date: ${currentDate}  

      Subject: Bid Submission for ${projectName}  

      ---

      Dear Sir/Madam,

      We, ${bidDetails.companyName}, are pleased to submit our bid for the ${projectName} project. Below are the details of our proposal:

      ---

      ### Project Details
  
      - Project Start Time: ${bidDetails.projectStartTime}  
      - Project End Time: ${bidDetails.projectEndTime}  
      - Proposed Budget: $${bidDetails.budget}  
      - Location: ${location}  

      ---

      ### Bidder's Qualifications

      - Company Name: ${bidDetails.companyName}  
      - Required Experience: ${bidDetails.requiredExperience} years  
      - Safety Standards: ${bidDetails.safetyStandards}  
      - Material Quality: ${bidDetails.materialQuality}  
      - Workforce Size: ${bidDetails.workforceSize} workers   
      - Environmental Impact Plan: ${bidDetails.environmentalImpact}  

      ---

      ### Commitment

      We, ${bidDetails.companyName}, hereby commit to adhering to the specified safety standards, material quality, and environmental impact guidelines. We assure you that the project will be completed within the stipulated deadline and budget.

      ---

      Thank you for considering our bid. We look forward to the opportunity to work with you.

      Sincerely,  
      [Bidder's Name]  
      [Bidder's Designation]  
      [Bidder's Contact Information]  
    `;
    setBidDocument(bidText);
    setIsBidConfirmed(true); // Mark bid as confirmed
    toast.success("Bid document generated successfully!");
  };

  // Generate a 256-bit AES symmetric key
  const generateSymmetricKey = () => {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  };

  // Encrypt the AES symmetric key using ECIES
  const encryptSymmetricKey = async (key) => {
    const password = process.env.NEXT_PUBLIC_ELIPTIC_CRYPTOGRAPHY_PASSWORD;
    const hashedPassword = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    const ec = new EC("secp256k1");
    let keyPair = ec.keyFromPrivate(hashedPassword);
    const uncompressedPublicKeyHex = keyPair.getPublic().encode("hex");
    const x = uncompressedPublicKeyHex.slice(2, 66);
    const yIsEven = parseInt(uncompressedPublicKeyHex.slice(-2), 16) % 2 === 0;
    const signByte = yIsEven ? "02" : "03";
    const compressedPublicKeyHex = signByte + x;

    await init();
    const publicKeyBytes = fromHexString(compressedPublicKeyHex);
    const aesKeyBytes = new TextEncoder().encode(key);
    const encryptedBytes = ecies.encrypt(publicKeyBytes, aesKeyBytes);
    return toHexString(encryptedBytes);
  };

  // Helper function to convert hex string to Uint8Array
  const fromHexString = (hexString) =>
    new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

  // Helper function to convert Uint8Array back to a hex string
  const toHexString = (bytes) =>
    Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");

  // Encrypt data using AES-256
  const encryptData = async (data, aesKey) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), aesKey).toString();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract) {
      toast.error("Please connect wallet.");
      return;
    }

    if (!isBidConfirmed) {
      toast.error("Please confirm the bid before submitting.");
      return;
    }

    try {
      setLoading(true);

      // Combine form data and bid document into a single object
      const bidData = {
        ...bidDetails,
        bidDocument,
      };

      const aesKey = generateSymmetricKey(); // Step 1: Generate AES key
      const encryptedData = await encryptData(bidData, aesKey); // Step 2: Encrypt bid data

      const encryptedKey = await encryptSymmetricKey(aesKey); // Step 3: Encrypt AES key
      console.log(encryptedKey);

      // Step 4: Upload encrypted data to IPFS
      const dataFile = new File([encryptedData], "encryptedBidData.json", { type: "application/json" });
      const dataHash = await uploadToPinata(dataFile);
      setEncryptedDataHash(dataHash);

      console.log("Uploading encrypted key to Pinata...");
      const keyFile = new File([encryptedKey], "encryptedKey.json", {
        type: "application/json",
      });
      const keyHash = await uploadToPinata(keyFile); // Step 5: Upload encrypted AES key
      setEncryptedKeyHash(keyHash);

      console.log("Calling smart contract method...");
      const tx = await contract.submitBid(bidDetails.budget, dataHash, keyHash, { nonce: currentNonce });
      await tx.wait();

      toast.success("Bid submitted successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Error submitting bid.");
    } finally {
      setLoading(false);
    }
  };

  // Get input type and validation rules for each field
  const getInputType = (field) => {
    const currentTime = new Date().toISOString().slice(0, 16); // Current time in YYYY-MM-DDTHH:MM format
    const minEndTime = bidDetails.projectStartTime || currentTime; // Minimum end time is start time or current time

    switch (field) {
      case "projectStartTime":
        return {
          type: "datetime-local",
          min: currentTime, // Allow only future dates
        };
      case "projectEndTime":
        return {
          type: "datetime-local",
          min: minEndTime, // Allow only dates after start time
        };
      case "budget":
      case "requiredExperience":
      case "workforceSize":
        return { type: "number" }; // Numeric fields
      default:
        return { type: "text" }; // Default to text for other fields
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.heading}>Submit Your Bid</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Display project name and description */}
          <div className={styles.formGroup}>
            <label>Project Name:</label>
            <input type="text" value={projectName} readOnly />
          </div>
          <div className={styles.formGroup}>
            <label>Project Description:</label>
            <textarea value={projectDescription} readOnly className={styles.textarea} />
          </div>

          <div className={styles.formGroup}>
            <label>Location:</label>
            <input type="text" value={location} readOnly />
          </div>

          {/* Render input fields for bid details */}
          {Object.keys(bidDetails).map((field) => {
            const inputType = getInputType(field);
            return (
              <div key={field} className={styles.formGroup}>
                <label>
                  {field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:
                </label>
                <input
                  type={inputType.type}
                  name={field}
                  value={bidDetails[field]}
                  onChange={handleInputChange}
                  required
                  min={inputType.min} // Apply min value for date fields
                />
              </div>
            );
          })}

          {/* Bid document textarea */}
          <div className={styles.formGroup}>
            <label>Bid Document:</label>
            <textarea
              name="bidDocument"
              value={bidDocument}
              readOnly
              className={styles.textarea}
              placeholder="Bid document will be generated here..."
            />
          </div>

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={generateBidDocument}
              disabled={loading}
            >
              Confirm Bid
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!isBidConfirmed || loading}
            >
              {loading ? "Submitting..." : "Submit Bid"}
            </button>
          </div>
        </form>

        {/* Display encrypted data and key hashes */}
        {encryptedDataHash && (
          <div className={styles.transactionLink}>
            <p>
              Encrypted Data Hash:{" "}
              <a href={`https://gateway.pinata.cloud/ipfs/${encryptedDataHash}`} target="_blank" rel="noopener noreferrer">
                {encryptedDataHash}
              </a>
            </p>
          </div>
        )}
        {encryptedKeyHash && (
          <div className={styles.transactionLink}>
            <p>
              Encrypted Key Hash:{" "}
              <a href={`https://gateway.pinata.cloud/ipfs/${encryptedKeyHash}`} target="_blank" rel="noopener noreferrer">
                {encryptedKeyHash}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitBid;