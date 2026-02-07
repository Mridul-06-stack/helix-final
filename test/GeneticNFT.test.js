const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GeneticNFT", function () {
    let GeneticNFT;
    let geneticNFT;
    let owner;
    let user1;
    let user2;
    let agent;

    const SAMPLE_IPFS_CID = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
    const SAMPLE_DATA_HASH = ethers.keccak256(ethers.toUtf8Bytes("sample_genetic_data"));
    const ENCRYPTION_ALGO = "AES-256-GCM";
    const GENE_TYPE = "23andme";
    const FILE_SIZE = 1000000;
    const TOKEN_URI = "ipfs://QmTokenMetadata";

    beforeEach(async function () {
        [owner, user1, user2, agent] = await ethers.getSigners();

        GeneticNFT = await ethers.getContractFactory("GeneticNFT");
        geneticNFT = await GeneticNFT.deploy();
        await geneticNFT.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await geneticNFT.owner()).to.equal(owner.address);
        });

        it("Should have correct name and symbol", async function () {
            expect(await geneticNFT.name()).to.equal("HelixVault Genome");
            expect(await geneticNFT.symbol()).to.equal("HELIX");
        });

        it("Should have default mint fee", async function () {
            expect(await geneticNFT.mintFee()).to.equal(ethers.parseEther("0.001"));
        });
    });

    describe("Minting", function () {
        it("Should mint a genome NFT with correct fee", async function () {
            const mintFee = await geneticNFT.mintFee();

            await expect(
                geneticNFT.connect(user1).mintGenome(
                    SAMPLE_IPFS_CID,
                    SAMPLE_DATA_HASH,
                    ENCRYPTION_ALGO,
                    GENE_TYPE,
                    FILE_SIZE,
                    TOKEN_URI,
                    { value: mintFee }
                )
            ).to.emit(geneticNFT, "GenomeMinted");

            expect(await geneticNFT.balanceOf(user1.address)).to.equal(1);
        });

        it("Should fail to mint with insufficient fee", async function () {
            await expect(
                geneticNFT.connect(user1).mintGenome(
                    SAMPLE_IPFS_CID,
                    SAMPLE_DATA_HASH,
                    ENCRYPTION_ALGO,
                    GENE_TYPE,
                    FILE_SIZE,
                    TOKEN_URI,
                    { value: 0 }
                )
            ).to.be.revertedWith("Insufficient mint fee");
        });

        it("Should fail to mint with empty IPFS CID", async function () {
            const mintFee = await geneticNFT.mintFee();

            await expect(
                geneticNFT.connect(user1).mintGenome(
                    "",
                    SAMPLE_DATA_HASH,
                    ENCRYPTION_ALGO,
                    GENE_TYPE,
                    FILE_SIZE,
                    TOKEN_URI,
                    { value: mintFee }
                )
            ).to.be.revertedWith("Invalid IPFS CID");
        });

        it("Should store genome data correctly", async function () {
            const mintFee = await geneticNFT.mintFee();

            await geneticNFT.connect(user1).mintGenome(
                SAMPLE_IPFS_CID,
                SAMPLE_DATA_HASH,
                ENCRYPTION_ALGO,
                GENE_TYPE,
                FILE_SIZE,
                TOKEN_URI,
                { value: mintFee }
            );

            const genomeData = await geneticNFT.getGenomeData(1);

            expect(genomeData.ipfsCID).to.equal(SAMPLE_IPFS_CID);
            expect(genomeData.dataHash).to.equal(SAMPLE_DATA_HASH);
            expect(genomeData.encryptionAlgo).to.equal(ENCRYPTION_ALGO);
            expect(genomeData.geneType).to.equal(GENE_TYPE);
            expect(genomeData.isActive).to.equal(true);
        });
    });

    describe("Access Control", function () {
        beforeEach(async function () {
            const mintFee = await geneticNFT.mintFee();
            await geneticNFT.connect(user1).mintGenome(
                SAMPLE_IPFS_CID,
                SAMPLE_DATA_HASH,
                ENCRYPTION_ALGO,
                GENE_TYPE,
                FILE_SIZE,
                TOKEN_URI,
                { value: mintFee }
            );
        });

        it("Owner should be able to access encrypted data", async function () {
            const cid = await geneticNFT.connect(user1).getEncryptedDataCID(1);
            expect(cid).to.equal(SAMPLE_IPFS_CID);
        });

        it("Non-owner should not be able to access encrypted data", async function () {
            await expect(
                geneticNFT.connect(user2).getEncryptedDataCID(1)
            ).to.be.revertedWith("Not authorized to access data");
        });

        it("Trusted agent with access should be able to get data", async function () {
            // Set agent as trusted
            await geneticNFT.connect(owner).setTrustedAgent(agent.address, true);

            // Grant access
            await geneticNFT.connect(user1).grantQueryAccess(1, agent.address, 3600);

            // Agent should be able to access
            const cid = await geneticNFT.connect(agent).getEncryptedDataCID(1);
            expect(cid).to.equal(SAMPLE_IPFS_CID);
        });

        it("Should revoke access correctly", async function () {
            await geneticNFT.connect(owner).setTrustedAgent(agent.address, true);
            await geneticNFT.connect(user1).grantQueryAccess(1, agent.address, 3600);

            // Revoke access
            await geneticNFT.connect(user1).revokeQueryAccess(1, agent.address);

            // Should fail
            await expect(
                geneticNFT.connect(agent).getEncryptedDataCID(1)
            ).to.be.revertedWith("Not authorized to access data");
        });
    });

    describe("Data Integrity", function () {
        beforeEach(async function () {
            const mintFee = await geneticNFT.mintFee();
            await geneticNFT.connect(user1).mintGenome(
                SAMPLE_IPFS_CID,
                SAMPLE_DATA_HASH,
                ENCRYPTION_ALGO,
                GENE_TYPE,
                FILE_SIZE,
                TOKEN_URI,
                { value: mintFee }
            );
        });

        it("Should verify correct data hash", async function () {
            const isValid = await geneticNFT.verifyDataIntegrity(1, SAMPLE_DATA_HASH);
            expect(isValid).to.equal(true);
        });

        it("Should reject incorrect data hash", async function () {
            const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong_data"));
            const isValid = await geneticNFT.verifyDataIntegrity(1, wrongHash);
            expect(isValid).to.equal(false);
        });
    });

    describe("Deactivation", function () {
        beforeEach(async function () {
            const mintFee = await geneticNFT.mintFee();
            await geneticNFT.connect(user1).mintGenome(
                SAMPLE_IPFS_CID,
                SAMPLE_DATA_HASH,
                ENCRYPTION_ALGO,
                GENE_TYPE,
                FILE_SIZE,
                TOKEN_URI,
                { value: mintFee }
            );
        });

        it("Owner should be able to deactivate genome", async function () {
            await geneticNFT.connect(user1).deactivateGenome(1);

            const genomeData = await geneticNFT.getGenomeData(1);
            expect(genomeData.isActive).to.equal(false);
        });

        it("Should not be able to access deactivated genome data", async function () {
            await geneticNFT.connect(user1).deactivateGenome(1);

            await expect(
                geneticNFT.connect(user1).getEncryptedDataCID(1)
            ).to.be.revertedWith("Genome data is deactivated");
        });
    });

    describe("Admin Functions", function () {
        it("Only owner can set trusted agents", async function () {
            await expect(
                geneticNFT.connect(user1).setTrustedAgent(agent.address, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Only owner can set mint fee", async function () {
            await expect(
                geneticNFT.connect(user1).setMintFee(ethers.parseEther("0.01"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Owner can withdraw fees", async function () {
            const mintFee = await geneticNFT.mintFee();
            await geneticNFT.connect(user1).mintGenome(
                SAMPLE_IPFS_CID,
                SAMPLE_DATA_HASH,
                ENCRYPTION_ALGO,
                GENE_TYPE,
                FILE_SIZE,
                TOKEN_URI,
                { value: mintFee }
            );

            const initialBalance = await ethers.provider.getBalance(owner.address);
            await geneticNFT.connect(owner).withdraw();
            const finalBalance = await ethers.provider.getBalance(owner.address);

            expect(finalBalance).to.be.gt(initialBalance);
        });
    });
});
