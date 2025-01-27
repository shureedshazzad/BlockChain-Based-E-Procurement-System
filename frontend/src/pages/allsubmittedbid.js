import React, { useEffect, useState } from "react";
import useContract from "@/hooks/useContract";
import styles from "@/styles/AllSubmittedBid.module.css";
import { useRouter } from "next/router"; // Import useRouter for navigation
import dotenv from "dotenv";

dotenv.config();


const AllSubmittedBids = () => {
  const { contract } = useContract(process.env.NEXT_PUBLIC_DEPLOYED_ADDRESS);
  const [bidderAddresses, setBidderAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter(); // Use router for navigation

  useEffect(() => {
    const fetchBidderAddresses = async () => {
      if (!contract) return;

      try {
        setLoading(true);
        const addresses = await contract.getBidderAddresses(); // Call the getBidderAddresses function
        setBidderAddresses(addresses);
      } catch (error) {
        console.error("Error fetching bidder addresses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBidderAddresses();
  }, [contract]);

  // Function to handle "View Details" button click
  const handleButtonClick = (address) => {
    // Navigate to the BidInfoOfSpecificBidder page with the address as a query parameter
    router.push(`/bidinfoofspecificbidder?address=${address}`);
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
                {/* Add buttons here */}
                <button 
                  className={styles.bidderButton}
                  onClick={() => handleButtonClick(address)} // Pass address to the handler
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
    </div>
  );
};

export default AllSubmittedBids;
