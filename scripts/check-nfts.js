/**
 * Check NFTs minted by a wallet address
 */

const hre = require("hardhat");

async function main() {
    const walletAddress = process.argv[2] || "0xAd0799D4D6564c945C448D8BcFA890c41e111A98";
    const contractAddress = "0x57c9B78a3f088b52e378ce37d740e2A3AEF33B28";

    console.log("🔍 Checking NFTs for wallet:", walletAddress);
    console.log("Contract:", contractAddress);
    console.log("");

    const GeneticNFT = await hre.ethers.getContractFactory("GeneticNFT");
    const contract = GeneticNFT.attach(contractAddress);

    // Get balance
    const balance = await contract.balanceOf(walletAddress);
    console.log("✅ NFT Balance:", balance.toString());

    if (balance > 0) {
        console.log("\n📋 Your NFTs:");
        for (let i = 0; i < balance; i++) {
            const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
            console.log(`\n  Token #${tokenId}`);

            // Get genome data
            const genomeData = await contract.getGenomeData(tokenId);
            console.log(`    IPFS CID: ${genomeData.ipfsCID}`);
            console.log(`    Data Hash: ${genomeData.dataHash}`);
            console.log(`    Gene Type: ${genomeData.geneType}`);
            console.log(`    File Size: ${genomeData.fileSize} bytes`);
            console.log(`    Minted: ${new Date(Number(genomeData.mintTimestamp) * 1000).toLocaleString()}`);
            console.log(`    Active: ${genomeData.isActive}`);
        }
    } else {
        console.log("\n⚠️ No NFTs found for this wallet");
    }

    // Check recent GenomeMinted events
    console.log("\n\n🔔 Recent Mint Events:");
    const filter = contract.filters.GenomeMinted();
    const events = await contract.queryFilter(filter, -1000); // Last 1000 blocks

    console.log(`Found ${events.length} total mint events\n`);

    const userEvents = events.filter(e => e.args.owner.toLowerCase() === walletAddress.toLowerCase());
    if (userEvents.length > 0) {
        console.log(`Your mints (${userEvents.length}):`);
        for (const event of userEvents.slice(-5)) { // Last 5
            console.log(`  Token #${event.args.tokenId} - ${event.args.ipfsCID}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
