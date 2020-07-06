'use strict';

// modules
const ExcelJS = require('exceljs');
const mainConsoleLib = require('console');

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

// exports
exports.createExampleWorkbookBase64 = createExampleWorkbookBase64;
