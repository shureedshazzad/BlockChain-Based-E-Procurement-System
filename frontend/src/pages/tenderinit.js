import React, { useState } from "react";
import useContract from "@/hooks/useContract"; // Hook for interacting with the smart contract
import { toast } from "react-toastify"; // For notifications
import { uploadToPinata } from "@/utils/pinata"; // Utility for uploading to IPFS
import styles from "@/styles/TenderInit.module.css"; // CSS for styling
import { useRouter } from "next/router"; // For navigation

const TenderInitialize = () => {
  const router = useRouter(); // Router for navigation
  const { contract, currentNonce } = useContract(process.env.NEXT_PUBLIC_DEPLOYED_ADDRESS); // Contract and nonce
  const [description, setDescription] = useState(""); // Tender description
  const [duration, setDuration] = useState(0); // Tender duration in seconds
  const [loading, setLoading] = useState(false); // Loading state
  const [notice, setNotice] = useState(""); // Generated tender notice
  const [formData, setFormData] = useState({
    projectName: "",
    projectType: "",
    budget: "",
    location: "",
    requiredExperience: "",
    safetyStandards: "",
    materialQuality: "",
    workforceSize: "",
    completionDeadline: "",
    environmentalImpact: "",
  }); // Form data for tender requirements

  // Handle input changes for tender requirements
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Validate form fields
  const validateForm = () => {
    const {  budget, workforceSize, completionDeadline } = formData;
    

    if (budget <= 0) {
      toast.error("Budget must be greater than 0.");
      return false;
    }

    if (workforceSize <= 0) {
      toast.error("Workforce size must be greater than 0.");
      return false;
    }

    if (completionDeadline <= 0) {
      toast.error("Completion deadline must be greater than 0.");
      return false;
    }

    return true;
  };

  // Generate tender notice from form data
  const generateNotice = () => {
    if (!validateForm()) return;

    const noticeText = `
      Tender Notice for Construction Project

      Project Name: ${formData.projectName}
      Project Type: ${formData.projectType}
      Estimated Budget:Within ${formData.budget}
      Location: ${formData.location}
      Required Experience: At Least ${formData.requiredExperience} years
      Safety Standards: ${formData.safetyStandards}
      Material Quality: ${formData.materialQuality}
      Workforce Size: At Least ${formData.workforceSize} workers
      Completion Duration: Within ${formData.completionDeadline} days
      Environmental Impact: ${formData.environmentalImpact}

      Description: ${description}

      Note: Bidders are required to adhere to the specified safety standards, material quality, and environmental impact guidelines. The project must be completed within the stipulated deadline.
    `;
    setNotice(noticeText);
    toast.success("Tender notice generated successfully!");
  };

  // Handle tender confirmation
  const handleConfirmTender = async () => {
    if (!notice || !contract) {
      toast.error("Please generate the tender notice and connect wallet.");
      return;
    }

    try {
      setLoading(true);

      // Combine all data into a single JSON object
      const tenderData = {
        ...formData,
        description,
        noticeText: notice,
      };

      // Upload JSON object to IPFS
      const tenderDataFile = new File([JSON.stringify(tenderData)], "tenderData.json", { type: "application/json" });
      const noticeHash = await uploadToPinata(tenderDataFile);
      console.log("Tender data uploaded with hash:", noticeHash);

      // Call smart contract method
      console.log("Calling smart contract method...");
      const tx = await contract.openTender(description, noticeHash, duration, {
        nonce: currentNonce,
      });
      await tx.wait();

      toast.success("Tender confirmed successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error confirming tender:", error);
      toast.error("Error confirming tender.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Initialize New Construction Tender</h1>
      <form className={styles.form}>
        {/* Tender Description */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Tender Description:</label>
          <input
            type="text"
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Tender Duration */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Tender Duration (in seconds):</label>
          <input
            type="number"
            className={styles.input}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            required
          />
        </div>

        {/* Tender Requirements */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Project Name:</label>
          <input
            type="text"
            name="projectName"
            value={formData.projectName}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Project Type:</label>
          <input
            type="text"
            name="projectType"
            value={formData.projectType}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Budget ($):</label>
          <input
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Location:</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Required Experience (years):</label>
          <input
            type="number"
            name="requiredExperience"
            value={formData.requiredExperience}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Preferred Safety Standards:</label>
          <input
            type="text"
            name="safetyStandards"
            value={formData.safetyStandards}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Preferred Material Quality:</label>
          <input
            type="text"
            name="materialQuality"
            value={formData.materialQuality}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Workforce Size:</label>
          <input
            type="number"
            name="workforceSize"
            value={formData.workforceSize}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Completion Deadline (days):</label>
          <input
            type="number"
            name="completionDeadline"
            value={formData.completionDeadline}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Environmental Impact:</label>
          <input
            type="text"
            name="environmentalImpact"
            value={formData.environmentalImpact}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        {/* Buttons */}
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.button}
            onClick={generateNotice}
            disabled={loading}
          >
            Create Notice
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={handleConfirmTender}
            disabled={!notice || loading}
          >
            {loading ? "Confirming..." : "Confirm Tender"}
          </button>
        </div>

        {/* Generated Notice */}
        {notice && (
          <div className={styles.noticeContainer}>
            <h3 className={styles.noticeHeading}>Generated Tender Notice:</h3>
            <pre className={styles.noticeText}>{notice}</pre>
          </div>
        )}
      </form>
    </div>
  );
};

export default TenderInitialize;