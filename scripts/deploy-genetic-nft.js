/**
 * Deploy GeneticNFT to Sepolia
 */

const hre = require("hardhat");

async function main() {
    console.log("🧬 Deploying GeneticNFT to Sepolia...\n");

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

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("\nContract Address:");
    console.log("  GeneticNFT:", geneticNFTAddress);

    console.log("\n📝 Update your config with:");
    console.log(`  GENETIC_NFT_ADDRESS=${geneticNFTAddress}`);

    // Verify on Etherscan
    if (hre.network.name === "sepolia") {
        console.log("\n⏳ Waiting for block confirmations...");
        await geneticNFT.deploymentTransaction()?.wait(6);

        console.log("\n🔍 Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: geneticNFTAddress,
                constructorArguments: []
            });
            console.log("✅ GeneticNFT verified");
        } catch (e) {
            console.log("⚠️ Verification failed:", e.message);
        }
    }

    return { geneticNFT: geneticNFTAddress };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
