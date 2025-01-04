import React, { useState } from "react";
import useContract from "@/hooks/useContract"; // Custom hook for interacting with the contract
import { toast } from "react-toastify"; // For displaying notifications
import { uploadToPinata } from "@/utils/pinata"; // Utility to upload files to Pinata (IPFS)
import { useRouter } from "next/router"; // For routing to different pages
import styles from '@/styles/BidSubmission.module.css'; // CSS styles for the component


const SubmitBid = () => {
    // Destructure contract and currentNonce from the custom useContract hook
    const { contract, currentNonce } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3");
    const router = useRouter(); // Router for navigation after bid submission
    const [bid, setBid] = useState(0); // State for holding the bid amount
    const [file, setFile] = useState(null); // State for holding the selected file (PDF)
    const [loading, setLoading] = useState(false); // State to track loading state during file upload and contract submission
    const [noticeDocumentHash, setDocumentHash] = useState(""); // State to store the IPFS hash of the uploaded file


    // Handle file input change (when a user selects a file)
    const handleFileChange = (e) => {
        setFile(e.target.files[0]); // Set the selected file to state
    };

    // Handle form submission for submitting the bid
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission

        // Check if wallet is connected and a file is uploaded
        if (!contract || !file) {
            toast.error("Please connect wallet and upload a file."); // Show error if either is missing
            return;
        }

        try {
            setLoading(true); // Set loading to true during processing

            // Upload the file to Pinata (IPFS)
            console.log("Uploading file to Pinata...");
            const hash = await uploadToPinata(file); // Upload file to Pinata
            console.log("File uploaded with hash:", hash); // Log the file hash from IPFS
            setDocumentHash(hash); // Set the IPFS hash to the state for displaying

            // Call the smart contract to submit the bid
            console.log("Calling smart contract method...");
            const tx = await contract.submitBid(bid, hash, {
                nonce: currentNonce, // Pass currentNonce for preventing replay attacks
            });
            await tx.wait(); // Wait for the transaction to be mined

            toast.success("Bid Is Uploaded Successfully"); // Show success notification
            router.push("/"); // Redirect to the home page after successful bid submission
        } catch (error) {
            console.error("Error Submiting:", error); // Log any errors during the process
            toast.error("Error Submitting"); // Show error notification
        } finally {
            setLoading(false); // Set loading to false once the operation is complete
        }
    };

    return (
        <div className={styles.container}>
            {/* Form for submitting the bid */}
            <form className={styles.form} onSubmit={handleSubmit}>
                {/* Bid input field */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Bid:</label>
                    <input
                        type="number"
                        className={styles.input}
                        value={bid}
                        onChange={(e) => setBid(e.target.value)} // Update the bid state on change
                        required
                    />
                </div>

                {/* File input field for uploading the PDF */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Bid Document (PDF):</label>
                    <input
                        type="file"
                        className={styles.inputFile}
                        accept=".pdf" // Accept only PDF files
                        onChange={handleFileChange} // Update the file state on change
                        required
                    />
                </div>

                {/* Submit button, disabled when loading */}
                <button className={styles.button} type="submit" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Bid"} {/* Display loading text when submitting */}
                </button>
            </form>

            {/* Display the uploaded file hash if the document hash exists */}
            {noticeDocumentHash && (
                <div className={styles.result}>
                    <p className={styles.noticeHash}>
                        Notice Document Hash:{" "}
                        <a
                            href={`https://gateway.pinata.cloud/ipfs/${noticeDocumentHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.link}
                        >
                            {noticeDocumentHash}
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
};

export default SubmitBid;
