/**
 * Verify GeneticNFT Contract Deployment on Sepolia
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x57c9B78a3f088b52e378ce37d740e2A3AEF33B28";

    console.log("\n🔍 Verifying GeneticNFT Contract on Sepolia");
    console.log("=".repeat(60));

    // Check network
    const network = await ethers.provider.getNetwork();
    console.log(`\n✅ Connected to network: ${network.name} (chainId: ${network.chainId})`);

    if (network.chainId !== 11155111n) {
        console.log("❌ ERROR: Not connected to Sepolia testnet!");
        console.log("   Your hardhat.config.js should use Sepolia network");
        process.exit(1);
    }

    // Check if contract is deployed
    const code = await ethers.provider.getCode(contractAddress);
    console.log(`\n✅ Contract bytecode at ${contractAddress}:`);
    console.log(`   Length: ${code.length} characters`);

    if (code === "0x") {
        console.log("❌ ERROR: No contract deployed at this address!");
        process.exit(1);
    }

    // Get contract instance
    const GeneticNFT = await ethers.getContractFactory("GeneticNFT");
    const contract = GeneticNFT.attach(contractAddress);

    try {
        // Test reading public variables
        console.log("\n📊 Reading Contract State:");
        console.log("-".repeat(60));

        const name = await contract.name();
        console.log(`   Token Name: ${name}`);

        const symbol = await contract.symbol();
        console.log(`   Token Symbol: ${symbol}`);

        const mintFee = await contract.mintFee();
        console.log(`   Mint Fee: ${ethers.formatEther(mintFee)} ETH`);
        console.log(`   Mint Fee (wei): ${mintFee.toString()}`);

        const owner = await contract.owner();
        console.log(`   Contract Owner: ${owner}`);

        console.log("\n✅ Contract is deployed and functioning correctly!");
        console.log("\n📋 Summary:");
        console.log("-".repeat(60));
        console.log(`   Network: Sepolia (${network.chainId})`);
        console.log(`   Contract: ${contractAddress}`);
        console.log(`   Mint Fee: ${ethers.formatEther(mintFee)} ETH`);
        console.log(`   Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);

    } catch (error) {
        console.log("\n❌ ERROR calling contract functions:");
        console.log(error.message);
        console.log("\nThis could mean:");
        console.log("  1. Contract ABI doesn't match deployed contract");
        console.log("  2. RPC connection issue");
        console.log("  3. Contract not properly deployed");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
