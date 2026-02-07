/**
 * HelixVault Contract Deployment Script
 * Deploys GeneticNFT and BountyMarket contracts
 */

const hre = require("hardhat");

async function main() {
    console.log("🧬 Deploying HelixVault contracts...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Deploy GeneticNFT
    console.log("📦 Deploying GeneticNFT...");
    const GeneticNFT = await hre.ethers.getContractFactory("GeneticNFT");
    const geneticNFT = await GeneticNFT.deploy();
    await geneticNFT.waitForDeployment();
    const geneticNFTAddress = await geneticNFT.getAddress();
    console.log("✅ GeneticNFT deployed to:", geneticNFTAddress);

    // Deploy BountyMarket
    console.log("\n📦 Deploying BountyMarket...");
    const BountyMarket = await hre.ethers.getContractFactory("BountyMarket");
    const bountyMarket = await BountyMarket.deploy(geneticNFTAddress);
    await bountyMarket.waitForDeployment();
    const bountyMarketAddress = await bountyMarket.getAddress();
    console.log("✅ BountyMarket deployed to:", bountyMarketAddress);

    // Set BountyMarket as trusted agent on GeneticNFT
    console.log("\n🔐 Setting up permissions...");
    await geneticNFT.setTrustedAgent(bountyMarketAddress, true);
    console.log("✅ BountyMarket set as trusted agent");

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("\nContract Addresses:");
    console.log("  GeneticNFT:   ", geneticNFTAddress);
    console.log("  BountyMarket: ", bountyMarketAddress);

    console.log("\n📝 Update your .env file with:");
    console.log(`  HELIX_CONTRACT_ADDRESS=${geneticNFTAddress}`);
    console.log(`  HELIX_BOUNTY_CONTRACT_ADDRESS=${bountyMarketAddress}`);

    // Verify on Etherscan (if not localhost)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n⏳ Waiting for block confirmations...");
        await geneticNFT.deploymentTransaction()?.wait(5);
        await bountyMarket.deploymentTransaction()?.wait(5);

        console.log("\n🔍 Verifying contracts on Polygonscan...");
        try {
            await hre.run("verify:verify", {
                address: geneticNFTAddress,
                constructorArguments: []
            });
            console.log("✅ GeneticNFT verified");
        } catch (e) {
            console.log("⚠️ GeneticNFT verification failed:", e.message);
        }

        try {
            await hre.run("verify:verify", {
                address: bountyMarketAddress,
                constructorArguments: [geneticNFTAddress]
            });
            console.log("✅ BountyMarket verified");
        } catch (e) {
            console.log("⚠️ BountyMarket verification failed:", e.message);
        }
    }

    return {
        geneticNFT: geneticNFTAddress,
        bountyMarket: bountyMarketAddress
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
