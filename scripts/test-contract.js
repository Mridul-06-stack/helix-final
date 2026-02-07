/**
 * Test GeneticNFT contract functions
 */

const hre = require("hardhat");

async function main() {
    const contractAddress = "0x57c9B78a3f088b52e378ce37d740e2A3AEF33B28";

    console.log("🧪 Testing contract at:", contractAddress);

    const GeneticNFT = await hre.ethers.getContractFactory("GeneticNFT");
    const contract = GeneticNFT.attach(contractAddress);

    try {
        // Test 1: Get contract name
        console.log("\n1️⃣ Testing name()...");
        const name = await contract.name();
        console.log("   ✅ Name:", name);

        // Test 2: Get symbol
        console.log("\n2️⃣ Testing symbol()...");
        const symbol = await contract.symbol();
        console.log("   ✅ Symbol:", symbol);

        // Test 3: Get mint fee
        console.log("\n3️⃣ Testing mintFee()...");
        const mintFee = await contract.mintFee();
        console.log("   ✅ Mint Fee:", hre.ethers.formatEther(mintFee), "ETH");

        // Test 4: Get owner
        console.log("\n4️⃣ Testing owner()...");
        const owner = await contract.owner();
        console.log("   ✅ Owner:", owner);

        console.log("\n✅ All contract functions working correctly!");

    } catch (error) {
        console.error("\n❌ Contract test failed:", error.message);
        console.error("Full error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
