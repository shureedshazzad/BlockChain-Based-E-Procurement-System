import Link from "next/link";
import styles from "@/styles/Navbar.module.css";
import { useState, useEffect } from "react";
import useContract from "@/hooks/useContract";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false); // State to manage the menu toggle
  const [isOwner, setIsOwner] = useState(false); // State to check if the user is the owner
  const { contract } = useContract("0x5FbDB2315678afecb367f032d93F642f64180aa3"); // Custom hook to interact with the contract

  useEffect(() => {
    const checkOwner = async () => {
      if (contract && window.ethereum) {
        try {
          // Get the contract owner address
          const contractOwner = await contract.getContractOwner();
          
          // Get the connected account address
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          const connectedAccount = accounts[0];

          console.log(connectedAccount);

          // Compare contract owner with the connected account
          setIsOwner(contractOwner.toLowerCase() === connectedAccount.toLowerCase());
        } catch (err) {
          console.error("Error checking owner status:", err);
        }
      }
    };

    // Initial check
    checkOwner();

    // Listen for account change in Metamask
    window.ethereum.on('accountsChanged', checkOwner);

    // Cleanup listener on unmount
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', checkOwner);
      }
    };
  }, [contract]);

  // Toggle menu open/close
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className={styles.navbar}>
      {/* Logo section with a link to the homepage */}
      <div className={styles.logo}>
        <Link href="/">BidChain</Link>
      </div>

      {/* Hamburger menu toggle for mobile view */}
      <div className={styles.menuToggle} onClick={toggleMenu}>
        <div className={menuOpen ? styles.bar1 : ""}></div>
        <div className={menuOpen ? styles.bar2 : ""}></div>
        <div className={menuOpen ? styles.bar3 : ""}></div>
      </div>

      {/* Navigation links */}
      <ul className={`${styles.navLinks} ${menuOpen ? styles.show : ""}`}>
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <Link href="/tender">Tender Notice</Link>
        </li>
        {/* Show "Show All Requests" for owner, otherwise show "Register" */}
        {isOwner ? (
          <li>
            <Link href="/showregrequest">Show All Registration Requests</Link>
          </li>
        ) : (
          <li>
            <Link href="/registration">Register</Link>
          </li>
        )}
        <li>
          <Link href="/winner">Winner</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
