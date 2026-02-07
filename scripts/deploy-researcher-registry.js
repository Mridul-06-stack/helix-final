/**
 * ResearcherRegistry Contract Deployment Script
 */

const hre = require("hardhat");

async function main() {
    console.log("🔬 Deploying ResearcherRegistry contract...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Deploy ResearcherRegistry
    console.log("📦 Deploying ResearcherRegistry...");
    const ResearcherRegistry = await hre.ethers.getContractFactory("ResearcherRegistry");
    const researcherRegistry = await ResearcherRegistry.deploy();
    await researcherRegistry.waitForDeployment();
    const researcherRegistryAddress = await researcherRegistry.getAddress();
    console.log("✅ ResearcherRegistry deployed to:", researcherRegistryAddress);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("\nContract Address:");
    console.log("  ResearcherRegistry:", researcherRegistryAddress);

    console.log("\n📝 Update your .env file with:");
    console.log(`  RESEARCHER_REGISTRY_ADDRESS=${researcherRegistryAddress}`);

    // Verify on Etherscan (if not localhost)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n⏳ Waiting for block confirmations...");
        await researcherRegistry.deploymentTransaction()?.wait(6);

        console.log("\n🔍 Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: researcherRegistryAddress,
                constructorArguments: []
            });
            console.log("✅ ResearcherRegistry verified");
        } catch (e) {
            console.log("⚠️ ResearcherRegistry verification failed:", e.message);
        }
    }

    return {
        researcherRegistry: researcherRegistryAddress
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
