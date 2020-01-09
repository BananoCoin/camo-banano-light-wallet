'use strict';

// libraries

// modules

// constants

// variables
let pleaseWaitStatus = '';

let updateInProgress = false;

let app = undefined;

// functions

const updatePleaseWaitStatus = (status) => {
  app.debug('updatePleaseWaitStatus', status);
  pleaseWaitStatus = status;
  if (status == undefined) {
    updateInProgress = false;
    app.hide('please-wait');
  } else {
    updateInProgress = true;
    app.show('please-wait');
  }
  app.renderApp();
};

const isUpdateInProgress = () => {
  return updateInProgress;
};

const getPleaseWaitStatus = () => {
  return pleaseWaitStatus;
};

const showUpdateInProgressAlert = () => {
  // console.trace('showUpdateInProgressAlert');
  alert('please wait for background actions to complete.\n' +
        `status: '${pleaseWaitStatus}'`);
};

const setApp = (_app) => {
  app = _app;
};

// exports
exports.setApp = setApp;
exports.updatePleaseWaitStatus = updatePleaseWaitStatus;
exports.isUpdateInProgress = isUpdateInProgress;
exports.getPleaseWaitStatus = getPleaseWaitStatus;
exports.showUpdateInProgressAlert = showUpdateInProgressAlert;
