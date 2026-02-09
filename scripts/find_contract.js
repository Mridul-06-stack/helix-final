
const hre = require("hardhat");

async function main() {
    console.log("🔍 Searching for GeneticNFT deployment on Sepolia...");

    // Get the address that deployed ResearcherRegistry
    // We assume the user used the same account
    const researcherRegistryAddress = "0x2D8175a94D9EcDba7d73619EcF895814a25E0A12";

    // We'll try to find the deployer of ResearcherRegistry first
    // This defines the "Deployer" we are looking for
    const provider = hre.ethers.provider;

    // Check if we can get the transaction that created the ResearcherRegistry
    // This is hard without an indexer, but let's try to see if the current configured signer
    // matches the deployer pattern.

    const [signer] = await hre.ethers.getSigners();
    console.log(`Checking account: ${signer.address}`);

    // Get nonce to estimate how many transactions they've sent
    const nonce = await provider.getTransactionCount(signer.address);
    console.log(`Account nonce: ${nonce}`);

    console.log("\n⚠️ Logic: We will check the last 10 transactions of this account to see if any created a contract.");

    // This is a naive search, checking the last few blocks/transactions of the signer
    // Realistically better to ask the user, but let's try to be helpful.

    // Since we can't easily iterate output transactions without an indexer (like Etherscan API),
    // we will check if the contract code exists at the expected address if it was deployed *after* ResearcherRegistry 
    // using the same nonce sequence, or just advise the user.

    console.log("\n❌ Cannot reliably search history without Etherscan API key.");
    console.log("👉 Recommendation: Check your Etherscan transaction history for 'Contract Creation'.");
}

main().catch(console.error);
