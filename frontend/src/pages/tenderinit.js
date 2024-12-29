import React, { useState } from "react";
import useContract from "@/hooks/useContract";
import { toast } from "react-toastify";
import { uploadToPinata } from "@/utils/pinata";
import styles from "@/styles/TenderInit.module.css";
import { useRouter } from "next/router";

const TenderInitialize = () => {
   const router = useRouter();
   const { contract, currentNonce } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3");

  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(0);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noticeDocumentHash, setNoticeDocumentHash] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract || !file) {
      toast.error("Please connect wallet and upload a file.");
      return;
    }

    try {
      setLoading(true);
      console.log("Uploading file to Pinata...");
      const hash = await uploadToPinata(file);
      console.log("File uploaded with hash:", hash);
      setNoticeDocumentHash(hash);

      console.log("Calling smart contract method...");
      const tx = await contract.openTender(description, hash, duration, {
        nonce: currentNonce,
      });
      await tx.wait();

      toast.success("Tender initialized successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error initializing tender:", error);
      toast.error("Error initializing tender");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Description:</label>
          <input
            type="text"
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Duration (in seconds):</label>
          <input
            type="number"
            className={styles.input}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Notice Document (PDF):</label>
          <input
            type="file"
            className={styles.inputFile}
            accept=".pdf"
            onChange={handleFileChange}
            required
          />
        </div>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Initializing..." : "Initialize Tender"}
        </button>
      </form>
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

export default TenderInitialize;
