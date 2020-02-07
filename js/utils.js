var Chain3 = require('chain3');
var logger = require('./logger');
var initConfig = require('../config/initConfig');

const vnodeUri = initConfig.vnodeUri;
const scsUri = initConfig.scsUri;
const subChain = initConfig.subChain;

var chain3 = new Chain3();
chain3.setProvider(new chain3.providers.HttpProvider(vnodeUri));
chain3.setScsProvider(new chain3.providers.HttpProvider(scsUri));

if (!chain3.isConnected()) {
    throw new Error('unable to connect to moac vnode at ' + vnodeUri);
} else {
    logger.info('connected to moac vnode at ' + vnodeUri);
}

function waitBalance(addr, target) {
    while (true) {
        let balance = chain3.mc.getBalance(addr) / 1000000000000000000;
        if (balance >= target) {
            logger.info("account has enough balance " + balance);
            break;
        }
        logger.info("Waiting the account has enough balance " + balance);
        sleep(5000);
    }
}

// wait certain blocks for the contract to be mined
function waitForBlocks(innum) {
    let startBlk = chain3.mc.blockNumber;
    let preBlk = startBlk;
    logger.info("Waiting for blocks to confirm the contract... currently in block " + startBlk);
    while (true) {
        let curblk = chain3.mc.blockNumber;
        if (curblk > startBlk + innum) {
            logger.info("Waited for " + innum + " blocks!");
            break;
        }
        if (curblk > preBlk) {
            logger.info("Waiting for blocks to confirm the contract... currently in block " + curblk);
            preBlk = curblk;
        } else {
            logger.info("...");
        }

        sleep(8000);
    }
}

function waitBlockForContractInMicroChain(transactionHash) {
    logger.info("Waiting a mined block to include your contract...");

    while (true) {
        let receipt = chain3.scs.getReceiptByHash(subChain, transactionHash);
        if (receipt && !receipt.failed) {
            logger.info("contract has been deployed at " + receipt.contractAddress);
            return receipt.contractAddress;
        } else if (receipt && receipt.failed) {
            logger.info("contract deploy failed!!!");
            break;
        }
        logger.info("block " + chain3.mc.blockNumber + "...");
        sleep(50000);
    }
}

function waitBlockForTransactionInMicroChain(transactionHash) {
    logger.info("Waiting a mined block to include ", transactionHash);

    while (true) {
        let receipt = chain3.scs.getReceiptByHash(subChain, transactionHash);
        if (receipt && !receipt.failed) {
            logger.info("transaction successfully!");
            return true;
        } else if (receipt && receipt.failed) {
            logger.info("transaction failed!");
            return false;
        }
        logger.info("block " + chain3.mc.blockNumber + "...");
        sleep(50000);
    }
}

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}

module.exports = {
    waitBlockForContractInMicroChain,
    waitBlockForTransactionInMicroChain,
    sleep,
    chain3,
}