'use strict';

/** imports */
const crypto = require('crypto');

const mainConsoleLib = require('console');

/** https://github.com/sindresorhus/electron-store */
const Store = require('electron-store');
const Conf = require('conf');

const bananojsErrorTrap = require('./util/bananojs-error-trap-util.js');
const accountUtil = require('./util/account-util.js');
const backgroundUtil = require('./util/background-util.js');
const localization = require('./localization.json');

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
},
// , {
//   NAME: 'Error Testnet',
//   EXPLORER: 'https://creeper.banano.cc/',
//   RPC_URL: bananojsErrorTrap.getErrorUrl(),
// }
];

const sendToAccountStatuses = [];

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

const camoSharedAccountData = [];

const accountBook = [];

let isLoggedIn = false;

let useLedgerFlag = false;

let generatedSeedHex = undefined;

let balanceStatus = 'No Balance Requested Yet';

let totalBalance = '?';

let totalPendingBalance = '?';

let totalCamoBalance = '?';

let totalCamoPendingBalance = '?';

let transactionHistoryStatus = 'No History Requested Yet';

let blockchainStatus = 'No Blockchain State Requested Yet';

let language = undefined;

let alertMessage = '';

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
  backgroundUtil.setApp(
      {
        hide: hide,
        show: show,
        renderApp: () => {
          renderApp();
        },
        log: mainConsole.log,
        debug: mainConsole.debug,
      },
  );
  const conf = getCleartextConfig();
  // mainConsole.log('getCleartextConfig', conf);
  if (conf.has('useCamo')) {
    useCamo = conf.get('useCamo');
  } else {
    useCamo = false;
  }
  if (conf.has('language')) {
    language = conf.get('language');
  } else {
    language = 'en';
  }

  accountBook.length = 0;
  if (conf.has('accountBook')) {
    const book = conf.get('accountBook');
    const accountBookAccountSet = new Set();
    book.forEach((bookAccount) => {
      if (!accountBookAccountSet.has(bookAccount.account)) {
        accountBookAccountSet.add(bookAccount.account);
        accountBook.push(bookAccount);
      }
    });
  }

  sendToAccountStatuses.push(getLocalization('noSendToAccountRequestedYet'));
  balanceStatus = getLocalization('noBalanceRequestedYet');
  transactionHistoryStatus = getLocalization('noHistoryRequestedYet');
  blockchainStatus = getLocalization('noBlockchainStateRequestedYet');
};

const getCamoRepresentative = () => {
  if (seed == undefined) {
    return undefined;
  }
  const privateKey = bananojsErrorTrap.getPrivateKey(seed, 0);
  if (privateKey) {
    const camoPublicKey = bananojsErrorTrap.getCamoPublicKey(privateKey);
    return bananojsErrorTrap.getCamoAccount(camoPublicKey);
  } else {
    return undefined;
  }
};

const setUseCamo = async (_useCamo) => {
  useCamo = _useCamo;
  const store = getCleartextConfig();
  store.set('useCamo', useCamo);
  // showAlert(`useCamo:${useCamo}`);
  try {
    await renderApp();
    await requestCamoSharedAccount();
    await requestCamoSharedAccountBalance();
    await renderApp();
    await requestCamoPending();
  } catch (error) {
    mainConsole.trace('setUseCamo', error);
    showAlert(`error updating use camo flag to '${_useCamo}' ` + error.message);
    updateLocalizedPleaseWaitStatus();
  }
  await renderApp();
};

const updateCamoSharedAccount = async () => {
  try {
    await requestCamoSharedAccount();
    await requestCamoSharedAccountBalance();
    await requestCamoPending();
  } catch (error) {
    mainConsole.trace('updateCamoSharedAccount', error);
    showAlert('error updating camo shared account. ' + error.message);
    updateLocalizedPleaseWaitStatus();
  }
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
  // mainConsole.log('getTransactionHistoryUrl',url);
  return url;
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
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  try {
    await requestTransactionHistory();
    await requestBalanceAndRepresentative();
    await requestBlockchainState();
    await requestPending();
    await requestCamoSharedAccount();
    await requestCamoSharedAccountBalance();
    await requestCamoPending();
  } catch (error) {
    mainConsole.trace('requestAllBlockchainData', error);
    showAlert('error requesting all blockchain data:' + error.message);
    updateLocalizedPleaseWaitStatus();
  }
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
  bananojsErrorTrap.setBananodeApiUrl(getRpcUrl());
  await requestAllBlockchainData();
  showHome();
};

const setAccountDataFromSeed = async () => {
  updateLocalizedPleaseWaitStatus('gettingAccountData');
  await accountUtil.setAccountDataFromSeed(getRpcUrl(), seed, accountData);
  updateLocalizedPleaseWaitStatus();
};

const getAccountDataFromSeed = async () => {
  useLedgerFlag = false;
  isLoggedIn = true;
  show('seed');
  const seedElt = appDocument.getElementById('seed');
  if (seedElt.value.length != SEED_LENGTH) {
    showAlert(`seed must be a hex encoded string of length ${SEED_LENGTH}, not ${seedElt.value.length}`);
    return;
  }
  seed = seedElt.value;

  const storeSeedElt = appDocument.getElementById('storeSeed');
  const storeSeed = storeSeedElt.checked;
  const storeSeedPasswordElt = appDocument.getElementById('storeSeedPassword');
  const storeSeedPassword = storeSeedPasswordElt.value;
  // showAlert(`storeSeed:${storeSeed} storeSeedPassword:${storeSeedPassword} `);

  if (storeSeed) {
    const store = new Store({
      encryptionKey: `${storeEncryptionKeyPrefix}${storeSeedPassword}`,
    });
    store.set('seed', seed);
  }

  try {
    await setAccountDataFromSeed();
    await requestBlockchainDataAndShowHome();
  } catch (error) {
    mainConsole.trace('getAccountDataFromSeed', error);
    showAlert('error getting account data from seed. ' + error.message);
    updateLocalizedPleaseWaitStatus();
  }
};

const reuseSeed = async () => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('openingSecureStorage');
  const reuseSeedPasswordElt = appDocument.getElementById('reuseSeedPassword');
  const reuseSeedPassword = reuseSeedPasswordElt.value;
  let success;
  try {
    const store = new Store({
      encryptionKey: `${storeEncryptionKeyPrefix}${reuseSeedPassword}`,
      clearInvalidConfig: false,
    });
    seed = store.get('seed');

    useLedgerFlag = false;
    isLoggedIn = true;
    show('seed');
    success = true;
  } catch (error) {
    success = false;
    mainConsole.trace('reuseSeed', error);
    showAlert('cannot open seed storage, check that password is correct. ' + error.message);
  }
  updateLocalizedPleaseWaitStatus();
  if (success) {
    await setAccountDataFromSeed();
    await requestBlockchainDataAndShowHome();
  }
};

const clearSendData = () => {
  mainConsole.debug('STARTED clearSendData');
  const sendAmountElt = appDocument.getElementById('sendAmount');
  const sendToAccountElt = appDocument.getElementById('sendToAccount');
  sendAmountElt.value = '';

  if (sendToAccountElt) {
    if (getUseCamo()) {
      if (sendToAccountElt.value == '') {
        const accountBook = getAccountBook();
        if (accountBook[0]) {
          sendToAccountElt.value = accountBook[0].camoAccount;
        } else {
          sendToAccountElt.value = '';
        }
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
  try {
    mainConsole.debug('STARTED updateRepresentative');
    const newRepresentativeElt = appDocument.getElementById('newRepresentative');
    const newRepresentative = newRepresentativeElt.value;
    mainConsole.debug('STARTED updateRepresentative newRepresentative',
        newRepresentative);
    const newRepPublicKey = bananojsErrorTrap.getAccountPublicKey(newRepresentative);
    mainConsole.debug('STARTED updateRepresentative newRepPublicKey',
        newRepPublicKey);
    const newBanRepresentative = bananojsErrorTrap.getAccount(newRepPublicKey);
    mainConsole.debug('STARTED updateRepresentative newBanRepresentative',
        newBanRepresentative);
    const response = await bananojsErrorTrap.changeRepresentativeForSeed(seed, 0, newBanRepresentative);
    showAlert(response);
  } catch (error) {
    mainConsole.trace('updateRepresentative', error);
    showAlert('error updating representative. ' + error.message);
  }
  updateLocalizedPleaseWaitStatus();
};

const updateAmount = () => {
  const sendAmountElt = appDocument.getElementById('sendAmount');

  sendAmount = sendAmountElt.value;
  if (isNaN(sendAmount)) {
    throw new Error(`sendAmount ${sendAmount} is not a number`);
  }
};

const updateAmountAndRenderApp = () => {
  updateAmount();
  renderApp();
};

const sendAmountToAccount = async () => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  try {
    updateLocalizedPleaseWaitStatus('sendingAmountToAccount');
    updateAmount();

    const sendToAccountElt = appDocument.getElementById('sendToAccount');

    const sendToAccount = sendToAccountElt.value;
    if (useCamo) {
      const camoAccountValid = bananojsErrorTrap.getCamoAccountValidationInfo(sendToAccount);
      if (!camoAccountValid.valid) {
        throw new Error(camoAccountValid.message);
      }
    } else {
      const accountValid = bananojsErrorTrap.getAccountValidationInfo(sendToAccount);
      if (!accountValid.valid) {
        throw new Error(accountValid.message);
      }
    }
    const sendFromSeedIxElt = appDocument.getElementById('sendFromSeedIx');
    const sendFromSeedIx = parseInt(sendFromSeedIxElt.value);
    if (isNaN(sendFromSeedIx)) {
      throw new Error(`sendFromSeedIx ${sendFromSeedIx} is not a number`);
    }

    if (isNaN(sendAmount)) {
      throw new Error(`sendAmount ${sendAmount} is not a number`);
    }

    let message = undefined;
    if (bananojsErrorTrap.getRawStrFromBananoStr(sendAmount) == '0') {
      message = 'error:cannot send 0';
    } else {
      try {
        if (useCamo) {
          const messageSuffix = await bananojsErrorTrap.camoSendWithdrawalFromSeed(seed, sendFromSeedIx, sendToAccount, sendAmount);
          message = `Camo Tx Hash ${messageSuffix}`;
        } else {
          const messageSuffix = await bananojsErrorTrap.sendWithdrawalFromSeed(seed, sendFromSeedIx, sendToAccount, sendAmount);
          message = `Banano Tx Hash ${messageSuffix}`;
        }
        clearSendData();
      } catch (error) {
        message = 'error:' + JSON.stringify(error);
      }
    }

    mainConsole.debug('sendAmountToAccount', message);
    sendToAccountStatuses.push(message);
    updateLocalizedPleaseWaitStatus();
    showAlert(message);
  } catch (error) {
    mainConsole.trace('sendAmountToAccount', error);
    showAlert('error sending amount to account. ' + error.message);
  }
  updateLocalizedPleaseWaitStatus();
  renderApp();
};

const getTransactionHistoryByAccount = () => {
  return parsedTransactionHistoryByAccount;
};

const requestTransactionHistory = async () => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('gettingTransactionHistory', '.');
  bananojsErrorTrap.setBananodeApiUrl(getRpcUrl());
  parsedTransactionHistoryByAccount.length = 0;
  for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
    updateLocalizedPleaseWaitStatus('gettingTransactionHistory',
        accountDataIx, 'of', accountData.length, '.');
    const accountDataElt = accountData[accountDataIx];
    const account = accountDataElt.account;
    const accountHistory = await bananojsErrorTrap.getAccountHistory(account, ACCOUNT_HISTORY_SIZE);
    // mainConsole.log('requestTransactionHistory', account, accountHistory);
    // transactionHistoryStatus = accountHistory;
    // mainConsole.log(transactionHistoryStatus);
    const parsedTransactionHistoryByAccountElt = {};
    parsedTransactionHistoryByAccountElt.account = account;
    parsedTransactionHistoryByAccount.push(parsedTransactionHistoryByAccountElt);

    if ((accountHistory) && (accountHistory.history)) {
      accountHistory.history.forEach((historyElt, ix) => {
        const parsedTransactionHistoryElt = {};
        parsedTransactionHistoryElt.type = historyElt.type;
        parsedTransactionHistoryElt.n = ix + 1;
        parsedTransactionHistoryElt.value = bananojsErrorTrap.getBananoPartsFromRaw(historyElt.amount).banano;
        parsedTransactionHistoryElt.txHash = historyElt.hash;
        parsedTransactionHistoryElt.txDetailsUrl = 'https://creeper.banano.cc/explorer/block/' + historyElt.hash;
        parsedTransactionHistoryByAccount.push(parsedTransactionHistoryElt);
      });
    }
  }
  updateLocalizedPleaseWaitStatus();
  // mainConsole.log('parsedTransactionHistoryByAccount', parsedTransactionHistoryByAccount);
  renderApp();
};

const requestBalanceAndRepresentative = async () => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('gettingAccountInfo', '.');
  bananojsErrorTrap.setBananodeApiUrl(getRpcUrl());
  totalBalance = 0;
  for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
    updateLocalizedPleaseWaitStatus('gettingAccountInfo',
        accountDataIx, 'of', accountData.length, '.');
    const accountDataElt = accountData[accountDataIx];
    const account = accountDataElt.account;
    const accountInfo = await bananojsErrorTrap.getAccountInfo(account, true);
    balanceStatus = JSON.stringify(accountInfo);
    mainConsole.debug('requestBalanceAndRepresentative', accountInfo);
    if (accountInfo) {
      if (accountInfo.error) {
        balanceStatus = accountInfo.error;
        accountDataElt.representative = account;
        accountDataElt.balance = undefined;
      } else {
        balanceStatus = 'Success';
        accountDataElt.balance = bananojsErrorTrap.getBananoPartsFromRaw(accountInfo.balance).banano;
        accountDataElt.representative = accountInfo.representative;
        totalBalance += parseInt(accountDataElt.balance);
      }
    } else {
      balanceStatus = 'no account info returned.';
      accountDataElt.representative = account;
      accountDataElt.balance = undefined;
    }
  }
  updateLocalizedPleaseWaitStatus();
  renderApp();
};

const requestBlockchainState = async () => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('gettingBlockchainState');
  bananojsErrorTrap.setBananodeApiUrl(getRpcUrl());
  const blockCount = await bananojsErrorTrap.getBlockCount();
  if (blockCount) {
    blockchainState.count = blockCount.count;
    blockchainStatus = 'Success';
  } else {
    blockchainState.count = '';
    blockchainStatus = 'Failure';
  }
  mainConsole.debug('blockchainState', blockchainState);
  updateLocalizedPleaseWaitStatus();
  renderApp();
};

const removeClass = (id, cl) => {
  get(id).classList.remove(cl);
};

const addClass = (id, cl) => {
  get(id).classList.add(cl);
};

const selectButton = (id) => {
  addClass(id, 'black_on_yellow_with_hover');
  removeClass(id, 'yellow_on_brown_with_hover');
};

const clearButtonSelection = (id) => {
  removeClass(id, 'black_on_yellow_with_hover');
  addClass(id, 'yellow_on_brown_with_hover');
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
  hide('alert');
};

const copyToClipboard = () => {
  appClipboard.writeText(generatedSeedHex);
  showAlert(`copied to clipboard:\n${generatedSeedHex}`);
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
  isLoggedIn = false;
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

const showSendToList = () => {
  if (!isLoggedIn) {
    return;
  }
  hideEverything();
  clearSendData();
  show('from-account');
  selectButton('sendToList');
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
    mainConsole.debug('getAccountAsCamoAccount banAccount', banAccount);
    const camoAccountValid = bananojsErrorTrap.getCamoAccountValidationInfo(banAccount);
    mainConsole.debug('getAccountAsCamoAccount camoAccountValid', camoAccountValid);
    if (camoAccountValid.valid) {
      mainConsole.debug('getAccountAsCamoAccount retval[1]', banAccount);
      return banAccount;
    }
    const accountValid = bananojsErrorTrap.getAccountValidationInfo(banAccount);
    mainConsole.debug('getAccountAsCamoAccount accountValid', accountValid);
    if (accountValid.valid) {
      const publicKey = bananojsErrorTrap.getAccountPublicKey(banAccount);
      const camoAccount = bananojsErrorTrap.getCamoAccount(publicKey);
      mainConsole.debug('getAccountAsCamoAccount retval[2]', camoAccount);
      return camoAccount;
    }
  }
};

const getAccountBook = () => {
  const book = [];
  const accountBookAccountSet = new Set();
  const pushToBook = (bookElt) => {
    if (!accountBookAccountSet.has(bookElt.account)) {
      accountBookAccountSet.add(bookElt.account);
      book.push(bookElt);
    }
  };
  try {
    accountData.forEach((accountDataElt) => {
      pushToBook({
        readOnly: true,
        n: book.length,
        account: accountDataElt.account,
        balance: accountDataElt.balance,
        seedIx: accountDataElt.seedIx,
        checkCamoPending: accountDataElt.seedIx == 0,
        camoAccount: getAccountAsCamoAccount(accountDataElt.account),
      });
    });
    accountBook.forEach((bookAccount, bookAccountIx) => {
      pushToBook({
        readOnly: false,
        n: book.length,
        account: bookAccount,
        balance: undefined,
        seedIx: undefined,
        bookAccountIx: bookAccountIx,
        checkCamoPending: true,
        camoAccount: getAccountAsCamoAccount(bookAccount),
      });
    });
  } catch (error) {
    showAlert('error getting account book ' + error.message);
    mainConsole.log('getAccountBook error', error);
  }
  return book;
};

const deleteAccountFromBook = (ix) => {
  const bookAccount = accountBook[ix];
  const confirmDelete = confirm(`Delete [${ix} of ${accountBook.length}] ${bookAccount}`);
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

  const pushAndStore = (validAccount) => {
    let duplicate = false;

    getAccountBook().forEach((bookAccount, bookAccountIx) => {
      if (bookAccount.account == validAccount) {
        showAlert('duplicate['+bookAccount.n+']:' + validAccount);
        duplicate = true;
      }
    });
    if (!duplicate) {
      accountBook.push(validAccount);
      const store = getCleartextConfig();
      store.set('accountBook', accountBook);
      renderApp();
      showAlert('added:'+validAccount);
    }
  };

  const camoAccountValid = bananojsErrorTrap.getCamoAccountValidationInfo(newBookAccount);
  // showAlert(JSON.stringify(camoAccountValid));
  if (camoAccountValid.valid) {
    try {
      const publicKey = bananojsErrorTrap.getAccountPublicKey(newBookAccount);
      const account = bananojsErrorTrap.getAccount(publicKey);
      pushAndStore(account);
    } catch (error) {
      showAlert(error.message);
    }
  } else {
    const accountValid = bananojsErrorTrap.getAccountValidationInfo(newBookAccount);
    // showAlert(JSON.stringify(accountValid));
    if (accountValid.valid) {
      pushAndStore(newBookAccount);
    } else {
      showAlert(accountValid.message + '\n' + camoAccountValid.message);
    }
  }
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

  totalBalance = '?';
  totalPendingBalance = '?';
  totalCamoBalance = '?';
  totalCamoPendingBalance = '?';

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

const getAccountNoHistoryOrPending = () => {
  for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
    const accountDataElt = accountData[accountDataIx];
    if (!accountDataElt.hasHistory) {
      if (!accountDataElt.hasPending) {
        return accountDataElt.account;
      }
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
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('gettingCamoSharedAccount');
  const sendToAccountElt = appDocument.getElementById('sendToAccount');
  const sendToAccount = sendToAccountElt.value;
  mainConsole.debug('requestCamoSharedAccount sendToAccount', sendToAccount);
  camoSharedAccountData.length = 0;
  if (useCamo) {
    if (seed) {
      if (sendToAccount) {
        let hasMoreHistory = true;
        const seedIx = 0;
        let sharedSeedIx = 0;
        while (hasMoreHistory) {
          const newCamoSharedAccountData = await bananojsErrorTrap.getCamoSharedAccountData(seed, seedIx, sendToAccount, sharedSeedIx);
          mainConsole.debug('requestCamoSharedAccount camoSharedAccountData', camoSharedAccountData);
          if (newCamoSharedAccountData) {
            const camoSharedAccountDataElt = {};
            camoSharedAccountDataElt.account = newCamoSharedAccountData.sharedAccount;
            camoSharedAccountDataElt.seed = newCamoSharedAccountData.sharedSeed;
            camoSharedAccountDataElt.seedIx = sharedSeedIx;
            camoSharedAccountDataElt.privateKey = newCamoSharedAccountData.sharedPrivateKey;
            camoSharedAccountDataElt.publicKey = newCamoSharedAccountData.sharedPublicKey;
            camoSharedAccountData.push(camoSharedAccountDataElt);
            mainConsole.debug('requestCamoSharedAccount camoSharedAccountData', camoSharedAccountDataElt);
            const accountHistory = await bananojsErrorTrap.getAccountHistory(newCamoSharedAccountData.sharedAccount, 1);
            if (!(accountHistory.history)) {
              hasMoreHistory = false;
            }
          } else {
            hasMoreHistory = false;
          }
          sharedSeedIx++;
        }
      }
    }
  }
  // mainConsole.trace('requestCamoSharedAccount');
  updateLocalizedPleaseWaitStatus();
};

const requestCamoSharedAccountBalance = async () => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('gettingCamoSharedAccountBalance');
  mainConsole.debug('requestCamoSharedAccountBalance camoSharedAccountData', camoSharedAccountData);
  totalCamoBalance = 0;
  for (let camoSharedAccountDataIx = 0; camoSharedAccountDataIx < camoSharedAccountData.length; camoSharedAccountDataIx++) {
    const camoSharedAccountDataElt = camoSharedAccountData[camoSharedAccountDataIx];

    if (camoSharedAccountDataElt.account) {
      if (camoSharedAccountDataElt.account.length > 0) {
        const accountInfo = await bananojsErrorTrap.getAccountInfo(camoSharedAccountDataElt.account, true);
        balanceStatus = JSON.stringify(accountInfo);
        mainConsole.debug('requestCamoSharedAccountBalance accountInfo', accountInfo);
        if (accountInfo) {
          if (accountInfo.error) {
            balanceStatus = accountInfo.error;
            camoSharedAccountDataElt.representative = camoSharedAccountDataElt.account;
            camoSharedAccountDataElt.balance = undefined;
          } else {
            balanceStatus = 'Success';
            camoSharedAccountDataElt.balance = bananojsErrorTrap.getBananoPartsFromRaw(accountInfo.balance).banano;
            camoSharedAccountDataElt.representative = accountInfo.representative;
            totalCamoBalance += parseInt(camoSharedAccountDataElt.balance);
          }
        } else {
          balanceStatus = 'no account info returned.';
          accountDataElt.representative = account;
          accountDataElt.balance = undefined;
        }
      }
    }
  }
  updateLocalizedPleaseWaitStatus();
};

const receiveCamoPending = async (seedIx, sendToAccount, sharedSeedIx, hash) => {
  mainConsole.debug('receiveCamoPending seedIx', seedIx, sendToAccount, sharedSeedIx, hash);
  try {
    const response = await bananojsErrorTrap.receiveCamoDepositsForSeed(seed, seedIx, sendToAccount, sharedSeedIx, hash);
    showAlert(JSON.stringify(response));
  } catch (error) {
    showAlert(error.message);
    mainConsole.debug('receiveCamoPending error', error);
  }
};

const requestCamoPending = async () => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('gettingCamoPending');

  totalCamoPendingBalance = 0;
  camoPendingBlocks.length = 0;
  if (useCamo) {
    const fullAccountBook = getAccountBook();
    const pendingAccountBook = [];
    for (let accountBookIx = 0; accountBookIx < fullAccountBook.length; accountBookIx++) {
      const accountBookElt = fullAccountBook[accountBookIx];
      if (accountBookElt.checkCamoPending) {
        pendingAccountBook.push(accountBookElt);
      }
    }
    for (let accountBookIx = 0; accountBookIx < pendingAccountBook.length; accountBookIx++) {
      const accountBookElt = pendingAccountBook[accountBookIx];
      const sendToAccount = accountBookElt.camoAccount;
      let firstHashForSendToAccount = true;

      if (sendToAccount) {
        mainConsole.debug('requestCamoPending sendToAccount', sendToAccount);
        for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
          const accountDataElt = accountData[accountDataIx];

          updateLocalizedPleaseWaitStatus('gettingCamoPending',
              'bookAccount', (accountBookIx+1), 'of', pendingAccountBook.length, ',',
              'seedAccount', (accountDataIx+1), 'of', accountData.length, '.' );

          mainConsole.debug('requestCamoPending request', seed, accountDataElt.seedIx, sendToAccount);
          let hasMoreHistoryOrPending = true;
          let sharedSeedIx = 0;
          while (hasMoreHistoryOrPending) {
            const camoSharedAccountData = await bananojsErrorTrap.getCamoSharedAccountData(seed, accountDataElt.seedIx, sendToAccount, sharedSeedIx);
            mainConsole.debug('requestCamoPending camoSharedAccountData', camoSharedAccountData);
            let hasHistory = false;
            if (camoSharedAccountData) {
              const accountHistory = await bananojsErrorTrap.getAccountHistory(camoSharedAccountData.sharedAccount, 1);
              if (accountHistory.history) {
                hasHistory = true;
              } else {
                hasMoreHistoryOrPending = false;
              }
            } else {
              hasMoreHistoryOrPending = false;
            }
            mainConsole.debug('requestCamoPending hasHistory', hasHistory);
            const response = await bananojsErrorTrap.camoGetAccountsPending(seed, accountDataElt.seedIx, sendToAccount, sharedSeedIx, 10);
            mainConsole.debug('requestCamoPending response', response);
            if (response) {
              if (response.blocks) {
                const responseAccounts = [...Object.keys(response.blocks)];
                responseAccounts.forEach((responseAccount) => {
                  const hashMap = response.blocks[responseAccount];
                  mainConsole.debug('requestCamoPending hashMap', hashMap);
                  if (hashMap) {
                    const hashes = [...Object.keys(hashMap)];
                    mainConsole.debug('requestCamoPending hashes', hashes);
                    if (hashes.length > 0) {
                      hasMoreHistoryOrPending = true;
                    }
                    hashes.forEach((hash, hashIx) => {
                      const raw = hashMap[hash];
                      const bananoParts = bananojsErrorTrap.getBananoPartsFromRaw(raw);
                      const camoPendingBlock = {};
                      camoPendingBlock.n = camoPendingBlocks.length + 1;
                      if (firstHashForSendToAccount) {
                        firstHashForSendToAccount = false;
                        camoPendingBlock.firstHashForSendToAccount = true;
                      }
                      camoPendingBlock.hash = hash;
                      camoPendingBlock.banano = bananoParts.banano;
                      camoPendingBlock.banoshi = bananoParts.banoshi;
                      camoPendingBlock.raw = bananoParts.raw;
                      camoPendingBlock.totalRaw = raw;
                      camoPendingBlock.detailsUrl = 'https://creeper.banano.cc/explorer/block/' + hash;
                      camoPendingBlock.seedIx = accountDataElt.seedIx;
                      camoPendingBlock.sharedSeedIx = sharedSeedIx;
                      camoPendingBlock.sendToAccount = sendToAccount;
                      camoPendingBlock.sharedAccount = camoSharedAccountData.sharedAccount;
                      camoPendingBlocks.push(camoPendingBlock);
                      mainConsole.debug('camoPendingBlocks camoPendingBlock', camoPendingBlock);

                      totalCamoPendingBalance += parseInt(camoPendingBlock.banano);
                    });
                  }
                });
              }
            }
            sharedSeedIx++;
            mainConsole.debug('requestCamoPending hasMoreHistoryOrPending', hasMoreHistoryOrPending);
          }
          mainConsole.debug('requestCamoPending camoPendingBlocks', camoPendingBlocks);
        }
      }
    }
  }
  updateLocalizedPleaseWaitStatus();
  renderApp();
};

const getPending = () => {
  return pendingBlocks;
};

const getCamoPending = () => {
  return camoPendingBlocks;
};

const receivePending = async (hash, seedIx) => {
  try {
    const representative = getAccountRepresentative();
    if (representative) {
      const response = await bananojsErrorTrap.receiveDepositsForSeed(seed, seedIx, representative, hash);
      mainConsole.debug('receivePending receiveDepositsForSeed', response);
      if (response) {
        showAlert(JSON.stringify(response));
      }
    } else {
      showAlert('no representative, cannot receive pending.');
    }
  } catch (error) {
    mainConsole.trace('receivePending', error);
    showAlert('error trying to receive pending. ' + error.message);
  }
  updateLocalizedPleaseWaitStatus();
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
    return bananojsErrorTrap.getCamoAccount(accountData[0].publicKey);
  }
};

const requestPending = async () => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('gettingAccountPending');
  totalPendingBalance = 0;
  pendingBlocks.length = 0;
  for (let accountDataIx = 0; accountDataIx < accountData.length; accountDataIx++) {
    const accountDataElt = accountData[accountDataIx];
    const account = accountDataElt.account;
    const response = await bananojsErrorTrap.getAccountsPending([account], 10, true);
    mainConsole.debug('requestPending response', response);
    if (response.blocks) {
      const hashMap = response.blocks[account];
      if (hashMap) {
        const hashes = [...Object.keys(hashMap)];
        hashes.forEach((hash, hashIx) => {
          const raw = hashMap[hash].amount;
          const bananoParts = bananojsErrorTrap.getBananoPartsFromRaw(raw);
          const pendingBlock = {};
          pendingBlock.sourceAccount = hashMap[hash].source;
          pendingBlock.n = pendingBlocks.length + 1;
          pendingBlock.hash = hash;
          pendingBlock.detailsUrl = 'https://creeper.banano.cc/explorer/block/' + hash;
          pendingBlock.seedIx = accountDataElt.seedIx;
          pendingBlock.banano = bananoParts.banano;
          pendingBlock.banoshi = bananoParts.banoshi;
          pendingBlock.raw = bananoParts.raw;
          pendingBlocks.push(pendingBlock);

          totalPendingBalance += parseInt(pendingBlock.banano);
        });
      }
    }
  }
  pendingBlocks.sort((a, b) => {
    return a.sourceAccount.localeCompare(b.sourceAccount);
  });
  const sourceAccounts = new Set();
  pendingBlocks.forEach((pendingBlock) => {
    if (!sourceAccounts.has(pendingBlock.sourceAccount)) {
      sourceAccounts.add(pendingBlock.sourceAccount);
      pendingBlock.firstHashForSourceAccount = true;
    }
  });

  updateLocalizedPleaseWaitStatus();
  mainConsole.debug('requestPending pendingBlocks', pendingBlocks);
  renderApp();
};

const sendSharedAccountBalanceToFirstAccountWithNoTransactions = async (ix) => {
  if (backgroundUtil.isUpdateInProgress()) {
    backgroundUtil.showUpdateInProgressAlert();
    return;
  }
  updateLocalizedPleaseWaitStatus('sendingSharedAccountBalanceToFirstAccountWithNoTransactions');
  const sendFromSeed = camoSharedAccountData[ix].seed;
  const sendFromSeedIx = camoSharedAccountData[ix].seedIx;
  const sendToAccount = getAccountNoHistoryOrPending();
  const sendAmount = camoSharedAccountData[ix].balance;
  let message = undefined;
  try {
    mainConsole.debug('sendSharedAccountBalanceToFirstAccountWithNoTransactions', sendFromSeed, sendFromSeedIx, sendToAccount, sendAmount);
    const messageSuffix = await bananojsErrorTrap.sendWithdrawalFromSeed(sendFromSeed, sendFromSeedIx, sendToAccount, sendAmount);
    message = `Banano Tx Hash ${messageSuffix}`;
  } catch (error) {
    message = 'error:' + JSON.stringify(error);
  }

  mainConsole.debug('sendSharedAccountBalanceToFirstAccountWithNoTransactions', message);
  try {
    updateLocalizedPleaseWaitStatus('refreshingAccountData');
    await setAccountDataFromSeed();
    await requestAllBlockchainData();
    updateLocalizedPleaseWaitStatus();
    showAlert(message);
  } catch (error) {
    mainConsole.trace('sendSharedAccountBalanceToFirstAccountWithNoTransactions', error);
    showAlert('error refreshing account data. ' + error.message);
    updateLocalizedPleaseWaitStatus();
  }
  renderApp();
};

const getLedgerDeviceInfo = () => {
  return ledgerDeviceInfo;
};

const getCurrentNetworkIx = () => {
  return currentNetworkIx;
};

const updateLocalizedPleaseWaitStatus = (...statusParts) => {
  if (statusParts.length == 0) {
    backgroundUtil.updatePleaseWaitStatus();
    return;
  }
  const localizedStatusParts = [];
  statusParts.forEach((statusPart) => {
    const localizedStatusPart = getLocalization(statusPart);
    localizedStatusParts.push(localizedStatusPart);
  });
  const localizedStatus = localizedStatusParts.join(' ');
  backgroundUtil.updatePleaseWaitStatus(localizedStatus);
};

const getLocalization = (key) => {
  // showAlert(`${key}, ${isNaN(key)}`);
  if (isNaN(key)) {
    const values = localization[key];
    if (values) {
      // showAlert(JSON.stringify(values));
      const value = values[language];
      // showAlert(JSON.stringify(value));
      return value;
    } else {
      showAlert(key);
    }
  } else {
    return key;
  }
};

const changeLanguage = (e) => {
  language = event.target.value;
  const store = getCleartextConfig();
  store.set('language', language);
  renderApp();
};

const getLanguages = () => {
  return [...Object.entries(localization.languages)];
};

const getLanguage = () => {
  return language;
};

const getTotalBalances = () => {
  return {
    balance: totalBalance,
    pendingBalance: totalPendingBalance,
    camoBalance: totalCamoBalance,
    camoPendingBalance: totalCamoPendingBalance,
  };
};

const getAlertMessage = () => {
  return alertMessage;
};

const hideAlert = () => {
  hide('alert');
  renderApp();
};

const showAlert = (message) => {
  mainConsole.log('showAlert', message);
  alertMessage = message;
  show('alert');
  renderApp();
};

exports.getLocalization = getLocalization;
exports.changeLanguage = changeLanguage;
exports.getLanguages = getLanguages;
exports.getLanguage = getLanguage;
exports.getLedgerDeviceInfo = getLedgerDeviceInfo;
exports.isUpdateInProgress = backgroundUtil.isUpdateInProgress;
exports.getPleaseWaitStatus = backgroundUtil.getPleaseWaitStatus;
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
exports.getCurrentNetworkIx = getCurrentNetworkIx;
exports.NETWORKS = NETWORKS;
exports.getGeneratedSeedHex = getGeneratedSeedHex;
exports.getAccountZero = getAccountZero;
exports.getAccountNoHistoryOrPending = getAccountNoHistoryOrPending;
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
exports.showSendToList = showSendToList;
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
exports.changeNetwork = changeNetwork;
exports.getTotalBalances = getTotalBalances;
exports.getAlertMessage = getAlertMessage;
exports.hideAlert = hideAlert;
exports.showAlert = showAlert;
exports.init = init;
