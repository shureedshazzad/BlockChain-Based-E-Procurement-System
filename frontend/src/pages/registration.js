import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { connectWallet, getProvider} from "@/utils/connectWallet";
import useContract2 from "@/hooks/useContract2"; // Import your custom hook
import styles from "@/styles/Registration.module.css";
import { Router, useRouter } from "next/router";

const RegistrationPage = () => {
  const { contract,currentNonce} = useContract2("0x5FbDB2315678afecb367f032d93F642f64180aa3"); 
  const [walletAddress, setWalletAddress] = useState("");
  const [networkName, setNetworkName] = useState("");

  const router = useRouter();

  const validationSchema = Yup.object({
    companyName: Yup.string()
      .required("Company name is required")
      .min(3, "Company name must be at least 3 characters long"),
    email: Yup.string().required("Email is required").email("Invalid email format"),
  });

  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);

      const provider = getProvider();
      const network = await provider.getNetwork();
      setNetworkName(network.name);
      toast.success("Wallet connected successfully!");

      

    } catch (error) {
      console.error("Error connecting wallet:", error.message);
      toast.error("Error connecting wallet: " + error.message);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (!contract) {
        toast.error("Contract is not available. Please connect your wallet.");
        return;
      }

        // Check if currentNonce is available
        if(currentNonce === undefined)
        {
          toast.error("Unable to retrieve the current nonce.");
          return;
        }
        // Use the currentNonce for the transaction
        const tx = await contract.submitRegistrationRequest(values.companyName, values.email,{
          nonce: currentNonce, // Include the nonce in the transaction options
        });
        await tx.wait();

      toast.success("Registration request submitted successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error submitting registration request:", error);
        if (error.data && error.data.message && error.data.message.includes("Registration request already submitted")) {
          toast.error("You have already submitted a registration request.");
        } else {
          toast.error("Failed to submit registration request.");
        }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${styles.container} flex items-center justify-center min-h-screen`}>
      <div className={`${styles.card} w-full max-w-lg shadow-lg rounded-lg`}>
        <h1 className={`${styles.title} text-3xl font-extrabold text-center mb-6`}>Bidder Registration</h1>

        <div className="text-center mb-6">
          <button
            onClick={handleConnectWallet}
            className={`${styles.button} mb-4`}
            style={{
              backgroundColor: walletAddress ? "green" : "orangered",
              color: "white",
            }}
          >
            {walletAddress ? "Wallet Connected" : "Connect Wallet"}
          </button>
          {walletAddress && <p><strong>Wallet Address:</strong> {walletAddress}</p>}
          {networkName && <p><strong>Connected Network:</strong> {networkName}</p>}
        </div>

        <Formik
          initialValues={{ companyName: "", email: "" }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className={`${styles.form} space-y-6`}>
              <div>
                <label htmlFor="companyName" className={`${styles.label} block font-semibold mb-2`}>
                  Company Name
                </label>
                <Field
                  type="text"
                  id="companyName"
                  name="companyName"
                  className={`${styles.input}`}
                  placeholder="Enter your company name"
                />
                <ErrorMessage name="companyName" component="div" className={`${styles.error}`} />
              </div>

              <div>
                <label htmlFor="email" className={`${styles.label} block font-semibold mb-2`}>
                  Email Address
                </label>
                <Field
                  type="email"
                  id="email"
                  name="email"
                  className={`${styles.input}`}
                  placeholder="Enter your email address"
                />
                <ErrorMessage name="email" component="div" className={`${styles.error}`} />
              </div>

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
      </div>
    </div>
  );
};

export default RegistrationPage;
