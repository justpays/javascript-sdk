const _ = require("lodash");
const Env = require("./static/env").env
const kavaUtils = require("../src/utils").utils;
const KavaClient = require("../src/client").KavaClient;

const BNB_CONVERSION_FACTOR = 10 ** 8;
const USDX_CONVERSION_FACTOR = 10 ** 6;

var main = async () => {
    // Start new Kava client
    kavaClient = new KavaClient(Env.KavaEndpoints.Testnet6000);
    kavaClient.setWallet(Env.KavaAccount.Testnet6000.Mnemonic);
    await kavaClient.initChain();

    // Get minimum principal amount required for CDP creation
    const paramsCDP = await kavaClient.getParamsCDP();
    const debtParam = _.get(paramsCDP, "debt_param");
    const principalAmount = Number(
    debtParam.debt_floor
    );
    console.log("Minimum principal:", principalAmount + "usdx");

    // Calculate collateral required for this principal amount
    const bnbValuation = await kavaClient.getPrice("bnb:usd");
    const equivalentCollateral =
    Number(principalAmount) / Number(bnbValuation.price);
    // Minimum collateralization ratio is 200%, we'll do 210%
    const rawRequiredAmount = equivalentCollateral * 2.1;
    const adjustedAmount =
    (rawRequiredAmount / USDX_CONVERSION_FACTOR) * BNB_CONVERSION_FACTOR;
    const collateralAmount = adjustedAmount.toFixed(0);
    console.log("Required collateral:", collateralAmount + "bnb");

    // Confirm that our account has sufficient funds
    try {
    account = await kavaClient.getAccount(kavaClient.wallet.address);
    const coins = _.get(account, "value.coins");
    const bnbBalance = coins.find(coin => coin.denom == "bnb").amount;
    if (bnbBalance < collateralAmount) {
        throw {
        message: "Account only has " + adjustedBnbAmount + "bnb"
        };
    }
    } catch (err) {
    console.log("Error:", err.message);
    return;
    }

    // Load principal, collateral as formatted coins
    const principal = kavaUtils.formatCoin(principalAmount, "usdx");
    const collateral = kavaUtils.formatCoin(collateralAmount, "bnb");

    // Send create CDP tx using Kava client
    const txHashCDP = await kavaClient.createCDP(principal, collateral);
    console.log("Create CDP tx hash (Kava): ".concat(txHashCDP));

    // Get account balance
    account = await kavaClient.getAccount(kavaClient.wallet.address);
    console.log("Address:", _.get(account, "value.address"));
    console.log("Balances:", _.get(account, "value.coins"), "\n");
};

main()