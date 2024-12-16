async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
  
    // Deploy the contract
    const Contract = await ethers.getContractFactory("BidChain");
    const contract = await Contract.deploy();
    console.log("Contract deployed to:", contract.address);
  
    // Verify the contract on Etherscan
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: [], // Add constructor arguments if any
    });
  
    console.log("Contract verified!");
    return contract.address;
  }
  
  main()
    .then((address) => {
      console.log("Deployment and verification completed, contract address:", address);
    })
    .catch((error) => {
      console.error("Error in deployment or verification:", error);
      process.exit(1);
    });