'use strict';

/** imports */
const crypto = require('crypto');

const mainConsoleLib = require('console');

const bananojs = require('@bananocoin/bananojs');

/** https://github.com/sindresorhus/electron-store */
const Store = require('electron-store');
const Conf = require('conf');

/** modules */
const mainConsole = new mainConsoleLib.Console(process.stdout, process.stderr);
mainConsole.debug = () => {};

/** global constants */
// https://github.com/sindresorhus/electron-store
const storeEncryptionKeyPrefix = 'f9e234cf2dee0dc6ad62c91589ef770ab808e2b29443721b1893c07686a9c175';

const SEED_LENGTH = 64;

const LOG_LEDGER_POLLING = false;

const ACCOUNT_HISTORY_SIZE = 20;

/** networks */
const NETWORKS = [{
  NAME: 'Kalium Mainnet',
  EXPLORER: 'https://creeper.banano.cc/',
  RPC_URL: 'https://kaliumapi.appditto.com/api',
}];

const sendToAccountStatuses = ['No Send-To Account Requested Yet'];

const sendToAccountLinks = [];

const parsedTransactionHistoryByAccount = [];

const pendingBlocks = [];

const camoPendingBlocks = [];

/** global variables */
let currentNetworkIx = 0;

let appDocument = undefined;

let appClipboard = undefined;

let renderApp = undefined;

const ledgerDeviceInfo = undefined;

let seed = undefined;

const accountData = [];

let sendAmount = '';

let useCamo = undefined;

const camoSharedAccountData = {};

const accountBook = [];

let isLoggedIn = false;

let useLedgerFlag = false;

let generatedSeedHex = undefined;

let balanceStatus = 'No Balance Requested Yet';

let transactionHistoryStatus = 'No History Requested Yet';

let blockchainStatus = 'No Blockchain State Requested Yet';

let pleaseWaitStatus = '';

const blockchainState = {
  count: 0,
};

/** initialization */
mainConsole.log('Console Logging Enabled.');

/** functions */

const getCleartextConfig = () => {
  const conf = new Conf({
    projectName: 'camo-banano-light-wallet',
    configName: 'cleartext-config',
    clearInvalidConfig: false,
  });
  return conf;
};

const init = () => {
  const conf = getCleartextConfig();
  // mainConsole.log('getCleartextConfig', conf);
  if (conf.has('useCamo')) {
    useCamo = conf.get('useCamo');
  } else {
    useCamo = false;
  }
  accountBook.length = 0;
  if (conf.has('accountBook')) {
    const book = conf.get('accountBook');
    book.forEach((bookAccount) => {
      accountBook.push(bookAccount);
    });
  }
};

const getCamoRepresentative = () => {
  if (seed == undefined) {
    return undefined;
  }
  const privateKey = bananojs.getPrivateKey(seed, 0);
  const camoPublicKey = bananojs.getCamoPublicKey(privateKey);
  return bananojs.getCamoAccount(camoPublicKey);
};

const setUseCamo = async (_useCamo) => {
  useCamo = _useCamo;
  const store = getCleartextConfig();
  store.set('useCamo', useCamo);
  // alert(`useCamo:${useCamo}`);
  await renderApp();
  await requestCamoSharedAccount();
  await requestCamoSharedAccountBalance();
  renderApp();
  await requestCamoPending();
  renderApp();
};

const updateCamoSharedAccount = async () => {
  await requestCamoSharedAccount();
  await requestCamoSharedAccountBalance();
  await requestCamoPending();
  renderApp();
};

const getUseCamo = () => {
  return useCamo;
};

const getCurrentNetwork = () => {
  return NETWORKS[currentNetworkIx];
};

const getTransactionHistoryUrl = (account) => {
  const url = `${getCurrentNetwork().EXPLORER}/explorer/account/${account}/history`;
  // console.log('getTransactionHistoryUrl',url);
  return url;
};

const getTransactionHistoryLink = (txid) => {
  throw new Error('getTransactionHistoryLink not implemented completely');
};

const getRpcUrl = () => {
  return getCurrentNetwork().RPC_URL;
};

const formatDate = (date) => {
  let month = (date.getMonth() + 1).toString();
  let day = date.getDate().toString();
  const year = date.getFullYear();

  if (month.length < 2) {
    month = '0' + month;
  };
  if (day.length < 2) {
    day = '0' + day;
  };

  return [year, month, day].join('-');
};

const requestAllBlockchainData = async () => {
  await requestTransactionHistory();
  await requestBalanceAndRepresentative();
  await requestBlockchainState();
  await requestPending();
  await requestCamoSharedAccount();
  await requestCamoSharedAccountBalance();
  await requestCamoPending();
};

const changeNetwork = async (event) => {
  currentNetworkIx = event.target.value;
  await requestAllBlockchainData();
  renderApp();
};

const postJson = (url, jsonString, readyCallback, errorCallback) => {
  const xmlhttp = new XMLHttpRequest(); // new HttpRequest instance

  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      // sendToAccountStatuses.push( `XMLHttpRequest: status:${this.status} response:'${this.response}'` );
      if (this.status == 200) {
        readyCallback(JSON.parse(this.response));
      } else {
        errorCallback(this.response);
      }
    }
  };
  xhttp.responseType = 'text';
  xhttp.open('POST', url, true);
  xhttp.setRequestHeader('Content-Type', 'application/json');

  // sendToAccountStatuses.push( `XMLHttpRequest: curl ${url} -H "Content-Type: application/json" -d '${jsonString}'` );

  xhttp.send(jsonString);
};

const getJson = (url, readyCallback, errorCallback) => {
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        readyCallback(JSON.parse(this.response));
      } else {
        errorCallback({
          'status': this.status,
          'statusText': this.statusText,
          'response': this.response,
        });
      }
    }
  };
  xhttp.responseType = 'text';
  xhttp.open('GET', url, true);
  xhttp.send();
};

const get = (id) => {
  const elt = appDocument.getElementById(id);
  if (elt == null) {
    throw new Error('elt is null:' + id);
  }
  return elt;
};

const hide = (id) => {
  get(id).style = 'display:none;';
};

const show = (id) => {
  get(id).style = 'display:default;';
};

const getPublicKeyFromLedger = () => {
  throw new Error('getPublicKeyFromLedger not completely implemented.');
  useLedgerFlag = true;
  isLoggedIn = true;
};

const requestBlockchainDataAndShowHome = async () => {
  if (accountData.length == 0) {
    return;
  }
  bananojs.setBananodeApiUrl(getRpcUrl());
  await requestAllBlockchainData();
  showHome();
};

const setAccountDataFromSeed = async () => {
  bananojs.setBananodeApiUrl(getRpcUrl());
  let hasMoreHistory = true;
  let seedIx = 0;
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

const getAccountDataFromSeed = async () => {
  useLedgerFlag = false;
  isLoggedIn = true;
  show('seed');
  const seedElt = appDocument.getElementById('seed');
  if (seedElt.value.length != SEED_LENGTH) {
    alert(`seed must be a hex encoded string of length ${SEED_LENGTH}, not ${seedElt.value.length}`);
    return;
  }
  seed = seedElt.value;

  const storeSeedElt = appDocument.getElementById('storeSeed');
  const storeSeed = storeSeedElt.checked;
  const storeSeedPasswordElt = appDocument.getElementById('storeSeedPassword');
  const storeSeedPassword = storeSeedPasswordElt.value;
  // alert(`storeSeed:${storeSeed} storeSeedPassword:${storeSeedPassword} `);

  if (storeSeed) {
    const store = new Store({
      encryptionKey: `${storeEncryptionKeyPrefix}${storeSeedPassword}`,
    });
    store.set('seed', seed);
  }

  await setAccountDataFromSeed();
  await requestBlockchainDataAndShowHome();
};

const updatePleaseWaitStatus = (status) => {
  pleaseWaitStatus = status;
  if (status == undefined) {
    hide('please-wait');
  } else {
    show('please-wait');
  }
  renderApp();
};

const reuseSeed = async () => {
  updatePleaseWaitStatus('opening secure storage.');
  const reuseSeedPasswordElt = appDocument.getElementById('reuseSeedPassword');
  const reuseSeedPassword = reuseSeedPasswordElt.value;
  try {
    const store = new Store({
      encryptionKey: `${storeEncryptionKeyPrefix}${reuseSeedPassword}`,
      clearInvalidConfig: false,
    });
    seed = store.get('seed');

    useLedgerFlag = false;
    isLoggedIn = true;
    show('seed');
    updatePleaseWaitStatus('getting account data.');
    await setAccountDataFromSeed();
    updatePleaseWaitStatus('getting blockchain data.');
    await requestBlockchainDataAndShowHome();
  } catch (error) {
    console.trace(error);
    alert('cannot open seed storage, check that password is correct.');
  }
};

const clearSendData = () => {
  mainConsole.debug('STARTED clearSendData');
  const sendAmountElt = appDocument.getElementById('sendAmount');
  const sendToAccountElt = appDocument.getElementById('sendToAccount');
  sendAmountElt.value = '';

  if (sendToAccountElt) {
    if (getUseCamo()) {
      const accountBook = getAccountBook();
      if (accountBook[0]) {
        sendToAccountElt.value = accountBook[0].camoAccount;
      } else {
        sendToAccountElt.value = '';
      }
    } else {
      sendToAccountElt.value = '';
    }
  }
  sendAmount = '';
  sendToAccountStatuses.length = 0;
  sendToAccountLinks.length = 0;
  mainConsole.debug('SUCCESS clearSendData');
};

const updateRepresentative = async () => {
  mainConsole.debug('STARTED updateRepresentative');
  const newRepresentativeElt = appDocument.getElementById('newRepresentative');
  const newRepresentative = newRepresentativeElt.value;
  mainConsole.debug('STARTED updateRepresentative newRepresentative',
      newRepresentative);
  const newRepPublicKey = bananojs.getAccountPublicKey(newRepresentative);
  mainConsole.debug('STARTED updateRepresentative newRepPublicKey',
      newRepPublicKey);
  const newBanRepresentative = bananojs.getAccount(newRepPublicKey);
  mainConsole.debug('STARTED updateRepresentative newBanRepresentative',
      newBanRepresentative);
  await bananojs.changeRepresentativeForSeed(seed, 0, newBanRepresentative);
};

const updateAmount = () => {
  const sendAmountElt = appDocument.getElementById('sendAmount');

  sendAmount = sendAmountElt.value;
  if (Number.isNaN(sendAmount)) {
    throw new Error(`sendAmount ${sendAmount} is not a number`);
  }
};

const updateAmountAndRenderApp = () => {
  updateAmount();
  renderApp();
};

const sendAmountToAccount = async () => {
  updatePleaseWaitStatus('sending amount to account.');
  updateAmount();

  const sendToAccountElt = appDocument.getElementById('sendToAccount');

  const sendToAccount = sendToAccountElt.value;

  const sendFromSeedIxElt = appDocument.getElementById('sendFromSeedIx');
  const sendFromSeedIx = parseInt(sendFromSeedIxElt.value);
  if (Number.isNaN(sendFromSeedIx)) {
    throw new Error(`sendFromSeedIx ${sendFromSeedIx} is not a number`);
  }

  if (Number.isNaN(sendAmount)) {
    throw new Error(`sendAmount ${sendAmount} is not a number`);
  }

  let message = undefined;
  try {
    if (useCamo) {
      const messageSuffix = await bananojs.camoSendWithdrawalFromSeed(seed, sendFromSeedIx, sendToAccount, sendAmount);
      message = `Camo Tx Hash ${messageSuffix}`;
    } else {
      const messageSuffix = await bananojs.sendWithdrawalFromSeed(seed, sendFromSeedIx, sendToAccount, sendAmount);
      message = `Banano Tx Hash ${messageSuffix}`;
    }
  } catch (error) {
    message = 'error:' + JSON.stringify(error);
  }

  mainConsole.log('sendAmountToAccount', message);
  sendToAccountStatuses.push(message);
  updatePleaseWaitStatus();
  alert(message);
  renderApp();
};

const getTransactionHistoryByAccount = () => {
  return parsedTransactionHistoryByAccount;
};

const requestTransactionHistory = async () => {
  updatePleaseWaitStatus('getting transaction history.');
  bananojs.setBananodeApiUrl(getRpcUrl());
  parsedTransactionHistoryByAccount.length = 0;
  for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
    const accountDataElt = accountData[accountDataIx];
    const account = accountDataElt.account;
    const accountHistory = await bananojs.getAccountHistory(account, ACCOUNT_HISTORY_SIZE);
    // mainConsole.log('requestTransactionHistory', account, accountHistory);
    // transactionHistoryStatus = accountHistory;
    // mainConsole.log(transactionHistoryStatus);
    const parsedTransactionHistoryByAccountElt = {};
    parsedTransactionHistoryByAccountElt.account = account;
    parsedTransactionHistoryByAccount.push(parsedTransactionHistoryByAccountElt);

    if (accountHistory.history) {
      accountHistory.history.forEach((historyElt, ix) => {
        const parsedTransactionHistoryElt = {};
        parsedTransactionHistoryElt.type = historyElt.type;
        parsedTransactionHistoryElt.n = ix + 1;
        parsedTransactionHistoryElt.value = bananojs.getBananoPartsFromRaw(historyElt.amount).banano;
        parsedTransactionHistoryElt.txHash = historyElt.hash;
        parsedTransactionHistoryElt.txDetailsUrl = 'https://creeper.banano.cc/explorer/block/' + historyElt.hash;
        parsedTransactionHistoryByAccount.push(parsedTransactionHistoryElt);
      });
    }
  }
  updatePleaseWaitStatus();
  // mainConsole.log('parsedTransactionHistoryByAccount', parsedTransactionHistoryByAccount);
  renderApp();
};

const requestBalanceAndRepresentative = async () => {
  updatePleaseWaitStatus('getting account info.');
  bananojs.setBananodeApiUrl(getRpcUrl());
  for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
    const accountDataElt = accountData[accountDataIx];
    const account = accountDataElt.account;
    const accountInfo = await bananojs.getAccountInfo(account, true);
    balanceStatus = JSON.stringify(accountInfo);
    mainConsole.debug('requestBalanceAndRepresentative', accountInfo);
    if (accountInfo.error) {
      balanceStatus = accountInfo.error;
      accountDataElt.representative = account;
      accountDataElt.balance = undefined;
    } else {
      balanceStatus = 'Success';
      accountDataElt.balance = bananojs.getBananoPartsFromRaw(accountInfo.balance).banano;
      accountDataElt.representative = accountInfo.representative;
    }
  }
  updatePleaseWaitStatus();
  renderApp();
};

const requestBlockchainState = async () => {
  updatePleaseWaitStatus('getting blockchain state.');
  const blockCount = await bananojs.getBlockCount();
  blockchainState.count = blockCount.count;
  blockchainStatus = 'Success';
  mainConsole.debug('blockchainState', blockchainState);
  updatePleaseWaitStatus();
  renderApp();
};

const removeClass = (id, cl) => {
  get(id).classList.remove(cl);
};

const addClass = (id, cl) => {
  get(id).classList.add(cl);
};

const selectButton = (id) => {
  addClass(id, 'white_on_light_purple');
  removeClass(id, 'white_on_purple_with_hover');
};

const clearButtonSelection = (id) => {
  removeClass(id, 'white_on_light_purple');
  addClass(id, 'white_on_purple_with_hover');
};

const hideEverything = () => {
  clearButtonSelection('send');
  clearButtonSelection('home');
  clearButtonSelection('receive');
  clearButtonSelection('transactions');
  clearButtonSelection('representatives');
  clearButtonSelection('accounts');
  hide('seed-reuse');
  hide('seed-reuse-entry');
  hide('seed-entry');
  hide('cancel-confirm-transaction');
  hide('to-account');
  hide('to-account-is-camo');
  hide('send-amount');
  hide('from-account');
  hide('transaction-list-small');
  hide('transaction-list-large');
  hide('your-account');
  hide('your-representative');
  hide('update-representative');
  hide('pending');
  hide('seed-login');
  hide('ledger-login');
  hide('camo-banano-branding');
  hide('send-spacer-01');
  hide('private-key-generate');
  hide('private-key-generator');
  hide('account-book');
  hide('please-wait');
};

const copyToClipboard = () => {
  appClipboard.writeText(generatedSeedHex);
  alert(`copied to clipboard:\n${generatedSeedHex}`);
};

const showLogin = () => {
  clearGlobalData();
  hideEverything();
  clearSendData();
  show('seed-login');
  show('seed-reuse');
  // show('ledger-login');
  show('camo-banano-branding');
  show('private-key-generate');
};

const showHome = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('transaction-list-small');
  show('your-account');
  show('your-representative');
  show('camo-banano-branding');
  selectButton('home');
};

const showSend = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('from-account');
  show('send-amount');
  show('to-account');
  show('to-account-is-camo');
  show('cancel-confirm-transaction');
  selectButton('send');
};

const cancelSend = () => {
  const sendToAccountElt = appDocument.getElementById('sendToAccount');
  const sendAmountElt = appDocument.getElementById('sendAmount');

  sendToAccountElt.value = '';
  sendAmountElt.value = '';

  sendAmount = '';

  showSend();
};

const showReceive = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('your-account');
  show('your-representative');
  show('pending');
  selectButton('receive');
};

const showTransactions = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('transaction-list-large');
  selectButton('transactions');
};

const showRepresentatives = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('your-representative');
  show('update-representative');
  selectButton('representatives');
};

const showAccountBook = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('account-book');
  selectButton('accounts');
};

const getAccountAsCamoAccount = (banAccount) => {
  if (banAccount) {
    const publicKey = bananojs.getAccountPublicKey(banAccount);
    const camoAccount = bananojs.getCamoAccount(publicKey);
    return camoAccount;
  }
};

const getAccountBook = () => {
  const book = [];

  accountData.forEach((accountDataElt) => {
    book.push({
      readOnly: true,
      n: book.length,
      account: accountDataElt.account,
      balance: accountDataElt.balance,
      seedIx: accountDataElt.seedIx,
      camoAccount: getAccountAsCamoAccount(accountDataElt.account),
    });
  });
  accountBook.forEach((bookAccount) => {
    book.push({
      readOnly: false,
      n: book.length,
      account: bookAccount,
      balance: undefined,
      seedIx: undefined,
      camoAccount: getAccountAsCamoAccount(bookAccount),
    });
  });
  return book;
};

const deleteAccountFromBook = (ix) => {
  const bookAccount = accountBook[ix];
  const confirmDelete = confirm(`Delete ${bookAccount}`);
  if (confirmDelete) {
    accountBook.splice(ix, 1);
    const store = getCleartextConfig();
    store.set('accountBook', accountBook);
    renderApp();
  }
};

const addAccountToBook = () => {
  const newBookAccountElt = get('newBookAccount');
  const newBookAccount = newBookAccountElt.value;
  accountBook.push(newBookAccount);
  const store = getCleartextConfig();
  store.set('accountBook', accountBook);
  renderApp();
};

const showSeedEntry = () => {
  hideEverything();
  clearSendData();
  show('seed-entry');
};

const showGenerateNewSeed = () => {
  hideEverything();
  clearSendData();
  show('private-key-generator');
  generatedSeedHex = crypto.randomBytes(32).toString('hex');
  renderApp();
};

const clearGlobalData = () => {
  get('seed').value = '';
  get('reuseSeedPassword').value = '';
  get('storeSeedPassword').value = '';
  get('storeSeed').checked = false;

  accountData.length = 0;

  useLedgerFlag = false;
  generatedSeedHex = undefined;
  seed = undefined;

  sendAmount = '';

  sendToAccountStatuses.length = 0;
  sendToAccountLinks.length = 0;
  sendToAccountStatuses.push('No Send-To Transaction Requested Yet');

  balanceStatus = 'No Balance Requested Yet';

  transactionHistoryStatus = 'No History Requested Yet';
  parsedTransactionHistoryByAccount.length = 0;

  pendingBlocks.length = 0;
  camoPendingBlocks.length = 0;

  renderApp();
};

const setRenderApp = (_renderApp) => {
  renderApp = _renderApp;
};

const setAppDocument = (_document) => {
  appDocument = _document;
};

const getLedgerMessage = () => {
  let message = '';
  if (LOG_LEDGER_POLLING) {
    mainConsole.log('LedgerMessage', ledgerDeviceInfo);
  }
  if (ledgerDeviceInfo) {
    if (ledgerDeviceInfo.error) {
      message += 'Error:';
      if (ledgerDeviceInfo.message) {
        message += ledgerDeviceInfo.message;
      }
    } else {
      if (ledgerDeviceInfo.message) {
        message += ledgerDeviceInfo.message;
      }
    }
  }
  return message;
};

const getAccountNoHistory = () => {
  for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
    const accountDataElt = accountData[accountDataIx];
    if (!accountDataElt.hasHistory) {
      return accountDataElt.account;
    }
  }
};

const getAccountZero = () => {
  if (accountData.length > 0) {
    return accountData[0].account;
  }
};

const getGeneratedSeedHex = () => {
  return generatedSeedHex;
};

const setAppClipboard = (clipboard) => {
  appClipboard = clipboard;
};

const getBalanceStatus = () => {
  return balanceStatus;
};

const getBlockchainState = () => {
  return blockchainState;
};

const getSendAmount = () => {
  return sendAmount;
};

const showSeedReuse = () => {
  hideEverything();
  clearSendData();
  show('seed-reuse-entry');
};

const getCamoSharedAccountData = () => {
  return camoSharedAccountData;
};

const requestCamoSharedAccount = async () => {
  updatePleaseWaitStatus('getting camo shared account.');
  const sendToAccountElt = appDocument.getElementById('sendToAccount');
  const sendToAccount = sendToAccountElt.value;
  mainConsole.debug('requestCamoSharedAccount sendToAccount', sendToAccount);
  camoSharedAccountData.account = '';
  if (seed) {
    if (sendToAccount) {
      const sharedSeedIx = 0;
      const newCamoSharedAccountData = await bananojs.getCamoSharedAccountData(seed, 0, sendToAccount, sharedSeedIx);
      camoSharedAccountData.account = newCamoSharedAccountData.sharedAccount;
      camoSharedAccountData.seed = newCamoSharedAccountData.sharedSeed;
      camoSharedAccountData.seedIx = sharedSeedIx;
      camoSharedAccountData.privateKey = newCamoSharedAccountData.sharedPrivateKey;
      camoSharedAccountData.publicKey = newCamoSharedAccountData.sharedPublicKey;
      mainConsole.debug('requestCamoSharedAccount camoSharedAccountData', camoSharedAccountData);
    }
  }
  // mainConsole.trace('requestCamoSharedAccount');
  updatePleaseWaitStatus();
};

const requestCamoSharedAccountBalance = async () => {
  updatePleaseWaitStatus('getting camo shared account balance.');
  mainConsole.debug('requestCamoSharedAccountBalance camoSharedAccountData', camoSharedAccountData);
  if (camoSharedAccountData.account) {
    if (camoSharedAccountData.account.length > 0) {
      const accountInfo = await bananojs.getAccountInfo(camoSharedAccountData.account, true);
      balanceStatus = JSON.stringify(accountInfo);
      mainConsole.debug('requestCamoSharedAccountBalance accountInfo', accountInfo);
      if (accountInfo.error) {
        balanceStatus = accountInfo.error;
        camoSharedAccountData.representative = camoSharedAccountData.account;
        camoSharedAccountData.balance = undefined;
      } else {
        balanceStatus = 'Success';
        camoSharedAccountData.balance = bananojs.getBananoPartsFromRaw(accountInfo.balance).banano;
        camoSharedAccountData.representative = accountInfo.representative;
      }
    }
  }
  updatePleaseWaitStatus();
};

const receiveCamoPending = async (seedIx, sendToAccount, hash) => {
  mainConsole.debug('receiveCamoPending seedIx', seedIx, sendToAccount, hash);
  try {
    const response = await bananojs.receiveCamoDepositsForSeed(seed, seedIx, sendToAccount, hash);
    alert(JSON.stringify(response));
  } catch (error) {
    alert(JSON.stringify(error));
    mainConsole.debug('receiveCamoPending error', error);
  }
};

const requestCamoPending = async () => {
  updatePleaseWaitStatus('getting camo pending.');
  camoPendingBlocks.length = 0;

  const accountBook = getAccountBook();
  for (let accountBookIx = 0; accountBookIx < accountBook.length; accountBookIx++) {
    const accountBookElt = accountBook[accountBookIx];
    const sendToAccount = accountBookElt.camoAccount;
    if (sendToAccount) {
      mainConsole.debug('requestCamoPending sendToAccount', sendToAccount);

      for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
        const accountDataElt = accountData[accountDataIx];
        mainConsole.debug('requestCamoPending request', seed, accountDataElt.seedIx, sendToAccount);
        const response = await bananojs.camoGetAccountsPending(seed, accountDataElt.seedIx, sendToAccount, 0, 10);
        mainConsole.debug('requestCamoPending response', response);
        if (response) {
          if (response.blocks) {
            const responseAccounts = [...Object.keys(response.blocks)];
            responseAccounts.forEach((responseAccount) => {
              const hashMap = response.blocks[responseAccount];
              if (hashMap) {
                const hashes = [...Object.keys(hashMap)];
                hashes.forEach((hash) => {
                  const raw = hashMap[hash];
                  const bananoParts = bananojs.getBananoPartsFromRaw(raw);
                  const camoPendingBlock = {};
                  camoPendingBlock.n = camoPendingBlocks.length + 1;
                  camoPendingBlock.hash = hash;
                  camoPendingBlock.banano = bananoParts.banano;
                  camoPendingBlock.banoshi = bananoParts.banoshi;
                  camoPendingBlock.raw = bananoParts.raw;
                  camoPendingBlock.totalRaw = raw;
                  camoPendingBlock.detailsUrl = 'https://creeper.banano.cc/explorer/block/' + hash;
                  camoPendingBlock.seedIx = accountDataElt.seedIx;
                  camoPendingBlock.sendToAccount = sendToAccount;
                  camoPendingBlocks.push(camoPendingBlock);
                });
              }
            });
          }
        }
        mainConsole.debug('requestCamoPending camoPendingBlocks', camoPendingBlocks);
      }
    }
  }
  updatePleaseWaitStatus();
  renderApp();
};

const getPending = () => {
  return pendingBlocks;
};

const getCamoPending = () => {
  return camoPendingBlocks;
};

const receivePending = async (hash, seedIx) => {
  const representative = getAccountRepresentative();
  if (representative) {
    const response = await bananojs.receiveDepositsForSeed(seed, seedIx, representative, hash);
    mainConsole.debug('receivePending receiveDepositsForSeed', response);
    alert(JSON.stringify(response));
  } else {
    alert('no representative, cannot receive pending.');
  }
};

const getAccountRepresentative = () => {
  if (accountData.length > 0) {
    return accountData[0].representative;
  }
};


const getCamoAccount = () => {
  if (seed == undefined) {
    return undefined;
  }
  if (accountData.length > 0) {
    return bananojs.getCamoAccount(accountData[0].publicKey);
  }
};

const requestPending = async () => {
  updatePleaseWaitStatus('getting account pending.');
  pendingBlocks.length = 0;
  for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
    const accountDataElt = accountData[accountDataIx];
    const account = accountDataElt.account;
    const response = await bananojs.getAccountsPending([account], 10);
    mainConsole.debug('requestPending response', response);
    if (response.blocks) {
      const hashMap = response.blocks[account];
      if (hashMap) {
        const hashes = [...Object.keys(hashMap)];
        hashes.forEach((hash) => {
          const raw = hashMap[hash];
          const bananoParts = bananojs.getBananoPartsFromRaw(raw);
          const pendingBlock = {};
          pendingBlock.n = pendingBlocks.length + 1;
          pendingBlock.hash = hash;
          pendingBlock.seedIx = accountDataElt.seedIx;
          pendingBlock.banano = bananoParts.banano;
          pendingBlock.banoshi = bananoParts.banoshi;
          pendingBlock.raw = bananoParts.raw;
          pendingBlocks.push(pendingBlock);
        });
      }
    }
  }
  updatePleaseWaitStatus();
  mainConsole.debug('requestPending pendingBlocks', pendingBlocks);
  renderApp();
};

const getPleaseWaitStatus = () => {
  return pleaseWaitStatus;
};

const sendSharedAccountBalanceToFirstAccountWithNoTransactions = async () => {
  updatePleaseWaitStatus('Sending Shared Account Balance To First Account With No Transactions.');
  const sendFromSeed = camoSharedAccountData.seed;
  const sendFromSeedIx = camoSharedAccountData.seedIx;
  const sendToAccount = getAccountNoHistory();
  const sendAmount = camoSharedAccountData.balance;
  let message = undefined;
  try {
    mainConsole.debug('sendSharedAccountBalanceToFirstAccountWithNoTransactions', sendFromSeed, sendFromSeedIx, sendToAccount, sendAmount);
    const messageSuffix = await bananojs.sendWithdrawalFromSeed(sendFromSeed, sendFromSeedIx, sendToAccount, sendAmount);
    message = `Banano Tx Hash ${messageSuffix}`;
  } catch (error) {
    message = 'error:' + JSON.stringify(error);
  }

  mainConsole.debug('sendSharedAccountBalanceToFirstAccountWithNoTransactions', message);
  updatePleaseWaitStatus();
  alert(message);
  renderApp();
};

exports.getPleaseWaitStatus = getPleaseWaitStatus;
exports.sendAmountToAccount = sendAmountToAccount;
exports.requestAllBlockchainData = requestAllBlockchainData;
exports.receivePending = receivePending;
exports.getPending = getPending;
exports.reuseSeed = reuseSeed;
exports.showSeedReuse = showSeedReuse;
exports.setAppClipboard = setAppClipboard;
exports.copyToClipboard = copyToClipboard;
exports.setAppDocument = setAppDocument;
exports.setRenderApp = setRenderApp;
exports.showLogin = showLogin;
exports.currentNetworkIx = currentNetworkIx;
exports.NETWORKS = NETWORKS;
exports.getGeneratedSeedHex = getGeneratedSeedHex;
exports.getAccountZero = getAccountZero;
exports.getAccountNoHistory = getAccountNoHistory;
exports.getCamoAccount = getCamoAccount;
exports.getTransactionHistoryByAccount = getTransactionHistoryByAccount;
exports.getBlockchainState = getBlockchainState;
exports.getBalanceStatus = getBalanceStatus;
exports.sendToAccountStatuses = sendToAccountStatuses;
exports.sendToAccountLinks = sendToAccountLinks;
exports.getCurrentNetwork = getCurrentNetwork;
exports.getSendAmount = getSendAmount;
exports.getLedgerMessage = getLedgerMessage;
exports.showSeedEntry = showSeedEntry;
exports.getAccountDataFromSeed = getAccountDataFromSeed;
exports.showHome = showHome;
exports.showGenerateNewSeed = showGenerateNewSeed;
exports.showSend = showSend;
exports.showReceive = showReceive;
exports.showTransactions = showTransactions;
exports.showRepresentatives = showRepresentatives;
exports.setUseCamo = setUseCamo;
exports.getUseCamo = getUseCamo;
exports.getCamoRepresentative = getCamoRepresentative;
exports.getAccountRepresentative = getAccountRepresentative;
exports.updateRepresentative = updateRepresentative;
exports.getCamoPending = getCamoPending;
exports.receiveCamoPending = receiveCamoPending;
exports.updateCamoSharedAccount = updateCamoSharedAccount;
exports.getCamoSharedAccountData = getCamoSharedAccountData;
exports.getAccountBook = getAccountBook;
exports.showAccountBook = showAccountBook;
exports.addAccountToBook = addAccountToBook;
exports.deleteAccountFromBook = deleteAccountFromBook;
exports.sendSharedAccountBalanceToFirstAccountWithNoTransactions = sendSharedAccountBalanceToFirstAccountWithNoTransactions;
exports.init = init;
