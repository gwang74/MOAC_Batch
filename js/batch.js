var utils = require('./utils.js');
var logger = require('./logger');
var fs = require('fs');
var BigNumber = require('bignumber.js');
var batch = require('../config/batch');

var nonceInfoPath = __dirname + '/../config/nonce.json';
var transactionPath = __dirname + '/../config/transaction.json';   // 挖矿信息文件路径

var initConfig = require('../config/initConfig');
var owner = {
    address: initConfig.baseaddr,
    privatekey: initConfig.privatekey
}

var subChain = initConfig.subChain;
var via = initConfig.vnodeVia;

var inNonce = utils.chain3.scs.getNonce(subChain, owner.address);
console.log(inNonce)
transferBatch();
sendRawbatch();

function sendRawbatch() {
    var transactions = require('../config/transaction');
    var batch = utils.chain3.createBatch();
    for (let i = 0, length = transactions.length; i < length; i++) {
        batch.add(utils.chain3.mc.sendRawTransaction.request(transactions[i]));
        if (new BigNumber(i).mod(200) == 0 || i == transactions.length - 1) {
            batch.execute();
        }
    }
}

function transferBatch() {
    for (let i = 0, length = batch.length; i < length; i++) {
        let signtx = transfer(batch[i].to, batch[i].value, batch[i].token, inNonce + i);
        let input;
        if (i === 0) {
            input = "[\"" + signtx + "\",\n"
        } else if (i === length - 1) {
            input = "\"" + signtx + "\"]\n"
        } else {
            input = "\"" + signtx + "\",\n"
        }
        fs.writeFileSync(transactionPath, input, { flag: 'a', encoding: 'utf-8', mode: '0666' }, function (err) {
            if (err) {
                logger.info(err)
            } else {
                // logger.info('success')
            }
        })
    }
}

/**
 * 转账
 * 
 * @param {address} _to 
 * @param {number} _value 
 * @param {address} _dappAddr
 * @param {number} _inNonce
 */
function transfer(_to, _value, _dappAddr, _inNonce) {
    var data = _dappAddr + utils.chain3.sha3('transfer(address,uint256)').substr(2, 8)
        + utils.chain3.encodeParams(['address', 'uint256'], [_to, utils.chain3.toSha(_value, 'mc')]);
    return callMethod(owner.address, owner.privatekey, 0, data, _inNonce);
}

function callMethod(_from, _privatekey, _value, _data, _inNonce) {
    var rawTx = {
        from: _from,
        to: subChain,
        nonce: utils.chain3.toHex(_inNonce),
        gasLimit: utils.chain3.toHex("0"),
        gasPrice: utils.chain3.toHex("0"),
        value: utils.chain3.toHex(utils.chain3.toSha(_value, 'mc')),
        chainId: utils.chain3.toHex(utils.chain3.version.network),
        via: via,
        shardingFlag: "0x1",
        data: _data
    };
    try {
        var signtx = utils.chain3.signTransaction(rawTx, _privatekey);
        fs.writeFileSync(nonceInfoPath, _inNonce, { flag: 'w', encoding: 'utf-8', mode: '0666' }, function (err) {
            if (err) {
                logger.info(err)
            } else {
                // logger.info('success')
            }
        })
        return signtx;
    } catch (error) {
        console.log(error)
    }
}