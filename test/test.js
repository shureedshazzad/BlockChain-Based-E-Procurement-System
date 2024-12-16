const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("BidChain", function () {
  let bidChain;
  let owner;
  let contractor;

  beforeEach(async function () {
    // Get the contract factory and signers
    const BidChain = await ethers.getContractFactory("BidChain");
    [owner, contractor] = await ethers.getSigners();

    // Deploy the contract
    bidChain = await BidChain.deploy();
  });

  describe("Contractor Registration", function () {
    it("Should allow contractors to submit registration requests", async function () {
      const companyName = "Test Contractor";
      const email = "test@contractor.com";

      // Connect as a contractor and submit registration
      await bidChain.connect(contractor).submitRegistrationRequest(companyName, email);

      const pendingContractor = await bidChain.pendingContractors(contractor.address);
      expect(pendingContractor.companyName).to.equal(companyName);
      expect(pendingContractor.email).to.equal(email);
      expect(pendingContractor.isRegistered).to.equal(false);
    });
  });
});
