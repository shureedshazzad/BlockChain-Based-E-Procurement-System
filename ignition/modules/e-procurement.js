// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");;
require("dotenv").config();

const EProcurementModule = buildModule("EProcurementModule", (m) => {
  // Define the contract in the module (No async code here)
  const e_procurement = m.contract("BidChain");

  // Return the contract inside the module
  return { e_procurement };
});

module.exports = EProcurementModule;

