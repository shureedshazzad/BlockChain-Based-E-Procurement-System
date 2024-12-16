// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// Main contract for decentralized tendering system

//hello shureed
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
        bool isOpen;               // Indicates if the tender is open for bids
        address winner;            // Winner's address after evaluation
    }

    // Structure to store bid details
    struct Bid {
        uint256 amount;     // Bid amount offered by contractor
        string ipfsHash;    // IPFS hash for the encrypted bid document
        bool submitted;     // Status to check if the bid is submitted
        bool isWinner;      // Status to indicate if the bid is the winning one
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

    // Array to store the list of addresses that have submitted registration requests
    address[] public addressList;

    // Array to store addresses of all bidders in the current tender
    address[] public bidderAddresses;

    // Events
    event ContractorRegistered(address contractorAddress, string companyName, string email);
    event ContractorRegistrationRequested(address contractorAddress, string companyName, string email);
    event TenderOpened(string description, string noticeDocumentHash, uint256 endTime);
    event BidSubmitted(address indexed contractor, uint256 amount, string ipfsHash);
    event WinnerAnnounced(address indexed winner, uint256 winningBid, string winnerDocumentHash);

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
        require(pendingContractors[msg.sender].contractorAddress == address(0), "Registration request already submitted"); // Check if the contractor already submitted a request
        pendingContractors[msg.sender] = Contractor(msg.sender, _companyName, _email, false); // Store pending registration details
        addressList.push(msg.sender); // Add contractor address to the list
        emit ContractorRegistrationRequested(msg.sender, _companyName, _email); // Emit event that registration request has been submitted
    }

    // Admin can check pending contractors
    function getPendingContractors() external view onlyOwner returns (Contractor[] memory) {
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
        contractors[_contractorAddress] = contractor;
        // Remove from the pendingContractors list
        delete pendingContractors[_contractorAddress]; // Remove from pending list after registration

        // Emit the ContractorRegistered event with the contractor's details
        emit ContractorRegistered(_contractorAddress, contractor.companyName, contractor.email);
    }

    // Function to open a new tender, accessible by owner only
    function openTender(string memory _description, string memory _noticeDocumentHash, uint256 _duration) external onlyOwner {
        require(!activeTender.isOpen, "Tender already open"); // Ensure no tender is currently open
        // Set up new tender details
        activeTender = Tender({
            description: _description,
            noticeDocumentHash: _noticeDocumentHash,
            submissionEndTime: block.timestamp + _duration, // Set end time based on duration
            isOpen: true,
            winner: address(0) // No winner yet
        });

        emit TenderOpened(_description, _noticeDocumentHash, activeTender.submissionEndTime); // Emit tender opened event
    }

    // Function for registered contractors to submit their bid
    function submitBid(uint256 _amount, string memory _ipfsHash) external onlyRegisteredContractor tenderOpen {
        require(!bids[msg.sender].submitted, "Bid already submitted"); // Check if bid is already submitted

        // Store the bid details in the mapping
        bids[msg.sender] = Bid({
            amount: _amount,
            ipfsHash: _ipfsHash,
            submitted: true,
            isWinner: false
        });

        bidderAddresses.push(msg.sender); // Add contractor to list of bidders

        emit BidSubmitted(msg.sender, _amount, _ipfsHash); // Emit bid submitted event
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

    // View function to get the IPFS hash of a specific contractor's bid
    function getBidIPFSHash(address _contractor) external view returns (string memory) {
        require(bids[_contractor].submitted, "Bid not submitted"); // Ensure bid was submitted
        return bids[_contractor].ipfsHash; // Return IPFS hash of the bid document
    }

    // Utility function to retrieve all bidder addresses in the current tender
    function getBidderAddresses() external view returns (address[] memory) {
        return bidderAddresses; // Return the array of bidder addresses
    }


    // View function to allow registered contractors to see the notice document hash of the active tender
    function viewNoticeDocumentHash() external view onlyRegisteredContractor returns (string memory) {
        require(activeTender.isOpen, "No active tender"); // Ensure there is an active tender
        return activeTender.noticeDocumentHash; // Return the IPFS hash of the notice document
    }
}