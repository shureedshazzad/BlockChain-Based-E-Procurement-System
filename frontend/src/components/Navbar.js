import Link from "next/link";
import styles from "@/styles/Navbar.module.css";
import { useState, useEffect } from "react";
import useContract from "@/hooks/useContract";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false); // State to manage the menu toggle
  const [isOwner, setIsOwner] = useState(false); // State to check if the user is the owner
  const [isRegisteredContractor, setIsRegisteredContractor] = useState(false); // State to check if the user is a registered contractor
  const [isPendingContractor, setIsPendingContractor] = useState(false); // State to check if the user is a pending contractor
  const [dropdownOpen, setDropdownOpen] = useState(false); // State for dropdown menu
  const { contract } = useContract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  ); // Custom hook to interact with the contract
  const [isTenderOpen, setIsTenderOpen] = useState(false); // Track if a tender is already active

  useEffect(() => {
    const checkAccountStatus = async () => {
      if (contract && window.ethereum) {
        try {
          // Get the contract owner address
          const contractOwner = await contract.getContractOwner();

          const tenderOpenStatus = await contract.isTenderOpen();
          setIsTenderOpen(tenderOpenStatus);

          // Get the connected account address
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          const connectedAccount = accounts[0];

          // Check if the connected account is the owner
          setIsOwner(
            contractOwner.toLowerCase() === connectedAccount.toLowerCase()
          );

          // Get registered contractors
          const registeredContractors =
            await contract.getRegisteredContractors();
          const contractorAddresses = registeredContractors
            .map((c) => c.contractorAddress?.toLowerCase())
            .filter((address) => address !== undefined);

          // Check if the connected account is a registered contractor
          setIsRegisteredContractor(
            contractorAddresses.includes(connectedAccount.toLowerCase())
          );

          // Get pending contractors
          const pendingContractors = await contract.getPendingContractors();
          const pendingAddresses = pendingContractors
            .map((c) => c.contractorAddress?.toLowerCase())
            .filter((address) => address !== undefined);

          // Check if the connected account is a pending contractor
          setIsPendingContractor(
            pendingAddresses.includes(connectedAccount.toLowerCase())
          );
        } catch (err) {
          console.error("Error checking account status:", err);
        }
      }
    };

    // Initial check
    checkAccountStatus();

    // Listen for account change in Metamask
    window.ethereum.on("accountsChanged", checkAccountStatus);

    // Cleanup listener on unmount
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener(
          "accountsChanged",
          checkAccountStatus
        );
      }
    };
  }, [contract]);

  // Toggle menu open/close
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
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

        {/* Render Tender Notice link only if the user is the owner or a registered contractor */}
        {(isOwner || isRegisteredContractor) && (
          <li>
            <Link href="/tendernotice">Tender Notice</Link>
          </li>
        )}

        {isOwner ? (
          <li
            className={styles.dropdown} // Dropdown container
            onMouseEnter={toggleDropdown}
            onMouseLeave={toggleDropdown}
          >
            <span className={styles.dropdownToggle}>Owner Actions</span>
            {dropdownOpen && (
              <ul className={styles.dropdownMenu}>
                <li>
                  <Link href="/showregrequest">Show All Pending Requests</Link>
                </li>
                <li>
                  <Link href="/showregcontrators">
                    Show All Registered Contractors
                  </Link>
                </li>
                {!isTenderOpen && (
                  <li>
                    <Link href="/tenderinit">Initiate A Tender</Link>
                  </li>
                )}
              </ul>
            )}
          </li>
        ) : (
          !isPendingContractor && !isRegisteredContractor && (
            <li>
              <Link href="/registration">Register</Link>
            </li>
          )
        )}
        <li>
          <Link href="/winner">Winner</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
