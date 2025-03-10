import React, { useState } from "react";
import useContract from "@/hooks/useContract"; // Hook to interact with the Ethereum contract
import { toast } from "react-toastify"; // Toast notifications for feedback
import { uploadToPinata } from "@/utils/pinata"; // Utility for uploading to IPFS (Pinata)
import { useRouter } from "next/router"; // Next.js router for navigation
import CryptoJS from "crypto-js"; // CryptoJS library for AES encryption
import { ec as EC } from "elliptic"; // For ECIES encryption (Elliptic Curve)
import styles from "@/styles/BidSubmission.module.css"; // CSS for styling the component
import init, * as ecies from "ecies-wasm"; // ECIES encryption using WebAssembly
import dotenv from "dotenv";
import 'fast-text-encoding';

dotenv.config();

const SubmitBid = () => {
    // Ethereum contract and current nonce (via useContract hook)
    const { contract, currentNonce } = useContract(process.env.NEXT_PUBLIC_DEPLOYED_ADDRESS);
    const router = useRouter(); // Router for navigation
    const [bidDetails, setBidDetails] = useState({
        companyName: "", // Bidder's company name
        projectName: "", // Project name from tender
        projectType: "", // Project type from tender
        projectStartTime: "", // Project start time from tender
        projectEndTime: "", // Project end time from tender
        budget: "", // Bidder's proposed budget
        location: "", // Project location from tender
        requiredExperience: "", // Bidder's experience
        safetyStandards: "", // Bidder's safety standards
        materialQuality: "", // Bidder's material quality
        workforceSize: "", // Bidder's workforce size
        completionDeadline: "", // Bidder's proposed completion deadline
        environmentalImpact: "", // Bidder's environmental impact plan
        description: "", // Bidder's project description
    }); // Form data
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

    // Generate bid document based on input fields
    const generateBidDocument = () => {
        const currentDate = new Date().toLocaleDateString(); // Get current date
        const bidText = `
            Bid Application for Construction Project

            Date: ${currentDate}  

            Subject: Bid Submission for ${bidDetails.projectName}  

            ---

            Dear Sir/Madam,

            We, ${bidDetails.companyName}**, are pleased to submit our bid for the ${bidDetails.projectName} project. Below are the details of our proposal:

            ---

            ### Project Details

            - Project Name: ${bidDetails.projectName}  
            - Project Type: ${bidDetails.projectType}  
            - Project Start Time: ${bidDetails.projectStartTime}  
            - Project End Time: ${bidDetails.projectEndTime}  
            - Proposed Budget: $${bidDetails.budget}  
            - Location: ${bidDetails.location}  

            ---

            ### Bidder's Qualifications

            - Company Name: ${bidDetails.companyName}  
            - Required Experience: ${bidDetails.requiredExperience} years  
            - Safety Standards: ${bidDetails.safetyStandards}  
            - Material Quality: ${bidDetails.materialQuality}  
            - Workforce Size: ${bidDetails.workforceSize} workers  
            - Proposed Completion Deadline: ${bidDetails.completionDeadline} days  
            - Environmental Impact Plan: ${bidDetails.environmentalImpact}  

            ---

            ### Project Description

            ${bidDetails.description}  

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

    // Function to encrypt the AES symmetric key using ECIES (Elliptic Curve Integrated Encryption Scheme)
    const encryptSymmetricKey = async (key) => {
        // Derive private key from password (hashed using SHA256)
        const password = process.env.NEXT_PUBLIC_ELIPTIC_CRYPTOGRAPHY_PASSWORD; // Example password (should be securely stored in real use)
        const hashedPassword = CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex); // SHA256 hash of password
        const ec = new EC("secp256k1"); // Initialize elliptic curve (secp256k1 used in Ethereum)
        let keyPair = ec.keyFromPrivate(hashedPassword); // Generate key pair from the private key derived from password

        // Get the compressed public key (only the X coordinate and a sign byte)
        const uncompressedPublicKeyHex = keyPair.getPublic().encode("hex");
        const x = uncompressedPublicKeyHex.slice(2, 66); // X coordinate (from public key)

        const yIsEven = parseInt(uncompressedPublicKeyHex.slice(-2), 16) % 2 === 0; // Determine the sign byte for Y coordinate
        const signByte = yIsEven ? "02" : "03"; // Decide sign byte based on Y coordinate parity
        const compressedPublicKeyHex = signByte + x; // Full compressed public key
        
        // Initialize the WASM module 
        await init();
        const publicKeyBytes = fromHexString(compressedPublicKeyHex); // Convert public key to bytes
        const aesKeyBytes = new TextEncoder().encode(key); // Convert AES key to bytes
        const encryptedBytes = ecies.encrypt(publicKeyBytes, aesKeyBytes); // Encrypt the AES key using ECIES
        return toHexString(encryptedBytes); // Return the encrypted AES key as a hex string
    };

    // Helper function to convert hex string to Uint8Array (for use with ECIES)
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

    const getInputType = (field) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1); // Set future date for "projectStartTime" and "projectEndTime"
        const futureDateString = futureDate.toISOString().slice(0, 16); // Format in YYYY-MM-DDTHH:MM

        switch (field) {
            case "projectStartTime":
            case "projectEndTime":
                return {
                    type: "date",
                    min: futureDateString, // Allow only future dates
                };
            case "budget":
            case "requiredExperience":
            case "workforceSize":
            case "completionDeadline":
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