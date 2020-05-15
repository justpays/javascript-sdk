const _ = require("lodash");
const BnbApiClient = require("@binance-chain/javascript-sdk");
const bnbCrypto = BnbApiClient.crypto;

const kavaUtils = require("../src/utils").utils;
const KavaClient = require("../src/client").KavaClient;

const BINANCE_CHAIN_API_TESTNET = "https://testnet-dex.binance.org";
const BINANCE_CHAIN_DEPUTY = "tbnb10uypsspvl6jlxcx5xse02pag39l8xpe7a3468h";
const bnbAddress = "tbnb17vwyu8npjj5pywh3keq2lm7d4v76n434pwd8av";
const bnbMnemonic =
  "lawsuit margin siege phrase fabric matrix like picnic day thrive correct velvet stool type broom upon flee fee ten senior install wrestle soap sick";

  const KAVA_API_TESTNET_5000 = "http://kava-testnet-5000.kava.io:1317"
  // const KAVA_API_TESTNET_6000_INTERNAL = "http://54.196.2.124:1317";
  // const KAVA_API_LOCAL = "http://localhost:1317";
  
  const KAVA_DEPUTY_TESTNET = "kava1aphsdnz5hu2t5ty2au6znprug5kx3zpy6zwq29";
  // const KAVA_DEPUTY_LOCAL = "kava1l0xsq2z7gqd7yly0g40y5836g0appumark77ny";

const kavaAddress = "kava1g0qywkx6mt5jmvefv6hs7c7h333qas5ks63a6t";
const kavaMnemonic =
  "lecture draw addict sea prefer erupt army someone album liquid sadness manual fence vintage obey shrimp figure retreat kick refuse verify alien east brand";

var main = async () => {
  await outgoingSwap();
}

var outgoingSwap = async () => {
  // Start new Kava client
  kavaClient = new KavaClient(KAVA_API_TESTNET_5000);
  kavaClient.setWallet(kavaMnemonic);
  await kavaClient.initChain();

  // Start Binance Chain client
  const bnbClient = await new BnbApiClient(BINANCE_CHAIN_API_TESTNET);
  bnbClient.chooseNetwork("testnet");
  const privateKey = bnbCrypto.getPrivateKeyFromMnemonic(bnbMnemonic);
  bnbClient.setPrivateKey(privateKey);
  await bnbClient.initChain();

  // -------------------------------------------------------------------------------
  //                           Kava blockchain interaction
  // -------------------------------------------------------------------------------
  const recipient = KAVA_DEPUTY_TESTNET; // deputy's address on kava
  const recipientOtherChain = bnbAddress; // user's address on bnbchain
  const senderOtherChain = BINANCE_CHAIN_DEPUTY; // deputy's address on bnbchain

  // Set up params
  const asset = "bnb";
  const amount = 1000000;
  const coins = kavaUtils.formatCoins(amount, asset);
  const heightSpan = "500";

  // Generate random number hash from timestamp and hex-encoded random number
  const randomNumber = kavaUtils.generateRandomNumber();
  const timestamp = Math.floor(Date.now() / 1000);
  const randomNumberHash = kavaUtils.calculateRandomNumberHash(
    randomNumber,
    timestamp
  );
  console.log("\nSecret random number:", randomNumber);

  printSwapIDs(randomNumberHash, kavaAddress, senderOtherChain)

  const txHash = await kavaClient.createSwap(
    recipient,
    recipientOtherChain,
    senderOtherChain,
    randomNumberHash,
    timestamp,
    coins,
    heightSpan
  );

  console.log("\nTx hash (Create swap on Kava):", txHash);

  // Wait for deputy to see the new swap on Kava and relay it to Binance Chain
  console.log("Waiting for deputy to witness and relay the swap...")
  await sleep(30000); // 30 seconds

  // -------------------------------------------------------------------------------
  //                       Binance Chain blockchain interaction
  // -------------------------------------------------------------------------------
   // Calculate the expected swap ID on Bnbchain
   const expectedBnbchainSwapID = kavaUtils.calculateSwapID(
    randomNumberHash,
    senderOtherChain,
    kavaAddress
  );

  const res = await bnbClient.swap.claimHTLT(bnbAddress, expectedBnbchainSwapID, randomNumber); // Binance-chain
  if (res && res.status == 200) {
    console.log(
      "Claim swap tx hash (Binance Chain): ",
      res.result[0].hash
    );
  } else {
    console.log("Tx error:", res);
    return;
  }
};

// Print swap IDs
var printSwapIDs = (randomNumberHash, sender, senderOtherChain) => {
  // Calculate the expected swap ID on origin chain
  const originChainSwapID = kavaUtils.calculateSwapID(
    randomNumberHash,
    sender,
    senderOtherChain
  );

  // Calculate the expected swap ID on destination chain
  const destChainSwapID = kavaUtils.calculateSwapID(
    randomNumberHash,
    senderOtherChain,
    sender
  );

  console.log("Expected Bnbchain swap ID:", originChainSwapID);
  console.log("Expected Kava swap ID:", destChainSwapID);
};

// Sleep is a wait function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();