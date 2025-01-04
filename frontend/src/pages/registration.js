import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { connectWallet, getProvider } from "@/utils/connectWallet";
import useContract from "@/hooks/useContract"; // Custom hook to interact with the smart contract
import styles from "@/styles/Registration.module.css";
import { useRouter } from "next/router";

const RegistrationPage = () => {
  const { contract, currentNonce } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Fetch contract and current nonce using custom hook
  const [walletAddress, setWalletAddress] = useState(""); // Store the connected wallet address
  const [networkName, setNetworkName] = useState(""); // Store the connected network name
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track whether the user has already submitted the registration

  const router = useRouter();

  // Define validation schema for Formik (company name and email fields)
  const validationSchema = Yup.object({
    companyName: Yup.string()
      .required("Company name is required")
      .min(3, "Company name must be at least 3 characters long"),
    email: Yup.string().required("Email is required").email("Invalid email format"),
  });

  // Function to handle wallet connection and check if the user is registered
  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet(); // Connect the wallet and get the address
      setWalletAddress(address);

      const provider = getProvider(); // Get the Ethereum provider to fetch network info
      const network = await provider.getNetwork();
      setNetworkName(network.name);
      toast.success("Wallet connected successfully!");

      if (contract) {
        // Check if the user is already registered by calling the contract
        const isRegistered = await contract.pendingContractors(address);
        if (isRegistered.contractorAddress !== "0x0000000000000000000000000000000000000000") {
          setHasSubmitted(true); // If the user is registered, set hasSubmitted to true
        } else {
          setHasSubmitted(false); // If not, set hasSubmitted to false
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error.message);
      toast.error("Error connecting wallet: " + error.message);
    }
  };

  // Function to handle form submission and interact with the smart contract
  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (!contract) {
        toast.error("Contract is not available. Please connect your wallet.");
        return;
      }

      // Check if currentNonce is available before proceeding
      if (currentNonce === undefined) {
        toast.error("Unable to retrieve the current nonce.");
        return;
      }

      // Submit registration request to the smart contract
      const tx = await contract.submitRegistrationRequest(values.companyName, values.email, {
        nonce: currentNonce, // Pass the currentNonce in the transaction options
      });
      await tx.wait(); // Wait for the transaction to be mined

      toast.success("Registration request submitted successfully!");
      router.push("/"); // Redirect to the home page after successful submission
    } catch (error) {
      console.error("Error submitting registration request:", error);
      if (
        error.data &&
        error.data.message &&
        error.data.message.includes("Registration request already submitted")
      ) {
        toast.error("You have already submitted a registration request.");
      } else {
        toast.error("Failed to submit registration request.");
      }
    } finally {
      setSubmitting(false); // Set submitting to false once the submission is complete
    }
  };

  return (
    <div className={`${styles.container} flex items-center justify-center min-h-screen`}>
      <div className={`${styles.card} w-full max-w-lg shadow-lg rounded-lg`}>
        <h1 className={`${styles.title} text-3xl font-extrabold text-center mb-6`}>
          Bidder Registration
        </h1>

        <div className="text-center mb-6">
          <button
            onClick={handleConnectWallet}
            className={`${styles.button} mb-4`}
            style={{
              backgroundColor: walletAddress ? "green" : "orangered",
              color: "white",
            }}
          >
            {walletAddress ? "Wallet Connected" : "Connect Wallet"} {/* Button text depends on whether the wallet is connected */}
          </button>
          {walletAddress && <p><strong>Wallet Address:</strong> {walletAddress}</p>} {/* Display wallet address */}
          {networkName && <p><strong>Connected Network:</strong> {networkName}</p>} {/* Display network name */}
        </div>

        {hasSubmitted ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">
              You have already submitted a registration request.
            </p> {/* Inform the user if they have already submitted a request */}
          </div>
        ) : (
          <Formik
            initialValues={{ companyName: "", email: "" }} // Initial values for the form fields
            validationSchema={validationSchema} // Apply the validation schema
            onSubmit={handleSubmit} // Handle form submission
          >
            {({ isSubmitting }) => (
              <Form className={`${styles.form} space-y-6`}>
                {/* Company Name field */}
                <div>
                  <label
                    htmlFor="companyName"
                    className={`${styles.label} block font-semibold mb-2`}
                  >
                    Company Name
                  </label>
                  <Field
                    type="text"
                    id="companyName"
                    name="companyName"
                    className={`${styles.input}`}
                    placeholder="Enter your company name"
                  />
                  <ErrorMessage
                    name="companyName"
                    component="div"
                    className={`${styles.error}`}
                  />
                </div>

                {/* Email field */}
                <div>
                  <label
                    htmlFor="email"
                    className={`${styles.label} block font-semibold mb-2`}
                  >
                    Email Address
                  </label>
                  <Field
                    type="email"
                    id="email"
                    name="email"
                    className={`${styles.input}`}
                    placeholder="Enter your email address"
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className={`${styles.error}`}
                  />
                </div>

                {/* Submit button */}
                <div>
                  <button
                    type="submit"
                    className={`${styles.button}`}
                    disabled={isSubmitting || !walletAddress} 
                  >
                    {isSubmitting ? "Submitting..." : "Register"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </div>
  );
};

export default RegistrationPage;
