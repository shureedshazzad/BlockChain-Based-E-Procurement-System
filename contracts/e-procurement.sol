// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Main contract for decentralized tendering system
contract BidChain {
    // Structure to store contractor details
    struct Contractor {
        address contractorAddress; // Contractor's Ethereum address
        string companyName;        // Contractor's company name
        string email;              // Contractor's email address
        bool isRegistered;         // Registration status of contractor (whether registered or not)
    }

    // Structure to store tender details (only one tender active at a time in this contract)
    struct Tender {
        string description;        // Description of the tender
        string noticeDocumentHash; // IPFS hash of the tender notice document
        uint256 submissionEndTime; // Deadline for bid submissions
        bool isOpen;               // Indicates if the tender is open for [bids]
        address winner;            // Winner's address after evaluation
        int256 additionalInfo;     // Additional integer field
    }

    // Structure to store bid details
    struct Bid {
        uint256 amount;            // Bid amount offered by contractor
        string ipfsHash;           // IPFS hash for the encrypted bid document
        string encryptedKeyHash;   // IPFS hash for encrypted secret key
        bool submitted;            // Status to check if the bid is submitted
        bool isWinner;             // Status to indicate if the bid is the winning one
        bool isWithdrawn;          // Status to indicate if the bid is withdrawn
    }

    // Contract owner (usually the principal or tender initiator)
    address public owner;

    // Active tender instance (only one tender active at a time in this contract)
    Tender public activeTender;

    // Mapping to store registered contractors with their address
    mapping(address => Contractor) public contractors;

    // Mapping to store bid submitted by contractors
    mapping(address => Bid) public bids;

    // Mapping to store pending contractor registration requests
    mapping(address => Contractor) public pendingContractors;

    // Mapping to track if a contractor has submitted a bid
    mapping(address => bool) public hasSubmittedBid;

    // Array to store the list of addresses that have submitted registration requests
    address[] public addressList;

    // Array to store addresses of all bidders in the current tender
    address[] public bidderAddresses;

    // Array to store addresses of registered contractors
    address[] public registeredContractors;

    // Events
    event ContractorRegistered(address contractorAddress, string companyName, string email);
    event ContractorRegistrationRequested(address contractorAddress, string companyName, string email);
    event TenderOpened(string description, string noticeDocumentHash, uint256 endTime, int256 additionalInfo);
    event BidSubmitted(address indexed contractor, uint256 amount, string ipfsHash);
    event BidWithdrawn(address indexed contractor);
    event WinnerAnnounced(address indexed winner, uint256 winningBid, string winnerDocumentHash);
    event ContractorDeleted(address contractorAddress, string companyName, string email);

    // Modifier to restrict function access to contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized"); // Ensure caller is the owner
        _;
    }

    // Modifier to restrict function access to registered contractors only
    modifier onlyRegisteredContractor() {
        require(contractors[msg.sender].isRegistered, "Contractor not registered"); // Ensure caller is registered
        _;
    }

    // Modifier to ensure the tender is open for submissions
    modifier tenderOpen() {
        require(block.timestamp <= activeTender.submissionEndTime && activeTender.isOpen, "Tender closed"); // Check if tender is open
        _;
    }

    // Constructor to set the contract owner at deployment
    constructor() {
        owner = msg.sender; // Set owner to the account deploying the contract
    }

    // Function to retrieve the owner of the contract
    function getContractOwner() public view returns (address) {
        return owner; // Return the contract owner
    }

    // Submit a registration request (contractor only)
    function submitRegistrationRequest(string memory _companyName, string memory _email) external {
        require(
            pendingContractors[msg.sender].contractorAddress == address(0) && !isContractorRegistered(msg.sender),
            "Registration request already submitted or contractor already registered"
        );
        pendingContractors[msg.sender] = Contractor(msg.sender, _companyName, _email, false); // Store pending registration details
        addressList.push(msg.sender); // Add contractor address to the list
        emit ContractorRegistrationRequested(msg.sender, _companyName, _email); // Emit event that registration request has been submitted
    }

    // Admin can check pending contractors
    function getPendingContractors() external view returns (Contractor[] memory) {
        uint256 pendingCount = 0;

        // Count the number of pending contractors
        for (uint i = 0; i < addressList.length; i++) {
            if (pendingContractors[addressList[i]].contractorAddress != address(0)) {
                pendingCount++; // Increment if a pending request exists for that address
            }
        }

        // Create an array to hold all pending contractors
        Contractor[] memory pending = new Contractor[](pendingCount);
        uint256 index = 0;
        for (uint i = 0; i < addressList.length; i++) {
            if (pendingContractors[addressList[i]].contractorAddress != address(0)) {
                pending[index] = pendingContractors[addressList[i]]; // Add pending contractors to the array
                index++;
            }
        }

        return pending; // Return the array of pending contractors
    }

    // Admin can register a contractor
    function registerContractor(address _contractorAddress) external onlyOwner {
        // Ensure the contractor has a registration request pending
        require(pendingContractors[_contractorAddress].contractorAddress != address(0), "Contractor not found");
        // Get the contractor details from the pendingContractors mapping
        Contractor memory contractor = pendingContractors[_contractorAddress];
        // Mark the contractor as registered
        contractor.isRegistered = true;
        contractors[_contractorAddress] = contractor;
        registeredContractors.push(_contractorAddress); // Add to the list of registered contractors
        // Remove from the pendingContractors list
        delete pendingContractors[_contractorAddress]; // Remove from pending list after registration

        // Emit the ContractorRegistered event with the contractor's details
        emit ContractorRegistered(_contractorAddress, contractor.companyName, contractor.email);
    }

    // All can check all registered contractors
    function getRegisteredContractors() external view returns (Contractor[] memory) {
        uint256 registeredCount = registeredContractors.length;
        Contractor[] memory registered = new Contractor[](registeredCount);

        for (uint i = 0; i < registeredCount; i++) {
            registered[i] = contractors[registeredContractors[i]];
        }

        return registered; // Return the array of registered contractors
    }

    // Check if a contractor is registered or not
    function isContractorRegistered(address _contractorAddress) internal view returns (bool) {
        for (uint i = 0; i < registeredContractors.length; i++) {
            if (registeredContractors[i] == _contractorAddress) {
                return true;
            }
        }
        return false;
    }

    // Function to delete a registered contractor
    function deleteRegisteredContractor(address _contractorAddress) external onlyOwner {
        require(contractors[_contractorAddress].isRegistered, "Contractor not registered");

        // Retrieve contractor details for the event
        Contractor memory contractor = contractors[_contractorAddress];

        // Remove contractor from the mapping
        delete contractors[_contractorAddress];

        // Remove contractor from the registered contractors array
        for (uint i = 0; i < registeredContractors.length; i++) {
            if (registeredContractors[i] == _contractorAddress) {
                registeredContractors[i] = registeredContractors[registeredContractors.length - 1];
                registeredContractors.pop();
                break;
            }
        }

        emit ContractorDeleted(_contractorAddress, contractor.companyName, contractor.email);
    }

    // Function to open a new tender
    function openTender(string memory _description, string memory _noticeDocumentHash, uint256 _duration) external onlyOwner {
        require(!activeTender.isOpen, "Tender already open"); // Ensure no tender is currently open

        for (uint i = 0; i < bidderAddresses.length; i++) {
            address bidder = bidderAddresses[i];
            hasSubmittedBid[bidder] = false; // Reset bid submission flag
            delete bids[bidder]; // Clear the bidder's entry in the bids mapping
        }
        // Reset the list of bidder addresses
        delete bidderAddresses;

        // Set up new tender details
        activeTender = Tender({
            description: _description,
            noticeDocumentHash: _noticeDocumentHash,
            submissionEndTime: block.timestamp + _duration, // Set end time based on duration
            isOpen: true,
            winner: address(0), // No winner yet
            additionalInfo: 0 // Default value for the new integer field
        });

        emit TenderOpened(_description, _noticeDocumentHash, activeTender.submissionEndTime, activeTender.additionalInfo); // Emit tender opened event
    }

    // Function to close the tender if the submission period has ended
    function closeExpiredTender() external onlyOwner {
        require(activeTender.isOpen, "No active tender");
        activeTender.additionalInfo = 1;
        emit TenderOpened(activeTender.description, activeTender.noticeDocumentHash, activeTender.submissionEndTime, activeTender.additionalInfo); // Optional: Update if you track state changes
    }


   // Function to get the IPFS hash of the tender notice document
   function getNoticeDocumentHash() external view returns (string memory) {
       require(activeTender.isOpen, "No active tender is open"); // Ensure the tender is active
       require(activeTender.additionalInfo == 1, "Tender is not closed yet"); // Ensure tender evaluation is done
       require(bytes(activeTender.noticeDocumentHash).length > 0, "No valid notice document available"); // Ensure the hash exists
       return activeTender.noticeDocumentHash;
   }
    

    // Function to cancel the tender
    function cancelTender() external onlyOwner {
        require(activeTender.isOpen, "No active tender");
        delete activeTender;

        for (uint i = 0; i < bidderAddresses.length; i++) {
            address bidder = bidderAddresses[i];
            hasSubmittedBid[bidder] = false; // Reset bid submission flag
            delete bids[bidder]; // Clear the bidder's entry in the bids mapping
        }
        // Reset the list of bidder addresses
        delete bidderAddresses;
    }

    // Function for registered contractors to submit their bid
    function submitBid(uint256 _amount, string memory _ipfsHash, string memory _encryptedKeyHash) external onlyRegisteredContractor tenderOpen {
        require(!hasSubmittedBid[msg.sender], "Bid already submitted"); // Use hasSubmittedBid for validation

        // Store the bid details in the mapping
        bids[msg.sender] = Bid({
            amount: _amount,
            ipfsHash: _ipfsHash,
            encryptedKeyHash: _encryptedKeyHash,
            submitted: true,
            isWinner: false,
            isWithdrawn: false
        });

        // Mark the contractor as having submitted a bid
        hasSubmittedBid[msg.sender] = true;

        bidderAddresses.push(msg.sender); // Add contractor to list of bidders

        emit BidSubmitted(msg.sender, _amount, _ipfsHash); // Emit bid submitted event
    }

    // Function for registered contractors to withdraw their bid
    function withdrawBid() external onlyRegisteredContractor tenderOpen {
        require(bids[msg.sender].submitted, "No bid submitted"); // Ensure the contractor has submitted a bid
        require(!bids[msg.sender].isWithdrawn, "Bid already withdrawn"); // Ensure the bid is not already withdrawn

        // Mark the bid as withdrawn
        bids[msg.sender].isWithdrawn = true;
        hasSubmittedBid[msg.sender] = false;

           // Remove the bidder's address from the bidderAddresses array
        for (uint256 i = 0; i < bidderAddresses.length; i++) {
            if (bidderAddresses[i] == msg.sender) {
            // Swap the bidder's address with the last element in the array
            bidderAddresses[i] = bidderAddresses[bidderAddresses.length - 1];
            // Remove the last element
            bidderAddresses.pop();
            break;
        }
      }

        emit BidWithdrawn(msg.sender); // Emit bid withdrawn event
    }


       // Function for a bidder to view their own bid information
    function viewMyBid() external view onlyRegisteredContractor returns (Bid memory) {
        require(bids[msg.sender].submitted, "No bid submitted"); // Ensure the contractor has submitted a bid
        return bids[msg.sender]; // Return the bid details of the caller
    }




    // Announce the winner
    function announceWinner(address _winner) external onlyOwner {
        require(block.timestamp > activeTender.submissionEndTime, "Tender submission still open"); // Ensure submission period has ended
        require(activeTender.isOpen, "No active tender"); // Ensure there is an active tender

        bids[_winner].isWinner = true; // Mark the winning bid
        activeTender.isOpen = false; // Close the tender
        activeTender.winner = _winner; // Set the winner's address

        emit WinnerAnnounced(_winner, bids[_winner].amount, bids[_winner].ipfsHash); // Emit event with the winner details
    }

    // View function to get details of the winner's bid
    function getWinnerDetails() external view returns (address, uint256, string memory) {
        return (activeTender.winner, bids[activeTender.winner].amount, bids[activeTender.winner].ipfsHash); // Return winner's address, bid amount, and IPFS hash
    }

    // Utility function to retrieve all bidder addresses in the current tender
    function getBidderAddresses() external view returns (address[] memory) {
        return bidderAddresses; // Return the array of bidder addresses
    }

    // Check if the tender is open
    function isTenderOpen() external view returns (bool) {
        return activeTender.isOpen;
    }

    // View function to allow registered contractors or the owner to see all details of the active tender
    function viewActiveTenderDetails() external view returns (
        string memory description,
        string memory noticeDocumentHash,
        uint256 submissionEndTime,
        int256 additionalInfo,
        bool isOpen
    ) {
        require(activeTender.isOpen, "No active tender"); // Ensure there is an active tender
        require(contractors[msg.sender].isRegistered || msg.sender == owner, "Not authorized"); // Ensure the caller is either a registered contractor or the owner

        return (
            activeTender.description,
            activeTender.noticeDocumentHash,
            activeTender.submissionEndTime,
            activeTender.additionalInfo,
            activeTender.isOpen
        );
    }

    // View function to get the bid submission status of a specific contractor
    function hasContractorSubmittedBid(address _contractor) external view returns (bool) {
        return hasSubmittedBid[_contractor]; // Return the bid submission status (true/false)
    }

    // View all submitted bid details
    function viewSubmittedBids() public view onlyOwner returns (address[] memory, uint256[] memory, string[] memory, string[] memory) {
        require(activeTender.isOpen, "No active tender");
        require(activeTender.additionalInfo == 1, "Tender is not closed yet");

        uint256 count = bidderAddresses.length;
        address[] memory addresses = new address[](count);
        uint256[] memory amounts = new uint256[](count);
        string[] memory ipfsHashes = new string[](count);
        string[] memory encryptedKeyHashes = new string[](count);

        for (uint256 i = 0; i < count; i++) {
            address bidder = bidderAddresses[i];
            addresses[i] = bidder;
            amounts[i] = bids[bidder].amount;
            ipfsHashes[i] = bids[bidder].ipfsHash;
            encryptedKeyHashes[i] = bids[bidder].encryptedKeyHash;
        }

        return (addresses, amounts, ipfsHashes, encryptedKeyHashes);
    }
}