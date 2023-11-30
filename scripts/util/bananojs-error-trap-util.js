'use strict';
// modules
const bananojs = require('@bananocoin/bananojs');
const bananojsHw = require('@bananocoin/bananojs-hw');

const mainConsoleLib = require('console');

// constants
const mainConsole = new mainConsoleLib.Console(process.stdout, process.stderr);
mainConsole.debug = () => {};

const ERROR_URL = 'https://bananojs.coranos.cc/api';

// variables
let url = ERROR_URL;
let app;
let useLedgerFlag = false;

// functions
const getErrorUrl = () => {
  return ERROR_URL;
};

const isErrorUrl = () => {
  return url == ERROR_URL;
};

const setApp = (_app) => {
  app = _app;
  // setLocalWorkApi();
};

const setUseRateLimit = (flag) => {
  return bananojs.setUseRateLimit(flag);
};

const setLocalWorkApi = () => {
  const localWorkApi = {};

  localWorkApi.getBlockCount = () => {
    mainConsole.log('localWorkApi','getBlockCount');
    return bananojs.realBananodeApi.getBlockCount();
  }
  localWorkApi.getGeneratedWork = (hash) => {
    mainConsole.log('localWorkApi','getGeneratedWork', 'hash', hash);
    const workBytes = bananojs.getZeroedWorkBytes();
    const work = bananojs.getWorkUsingCpu(hash, workBytes);
    mainConsole.log('localWorkApi','getGeneratedWork', 'hash', hash, 'work', work);
    return work;
  }


  localWorkApi.setUrl = bananojs.realBananodeApi.setUrl;
  localWorkApi.delay = bananojs.realBananodeApi.delay;
  localWorkApi.setModuleRef = bananojs.realBananodeApi.setModuleRef;
  localWorkApi.getModuleRef = bananojs.realBananodeApi.getModuleRef;
  localWorkApi.setLogRequestErrors = bananojs.realBananodeApi.setLogRequestErrors;
  localWorkApi.setUseRateLimit = bananojs.realBananodeApi.setUseRateLimit;
  localWorkApi.getFrontiers = bananojs.realBananodeApi.getFrontiers;
  localWorkApi.getBlockAccount = bananojs.realBananodeApi.getBlockAccount;
  localWorkApi.getAccountsPending = bananojs.realBananodeApi.getAccountsPending;
  localWorkApi.getAccountBalanceRaw = bananojs.realBananodeApi.getAccountBalanceRaw;
  localWorkApi.getAccountBalanceAndPendingRaw = bananojs.realBananodeApi.getAccountBalanceAndPendingRaw;
  localWorkApi.getAccountsBalances = bananojs.realBananodeApi.getAccountsBalances;
  localWorkApi.getAccountRepresentative = bananojs.realBananodeApi.getAccountRepresentative;
  localWorkApi.getPrevious = bananojs.realBananodeApi.getPrevious;
  localWorkApi.process = bananojs.realBananodeApi.process;
  localWorkApi.getAccountHistory = bananojs.realBananodeApi.getAccountHistory;
  localWorkApi.getAccountInfo = bananojs.realBananodeApi.getAccountInfo;
  localWorkApi.getBlocks = bananojs.realBananodeApi.getBlocks;
  localWorkApi.sendRequest = bananojs.realBananodeApi.sendRequest;
  localWorkApi.log = bananojs.realBananodeApi.log;
  localWorkApi.trace = bananojs.realBananodeApi.trace;
  localWorkApi.setAuth = bananojs.realBananodeApi.setAuth;
  
  bananojs.setBananodeApi(localWorkApi);
}

const setBananodeApiUrl = (rpcUrl) => {
  if (rpcUrl) {
    url = rpcUrl;
    return bananojs.setBananodeApiUrl(rpcUrl);
  } else {
    throw Error('rpcUrl is undefined or null.');
  }
};

const getAccountHistory = async (account, count, head, raw) => {
  try {
    if (isErrorUrl()) {
      throw Error('getAccountHistory');
    }
    return await bananojs.getAccountHistory(account, count, head, raw);
  } catch (error) {
    app.showAlert('error getting account history:' + error.message);
    return [];
  }
};

const getPrivateKey = async (seed, seedIx) => {
  try {
    if (isErrorUrl()) {
      throw Error('getPrivateKey');
    }
    // mainConsole.trace('getting account history', 'seedIx', seedIx);
    if (useLedgerFlag) {
      return await bananojsHw.getLedgerAccountSigner(seedIx);
    } else {
      return bananojs.getPrivateKey(seed, seedIx);
    }
  } catch (error) {
    // mainConsole.trace('error getting account history', 'seedIx', seedIx, error.message);
    app.showAlert('error getting account history:' + error.message);
    return undefined;
  }
};

const getPublicKey = async (privateKey) => {
  return await bananojs.getPublicKey(privateKey);
};

const getAccount = (publicKey) => {
  return bananojs.getBananoAccount(publicKey);
};

const getRawStrFromBananoStr = (amountBananos) => {
  return bananojs.getRawStrFromBananoStr(amountBananos);
};

const getAccountsPending = async (account, count, source) => {
  try {
    if (isErrorUrl()) {
      throw Error('getAccountsPending');
    }
    return await bananojs.getAccountsPending(account, count, source);
  } catch (error) {
    app.showAlert('error getting account pending:' + error.message);
    return [];
  }
};

const getAccountPublicKey = (account) => {
  return bananojs.getAccountPublicKey(account);
};

const getCamoAccount = (camoPublicKey) => {
  return bananojs.getCamoAccount(camoPublicKey);
};

const getCamoPublicKey = (privateKey) => {
  return bananojs.getCamoPublicKey(privateKey);
};

const changeBananoRepresentativeForSeed = async (seed, seedIx, representative) => {
  try {
    if (isErrorUrl()) {
      throw Error('changeBananoRepresentativeForSeed');
    }
    return await bananojs.changeBananoRepresentativeForSeed(seed, seedIx, representative);
  } catch (error) {
    app.showAlert('error changing rep:' + error.message);
    return;
  }
};

const camoSendWithdrawalFromSeed = async (seed, sendFromSeedIx, sendToAccount, sendAmount) => {
  try {
    if (isErrorUrl()) {
      throw Error('camoSendWithdrawalFromSeed');
    }
    return await bananojs.camoBananoSendWithdrawalFromSeed(seed, sendFromSeedIx, sendToAccount, sendAmount);
  } catch (error) {
    app.showAlert('error camo send withdrawal:' + error.message);
    return;
  }
};

const sendWithdrawalFromSeed = async (seed, sendFromSeedIx, sendToAccount, sendAmount) => {
  try {
    if (isErrorUrl()) {
      throw Error('sendWithdrawalFromSeed');
    }
    if (useLedgerFlag) {
      const config = bananojsHw.getConfig();
      bananojs.bananodeApi.setUrl(config.bananodeUrl);
      const accountSigner = await bananojsHw.getLedgerAccountSigner(sendFromSeedIx);
      try {
        const amountRaw = bananojs.getBananoDecimalAmountAsRaw(sendAmount);
        const response = await bananojs.bananoUtil.sendFromPrivateKey(bananojs.bananodeApi, accountSigner, sendToAccount, amountRaw, config.prefix);
        console.log('banano sendbanano response', response);
        return response;
      } catch (error) {
        console.log('banano sendbanano error', error.message);
        return error.message;
      }
    } else {
      return await bananojs.sendBananoWithdrawalFromSeed(seed, sendFromSeedIx, sendToAccount, sendAmount);
    }
  } catch (error) {
    app.showAlert('error send withdrawal:' + error.message);
    return;
  }
};

const getBananoPartsFromRaw = (amount) => {
  return bananojs.getBananoPartsFromRaw(amount);
};

const getAccountInfo = async (account, representativeFlag) => {
  try {
    if (isErrorUrl()) {
      throw Error('getAccountInfo');
    }
    return await bananojs.getAccountInfo(account, representativeFlag);
  } catch (error) {
    app.showAlert('error:' + error.message);
    const retval = {};
    retval.error = 'Error Testnet Selected';
    return retval;
  };
};

const getBlockCount = async () => {
  try {
    if (isErrorUrl()) {
      throw Error('getBlockCount');
    }
    return await bananojs.getBlockCount();
  } catch (error) {
    app.showAlert('error get block count:' + error.message);
    const retval = {};
    retval.count = -1;
    return retval;
  }
};

const getCamoAccountValidationInfo = (camoAccount) => {
  return bananojs.getCamoAccountValidationInfo(camoAccount);
};

const getAccountValidationInfo = (banAccount) => {
  return bananojs.getBananoAccountValidationInfo(banAccount);
};

const getCamoSharedAccountData = async (seed, seedIx, sendToAccount, sharedSeedIx) => {
  try {
    if (isErrorUrl()) {
      throw Error('getCamoSharedAccountData');
    }
    if (useLedgerFlag) {
      app.showAlert('cannot use camo with ledger.');
    } else {
      return await bananojs.getCamoBananoSharedAccountData(seed, seedIx, sendToAccount, sharedSeedIx);
    }
  } catch (error) {
    app.showAlert('error getting camo shared acount data:' + error.message);
    return;
  }
};

const camoGetAccountsPending = async (seed, seedIx, sendToAccount, sharedSeedIx, count) => {
  try {
    if (isErrorUrl()) {
      throw Error('camoGetAccountsPending');
    }
    if (useLedgerFlag) {
      app.showAlert('cannot use camo with ledger.');
    } else {
      return await bananojs.camoBananoGetAccountsPending(seed, seedIx, sendToAccount, sharedSeedIx, count);
    }
  } catch (error) {
    app.showAlert('error get account pending:' + error.message);
    return;
  }
};

const receiveCamoDepositsForSeed = async (seed, seedIx, sendToAccount, sharedSeedIx, hash) => {
  try {
    if (isErrorUrl()) {
      throw Error('receiveCamoDepositsForSeed');
    }
    if (useLedgerFlag) {
      app.showAlert('cannot use camo with ledger.');
    } else {
      return await bananojs.receiveCamoBananoDepositsForSeed(seed, seedIx, sendToAccount, sharedSeedIx, hash);
    }
  } catch (error) {
    app.showAlert('error receive camo deposit:' + error.message);
    return;
  }
};

const receiveDepositsForSeed = async (seed, seedIx, representative, hash) => {
  try {
    if (isErrorUrl()) {
      throw Error('receiveDepositsForSeed');
    }

    if (useLedgerFlag) {
      const accountSigner = await bananojsHw.getLedgerAccountSigner(seedIx);
      const account = accountSigner.getAccount();
      let representative = await bananojs.bananodeApi.getAccountRepresentative(account);
      if (!(representative)) {
        representative = account;
      }
      try {
        const config = bananojsHw.getConfig();
        const response = await bananojs.depositUtil.receive(bananojs.loggingUtil, bananojs.bananodeApi, account, accountSigner, representative, hash, config.prefix);
        console.log('banano receive response', JSON.stringify(response));
        return response;
      } catch (error) {
        console.trace( error);
      }
    } else {
      return await bananojs.receiveBananoDepositsForSeed(seed, seedIx, representative, hash);
    }
  } catch (error) {
    app.showAlert('error receive deposit:' + error.message);
    return;
  }
};

const getLedgerInfo = async () => {
  try {
    if (isErrorUrl()) {
      throw Error('getLedgerInfo');
    }
    return await bananojsHw.getLedgerInfo();
  } catch (error) {
    // mainConsole.trace('getLedgerInfo', error);
    app.showAlert('error getting ledger info:' + error.message);
    return;
  }
};

const setUseLedgerFlag = (_useLedgerFlag) => {
  useLedgerFlag = _useLedgerFlag;
};

exports.setUseRateLimit = setUseRateLimit;
exports.setUseLedgerFlag = setUseLedgerFlag;
exports.getLedgerInfo = getLedgerInfo;
exports.getRawStrFromBananoStr = getRawStrFromBananoStr;
exports.setBananodeApiUrl = setBananodeApiUrl;
exports.getAccountHistory = getAccountHistory;
exports.getAccountsPending = getAccountsPending;
exports.getPrivateKey = getPrivateKey;
exports.getPublicKey = getPublicKey;
exports.getAccount = getAccount;
exports.getErrorUrl = getErrorUrl;
exports.getCamoAccountValidationInfo = getCamoAccountValidationInfo;
exports.getAccountValidationInfo = getAccountValidationInfo;
exports.getAccountPublicKey = getAccountPublicKey;
exports.getCamoAccount = getCamoAccount;
exports.getCamoPublicKey = getCamoPublicKey;
exports.getAccountInfo = getAccountInfo;
exports.getBlockCount = getBlockCount;
exports.getBananoPartsFromRaw = getBananoPartsFromRaw;
exports.changeBananoRepresentativeForSeed = changeBananoRepresentativeForSeed;
exports.camoSendWithdrawalFromSeed = camoSendWithdrawalFromSeed;
exports.sendWithdrawalFromSeed = sendWithdrawalFromSeed;
exports.getCamoSharedAccountData = getCamoSharedAccountData;
exports.camoGetAccountsPending = camoGetAccountsPending;
exports.receiveCamoDepositsForSeed = receiveCamoDepositsForSeed;
exports.receiveDepositsForSeed = receiveDepositsForSeed;
exports.setApp = setApp;
