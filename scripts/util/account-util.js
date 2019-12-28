'use strict';

// libraries
const bananojs = require('@bananocoin/bananojs');

// modules

// constants

// variables

// functions
const setAccountDataFromSeed = async (rpcUrl, seed, accountData) => {
  bananojs.setBananodeApiUrl(rpcUrl);
  let hasMoreHistory = true;
  let seedIx = 0;
  accountData.length = 0;
  while (hasMoreHistory) {
    // console.log('setAccountDataFromSeed', seedIx);
    const accountDataElt = {};
    accountDataElt.seedIx = seedIx;
    accountDataElt.privateKey = bananojs.getPrivateKey(seed, accountDataElt.seedIx);
    accountDataElt.publicKey = bananojs.getPublicKey(accountDataElt.privateKey);
    accountDataElt.account = bananojs.getAccount(accountDataElt.publicKey);
    accountData.push(accountDataElt);
    const accountHistory = await bananojs.getAccountHistory(accountDataElt.account, 1);
    if (accountHistory.history) {
      accountDataElt.hasHistory = true;
    } else {
      accountDataElt.hasHistory = false;
      hasMoreHistory = false;
    }
    seedIx++;
  }
};

// exports
exports.setAccountDataFromSeed = setAccountDataFromSeed;
