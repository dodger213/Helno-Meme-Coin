import { expect } from "chai";
import { ethers } from "hardhat";
// import { abi } from "../artifacts/contracts/ERC20Mock.sol/ERC20Mock.json";

describe('Presale Contract', async function () {

    let presale: any;
    let helno: any;
    let usdtMockInterface: any;
    let usdcMockInterface: any;
    let daiMockInterface: any;
    let owner: any;
    let investor1: any;
    let investor2: any;
    let wallet: any;
    let presaleSupply: any;
    let presaleStartTime: any;

    const claimTime = Date.now();
    const presaleTokenPercent = 10;

    const helnoAddress = "0x5e84d65BF523f59B37a75c092B913Cbb9b8B02E3";
    const presaleAddress = "0x38b11dd63142916c984750880ab2Ecb763A44bCC";

    const SEPOLIA_USDT = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0"; // Checksummed address for USDT
    const SEPOLIA_USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // Checksummed address for USDC
    const SEPOLIA_DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357"; // Checksummed address for DAI

    before(async function () {
        [owner, investor1, investor2, wallet] = await ethers.getSigners();

        //Attach FICCO token contract
        const HELNO = await ethers.getContractFactory("HELNO");
        helno = HELNO.attach(helnoAddress); // Attach to the existing contract

        //Attach Presale contract
        const Presale = await ethers.getContractFactory("Presale");
        presale = Presale.attach(presaleAddress);

        presaleStartTime = await presale.getPresaleStartTime();
        presaleSupply = (await helno.totalSupply()) * BigInt(presaleTokenPercent) / BigInt(100);

        await helno.connect(owner).approve(presaleAddress, presaleSupply);

        const tx = await presale.connect(owner).transferTokensToPresale(presaleSupply);
        await tx.wait();

        const erc20Mock = await ethers.getContractFactory("ERC20Mock");
        usdtMockInterface = erc20Mock.attach(SEPOLIA_USDT);
        usdcMockInterface = erc20Mock.attach(SEPOLIA_USDC);
        daiMockInterface = erc20Mock.attach(SEPOLIA_DAI);

        await usdtMockInterface.connect(investor1).approve(presaleAddress, ethers.parseUnits("1000", 6));
        await usdtMockInterface.connect(investor2).approve(presaleAddress, ethers.parseUnits("10000", 6));

        await usdcMockInterface.connect(investor1).approve(presaleAddress, ethers.parseUnits("1000", 6));
        await usdcMockInterface.connect(investor2).approve(presaleAddress, ethers.parseUnits("10000", 6));

        await daiMockInterface.connect(investor1).approve(presaleAddress, ethers.parseUnits("1000", 18));
        await daiMockInterface.connect(investor2).approve(presaleAddress, ethers.parseUnits("10000", 18));
    });

    describe("Presale setup", function () {
        it("should set up presale correctly", async function () {
            expect(await presale.getFundsRaised()).to.equal(0);
            expect(await presale.tokensAvailable()).to.equal(presaleSupply);
        });
    });

    describe("Buying FICCO with USDT", function () {
        //Passed
        it("should not allow investors spending usdt more than allowance", async function () {
            const tokenAmount = ethers.parseUnits("20000000", 18); //20,000,000 FICCO token 1600usdt because token price is 0.00008usdt per token, exceeding allowance
            await expect(presale.connect(investor1).buyWithUSDT(tokenAmount))
                .to.be.revertedWith("Insufficient allowance set for the contract.");
        });

        //Passed
        it("should allow investors buying FICCO tokens with USDT.", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18); //1,500,000 FICCO token , 120usdt
            const usdtAmount = await presale.estimatedCoinAmountForTokenAmount(tokenAmount, usdtMockInterface);

            const investmentsforUserBeforeTx = await presale.getInvestments(investor1.address, SEPOLIA_USDT);
            const fundsRaisedBeforeTx = await presale.getFundsRaised();
            const investorTokenBalanceBeforeTx = await presale.getTokenAmountForInvestor(investor1.address);
            const tokensAvailableBeforeTx = await presale.tokensAvailable();

            const tx = await presale.connect(investor1).buyWithUSDT(tokenAmount);
            await tx.wait();

            const investmentsforUserAfterTx = await presale.getInvestments(investor1.address, SEPOLIA_USDT);
            const fundsRaisedAfterTx = await presale.getFundsRaised();
            const investorTokenBalanceAfterTx = await presale.getTokenAmountForInvestor(investor1.address);
            const tokensAvailableAfterTx = await presale.tokensAvailable();

            expect(investorTokenBalanceAfterTx).to.equal(investorTokenBalanceBeforeTx + tokenAmount);
            expect(tokensAvailableAfterTx).to.equal(tokensAvailableBeforeTx - tokenAmount);
            expect(investmentsforUserAfterTx).to.equal(investmentsforUserBeforeTx + usdtAmount);
            expect(fundsRaisedAfterTx).to.equal(fundsRaisedBeforeTx + usdtAmount / BigInt(1000000));
        });

        // Time related
        it("should not allow investors buying FICCO tokens before presale starts", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18);
            await expect(presale.connect(investor1).buyWithUSDT(tokenAmount))
                .to.be.revertedWith("Invalid time for buying the token.");
        });

        //Time related
        it("should not allow investors buying FICCO tokens after presale ends", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18);
            await expect(presale.connect(investor1).buyWithUSDT(tokenAmount))
                .to.be.revertedWith("Invalid time for buying the token.");
        });
    });

    describe("Buying FICCO with USDC", function () {
        it("should not allow investors spending usdc more than allowance", async function () {
            const tokenAmount = ethers.parseUnits("20000000", 18); //20,000,000 FICCO token ~1600usdt because token price is 0.00008usdt per token, exceeding allowance
            await expect(presale.connect(investor1).buyWithUSDC(tokenAmount, usdcMockInterface)).to.be.revertedWith("Insufficient allowance set for the contract.")
        });

        it("should allow investors buying FICCO tokens with USDC.", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18); //1,500,000 FICCO tokens, 120usdt
            const usdcAmount = await presale.estimatedCoinAmountForTokenAmount(tokenAmount, usdcMockInterface);

            const investmentsforUserBeforeTx = await presale.getInvestments(investor1.address, SEPOLIA_USDC);
            const fundsRaisedBeforeTx = await presale.getFundsRaised();
            const investorTokenBalanceBeforeTx = await presale.getTokenAmountForInvestor(investor1.address);
            const tokensAvailableBeforeTx = await presale.tokensAvailable();

            const tx = await presale.connect(investor1).buyWithUSDC(tokenAmount);
            await tx.wait();

            const investmentsforUserAfterTx = await presale.getInvestments(investor1.address, SEPOLIA_USDC);
            const fundsRaisedAfterTx = await presale.getFundsRaised();
            const investorTokenBalanceAfterTx = await presale.getTokenAmountForInvestor(investor1.address);
            const tokensAvailableAfterTx = await presale.tokensAvailable();

            expect(investmentsforUserAfterTx).to.equal(investmentsforUserBeforeTx + usdcAmount);
            expect(fundsRaisedAfterTx).to.equal(fundsRaisedBeforeTx + usdcAmount / BigInt(1000000));
            expect(investorTokenBalanceAfterTx).to.equal(investorTokenBalanceBeforeTx + tokenAmount);
            expect(tokensAvailableAfterTx).to.equal(tokensAvailableBeforeTx - tokenAmount);
        });

        it("should not allow investors buying FICCO tokens with USDC before presale starts", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18); //1,500,000 FICCO tokens
            await expect(presale.connect(investor1).buyWithUSDC(tokenAmount)).to.be.revertedWith("Invalid time for buying the token.");
        });
        it("should not allow investors buying FICCO tokens with USDC after presale ends.", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18); //1,500,000 FICCO tokens
            await expect(presale.connect(investor2.buyWithUSDC(tokenAmount))).to.be.revertedWith("Invalid time for buying the token.");
        });
    });

    describe("Buying FICCO with DAI", function () {
        it("should not allow spending dai more than allowance", async function () {
            const tokenAmount = ethers.parseUnits("20000000", 18); //20,000,000 FICCO token ~1600usdt because token price is 0.00008usdt per token, exceeding allowance
            await expect(presale.connect(investor1).buyWithDAI(tokenAmount, daiMockInterface)).to.be.revertedWith("Insufficient allowance set for the contract.");
        });

        it("should allow investors to buy FICCO tokens with DAI.", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18); //1,500,000 FICCO token
            const daiAmount = await presale.estimatedCoinAmountForTokenAmount(tokenAmount, daiMockInterface);

            const investmentsforUserBeforeTx = await presale.getInvestments(investor1.address, SEPOLIA_DAI);
            const fundsRaisedBeforeTx = await presale.getFundsRaised();
            const investorTokenBalanceBeforeTx = await presale.getTokenAmountForInvestor(investor1.address);
            const tokensAvailableBeforeTx = await presale.tokensAvailable();

            const tx = await presale.connect(investor1).buyWithDAI(tokenAmount);
            await tx.wait();

            const investmentsforUserAfterTx = await presale.getInvestments(investor1.address, SEPOLIA_DAI);
            const fundsRaisedAfterTx = await presale.getFundsRaised();
            const investorTokenBalanceAfterTx = await presale.getTokenAmountForInvestor(investor1.address);
            const tokensAvailableAfterTx = await presale.tokensAvailable();

            expect(investmentsforUserAfterTx).to.equal(investmentsforUserBeforeTx + daiAmount);
            expect(fundsRaisedAfterTx).to.equal(fundsRaisedBeforeTx + daiAmount / BigInt(1000000000) / BigInt(1000000000));
            expect(investorTokenBalanceAfterTx).to.equal(investorTokenBalanceBeforeTx + tokenAmount);
            expect(tokensAvailableAfterTx).to.equal(tokensAvailableBeforeTx - tokenAmount);
        });

        it("should not allow investors buying FICCO tokens with DAI before presale starts", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18); //1,500,000 FICCO token
            await expect(presale.connect(investor1).buyWithDAI(tokenAmount)).to.be.revertedWith("Invalid time for buying the token.");
        });
        it("should not allow investors buying FICCO tokens with DAI after presale ends", async function () {
            const tokenAmount = ethers.parseUnits("1500000", 18); //1,500,000 tokens
            await expect(presale.connect(investor1.address).buyWithDAI(tokenAmount)).to.be.revertedWith("Invalid time for buying the token.");
        })
    });

    describe("Buying FICCO with ETH", function () {
        it("should allow investors buying FICCO tokens with ETH.", async function () {
            const ethAmount = ethers.parseEther("0.2"); //0.2 eth
            const tokenAmount = await presale.estimatedTokenAmountAvailableWithETH(ethAmount);
            const usdtAmount = await presale.estimatedCoinAmountForTokenAmount(tokenAmount, usdtMockInterface);

            const investmentsforUserBeforeTx = await presale.getInvestments(investor1.address, SEPOLIA_USDT);
            const fundsRaisedBeforeTx = await presale.getFundsRaised();
            const investorTokenBalanceBeforeTx = await presale.getTokenAmountForInvestor(investor1.address);
            const tokensAvailableBeforeTx = await presale.tokensAvailable();

            const tx = await presale.connect(investor1).buyWithETH({ value: ethAmount });
            await tx.wait();

            const investmentsforUserAfterTx = await presale.getInvestments(investor1.address, SEPOLIA_USDT);
            const fundsRaisedAfterTx = await presale.getFundsRaised();
            const investorTokenBalanceAfterTx = await presale.getTokenAmountForInvestor(investor1.address);
            const tokensAvailableAfterTx = await presale.tokensAvailable();

            expect(investmentsforUserAfterTx).to.equal(investmentsforUserBeforeTx + usdtAmount);
            expect(fundsRaisedAfterTx).to.equal(fundsRaisedBeforeTx + usdtAmount / BigInt(1000000));
            expect(investorTokenBalanceAfterTx).to.equal(investorTokenBalanceBeforeTx + tokenAmount);
            expect(tokensAvailableAfterTx).to.equal(tokensAvailableBeforeTx - tokenAmount);
        });

        it("should not allow investors buying FICCO tokens before presale starts", async function () {
            await expect(presale.connect(investor1).buyWithETH({ value: ethers.parseEther("1") })).to.be.revertedWith("Invalid time for buying the token.")
        })
        it("should not allow investors buying FICCO tokens after presal ends", async function () {
            await expect(presale.connect(investor1).buyWithETH({ value: ethers.parseEther("1") })).to.be.revertedWith("Invalid time for buying the token.");
        });
    });

    describe("Claim functionality", function () {
        before(async function () {
            // Set the claim time before each test
            await presale.connect(owner).setClaimTime(claimTime);
        });

        it("should revert if trying to claim tokens before claim time is set", async function () {
            await presale.connect(investor1).buyWithUSDT(ethers.parseUnits("1500000", 18));
            await expect(presale.connect(investor1).claim(investor1.address)).to.be.revertedWith("It's not claiming time yet.");
        });

        it("should allow investors to claim their tokens", async function () {
            const initialBalance = await helno.balanceOf(investor1.address);
            const tokenAmount = await presale.getTokenAmountForInvestor(investor1.address);
            const claimTx = await presale.connect(investor1).claim(investor1.address);
            await claimTx.wait();
            const finalBalance = await helno.balanceOf(investor1.address);

            expect(finalBalance - initialBalance).to.equal(tokenAmount);
            expect(await presale.getTokenAmountForInvestor(investor1.address)).to.equal(0);
            //Second claim
            await expect(presale.connect(investor1).claim(investor1.address))
                .to.be.revertedWith("No tokens claim.");
        });

        it("should revert if user has no tokens to claim", async function () {
            await expect(presale.connect(investor2).claim(investor2.address))
                .to.be.revertedWith("No tokens claim.");
        });

        it("should correctly distribute bonus tokens among multiple early investors", async function () {
            expect(await presale.isEarlyInvestors(investor1.address)).to.be.true;
            expect(await presale.isEarlyInvestors(investor2.address)).to.be.true;
        });

        it("should revert if a non-owner tries to set the claim time", async function () {
            await expect(presale.connect(investor1).setClaimTime(claimTime)).to.be.revertedWithCustomError(presale, "NotOwner");
        });
    });

    describe("Withdraw functionality", function () {
        before(async function () {
            await presale.connect(owner).setWallet(wallet.address);
        })
        it("should allow the owner to withdraw usdt balance of contract to wallet after presale ends", async function () {
            const initialUSDTBalance = await usdtMockInterface.balanceOf(wallet.address);
            const initialUSDCBalance = await usdcMockInterface.balanceOf(wallet.address);
            const initialDAIBalance = await daiMockInterface.balanceOf(wallet.address);

            console.log("initialUSDTBalance--->", initialUSDTBalance);
            console.log("initialUSDCBalance--->", initialUSDCBalance);
            console.log("initialDAIBalance--->", initialDAIBalance);

            const usdtAmount = await usdtMockInterface.balanceOf(presaleAddress);
            const usdcAmount = await usdcMockInterface.balanceOf(presaleAddress);
            const daiAmount = await daiMockInterface.balanceOf(presaleAddress);

            console.log("usdtAmount--->", usdtAmount);
            console.log("usdcAmount--->", usdcAmount);
            console.log("daiAmount--->", daiAmount);

            const withdrawTx = await presale.connect(owner).withdraw();
            await withdrawTx.wait();

            const finalUSDTBalance = await usdtMockInterface.balanceOf(wallet.address);
            const finalUSDCBalance = await usdcMockInterface.balanceOf(wallet.address);
            const finalDAIBalance = await daiMockInterface.balanceOf(wallet.address);    

            console.log("finalUSDTBalance--->", finalUSDTBalance);
            console.log("finalUSDCBalance--->", finalUSDCBalance);
            console.log("finalDAIBalance--->", finalDAIBalance);        

            expect(finalUSDTBalance).to.equal(initialUSDTBalance + usdtAmount);
            expect(finalUSDCBalance).to.equal(initialUSDCBalance + usdcAmount);
            expect(finalDAIBalance).to.equal(initialDAIBalance + daiAmount);
        });
        it("should revert if non-owner tries to withdraw", async function () {
            const tx = await presale.connect(investor1).buyWithUSDT(ethers.parseUnits("1500000", 18));
            await tx.wait();
            await expect(presale.connect(investor1).withdraw()).to.be.revertedWithCustomError(presale, "NotOwner");
        });
        it("should revert if a non-owner tries to set the wallet", async function () {
            await expect(presale.connect(investor1).setWallet(wallet)).to.be.revertedWithCustomError(presale, "NotOwner");
        });

        //Time Related
        // it("should revert if trying to withdraw before the presale ends", async function () {
        //     await expect(presale.connect(owner).withdraw())
        //         .to.be.revertedWith("Cannot withdraw because presale is still in progress.");
        // })
    })
    describe("Refund Functionality", function () {
        it("should allow the owner to refund to investors if softcap is not reached", async function () {
            const investor1USDTInitialBalance = usdtMockInterface.balanceOf(investor1.address);
            const investor2USDTInitialBalance = usdtMockInterface.balanceOf(investor2.address);
            const investor1USDCInitialBalance = usdcMockInterface.balanceOf(investor1.address);
            const investor2USDCInitialBalance = usdcMockInterface.balanceOf(investor2.address);
            const investor1DAIInitialBalance = daiMockInterface.balanceOf(investor1.address);
            const investor2DAIInitialBalance = daiMockInterface.balanceOf(investor2.address);

            const investor1USDTAmount = await presale.getInvestments(investor1.address, usdtMockInterface);
            const investor2USDTAmount = await presale.getInvestments(investor2.address, usdtMockInterface);
            const investor1USDCAmount = await presale.getInvestments(investor1.address, usdcMockInterface);
            const investor2USDCAmount = await presale.getInvestments(investor2.address, usdcMockInterface);
            const investor1DAIAmount = await presale.getInvestments(investor1.address, daiMockInterface);
            const investor2DAIAmount = await presale.getInvestments(investor2.address, daiMockInterface);

            const tx = await presale.connect(owner).refund();
            await tx.wait();

            const investor1USDTFinalBalance = usdtMockInterface.balanceOf(investor1.address);
            const investor2USDTFinalBalance = usdtMockInterface.balanceOf(investor2.address);
            const investor1USDCFinalBalance = usdcMockInterface.balanceOf(investor1.address);
            const investor2USDCFinalBalance = usdcMockInterface.balanceOf(investor2.address);
            const investor1DAIFinalBalance = daiMockInterface.balanceOf(investor1.address);
            const investor2DAIFinalBalance = daiMockInterface.balanceOf(investor2.address);

            expect(investor1USDTFinalBalance).to.equal(investor1USDTInitialBalance + investor1USDTAmount);
            expect(investor2USDTFinalBalance).to.equal(investor2USDTInitialBalance + investor2USDTAmount);
            expect(investor1USDCFinalBalance).to.equal(investor1USDCInitialBalance + investor1USDCAmount);
            expect(investor2USDCFinalBalance).to.equal(investor2USDCInitialBalance + investor2USDCAmount);
            expect(investor1DAIFinalBalance).to.equal(investor1DAIInitialBalance + investor1DAIAmount);
            expect(investor2DAIFinalBalance).to.equal(investor2DAIInitialBalance + investor2DAIAmount);
       });
        
        // Passed
        it("should revert if non-owner tries to refund", async function () {
            await expect(presale.connect(investor1).refund())
                .to.be.revertedWithCustomError(presale, "NotOwner");
        });

        // it("should revert if trying to refund before the presale ends", async function () {
        //     await expect(presale.connect(owner).refund())
        //         .to.be.revertedWith("Cannot refund because presale is still in progress.");
        // })
    });
})