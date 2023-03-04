'use strict';

// modules
const bananojs = require('@bananocoin/bananojs');
// const bananojsErrorTrap = require('./bananojs-error-trap-util.js');
const ExcelJS = require('exceljs');
// const mainConsoleLib = require('console');

// constants

// variables

// functions
const createExampleWorkbookBase64 = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Camo Banano';
  workbook.lastModifiedBy = 'Camo Banano';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();
  workbook.addWorksheet('The List');

  const worksheet = workbook.worksheets[0];
  worksheet.columns = [
    {header: 'Account', key: 'account', width: 64},
    {header: 'Amount', key: 'amount', width: 32},
  ];
  worksheet.getRow(1).values = ['Account', 'Amount Bananos'];
  worksheet.getRow(2).values = ['ban_1bananobh5rat99qfgt1ptpieie5swmoth87thi74qgbfrij7dcgjiij94xr', 16266];

  const encodedBuffer = await workbook.xlsx.writeBuffer();
  const encodedBase64 = encodedBuffer.toString('base64');
  return encodedBase64;
};

const createPeelWorkbookBase64 = async (seed, startSeedIx, totalCount, individualAmount, includePrivateKey) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Camo Banano';
  workbook.lastModifiedBy = 'Camo Banano';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();
  workbook.addWorksheet('The List');

  const worksheet = workbook.worksheets[0];

  const columns = [
    {header: 'Account', key: 'account', width: 64},
    {header: 'Amount Bananos', key: 'amount', width: 16},
    {header: 'Seed Index', key: 'seedIx', width: 16},
  ];
  if (includePrivateKey) {
    columns.push(
        {header: 'Private Key', key: 'privateKey', width: 80},
    );
  }
  worksheet.columns = columns;

  const headerValues = ['Account', 'Amount Bananos', 'Seed Index'];
  if (includePrivateKey) {
    headerValues.push('Private Key');
  }
  worksheet.getRow(1).values = headerValues;

  if (totalCount > 0) {
    for (let ix = 0; ix < totalCount; ix++) {
      const row = ix+2;
      const seedIx = startSeedIx + ix;
      const privateKey = bananojs.getPrivateKey(seed, seedIx);
      const publicKey = await bananojs.getPublicKey(privateKey);
      const account = bananojs.getBananoAccount(publicKey);
      const rowValues = [account, individualAmount, seedIx];

      if (includePrivateKey) {
        rowValues.push(privateKey);
      }
      worksheet.getRow(row).values = rowValues;
    }
  }

  const encodedBuffer = await workbook.xlsx.writeBuffer();
  const encodedBase64 = encodedBuffer.toString('base64');
  return encodedBase64;
};

const sendWithdrawalFromSeed = async (seed, sendFromSeedIx, workbookBuffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(workbookBuffer);

  const worksheet = workbook.worksheets[0];

  if (worksheet.rowCount < 1) {
    return;
  }
  const headerRow = worksheet.getRow(1);

  let accountColNbr;
  let amountColNbr;
  headerRow.eachCell(function(cell, colNumber) {
    // console.log('Cell ' + colNumber + ' = ' + cell.value);
    if (cell.value.toLowerCase().startsWith('account')) {
      if (accountColNbr === undefined) {
        accountColNbr = colNumber;
      }
    }
    if (cell.value.toLowerCase().startsWith('amount')) {
      if (amountColNbr === undefined) {
        amountColNbr = colNumber;
      }
    }
  });
  if (accountColNbr === undefined) {
    return;
  }
  if (amountColNbr === undefined) {
    return;
  }

  const result = {
    success: true,
    amountTotal: 0,
    hashes: [],
  };
  try {
    for (let rowIx = 2; rowIx <= worksheet.rowCount; rowIx++) {
      const row = worksheet.getRow(rowIx);
      const sendToAccount = row.getCell(accountColNbr).value;
      const sendAmount = row.getCell(amountColNbr).value;
      console.log(`Row:'${rowIx}' send '${sendAmount}' to '${sendToAccount}'`);
      const hash = await bananojs.sendBananoWithdrawalFromSeed(seed, sendFromSeedIx, sendToAccount, sendAmount);
      result.amountTotal += parseFloat(sendAmount);
      result.hashes.push(hash);
    }
  } catch (error) {
    result.success = false;
    result.error = error.message;
  }
  return result;
};

// exports
exports.createExampleWorkbookBase64 = createExampleWorkbookBase64;
exports.createPeelWorkbookBase64 = createPeelWorkbookBase64;
exports.sendWithdrawalFromSeed = sendWithdrawalFromSeed;
