"use strict";

/** imports */
const React = require('react');
const ReactDOM = require('react-dom');

const electron = require('electron');
const remote = require('@electron/remote');
const shell = electron.shell;
const clipboard = electron.clipboard;

const Row = require('react-bootstrap').Row;
const Col = require('react-bootstrap').Col;
const Grid = require('react-bootstrap').Grid;
const Table = require('react-bootstrap').Table;

/** modules */

const app = require('./app.js');
const localization = require('./localization.json');

const openDevTools = () => {
  try {
    const window = remote.getCurrentWindow();
    window.webContents.openDevTools();
  } catch (e) {
    alert(`error:${e}`);
  }
};

const AutoRecieveButton = () => {
  if (app.getUseAutoRecieve()) {
    return (
      <DisableableButton
        name="disableAutoRecieve"
        onClick={(e) => app.setAutoRecieve(false)}/>
    )
  } else {
    return (
      <DisableableButton
        name="enableAutoRecieve"
        onClick={(e) => app.setAutoRecieve(true)}/>
    )
  }
}

const BalancesTable = () => {
  const totals = app.getTotalBalances();
  return (
  <table className="yellow_on_brown h20px darkgray_border bordered">
    <tbody>
      <tr><td><Localization name="balance"/></td><td>{totals.balance}</td></tr>
      <tr><td><Localization name="pendingBalance"/></td><td>{totals.pendingBalance}</td></tr>
      <tr><td><Localization name="camoBalance"/></td><td>{totals.camoBalance}</td></tr>
      <tr><td><Localization name="camoPendingBalance"/></td><td>{totals.camoPendingBalance}</td></tr>
    </tbody>
  </table>
  )
}

const LocalizationInput = (props) => {
  const placeholder = props.placeholder;
  const localizedPlaceholder = app.getLocalization(placeholder);
  return (
    <input style={props.style}
     type={props.type}
     size={props.size}
     id={props.id}
     placeholder={localizedPlaceholder}
     ></input>
  )
}

const Localization = (props) => {
  const name = props.name;
  if(name) {
    return app.getLocalization(name);
  } else {
    return null;
  }
}

const Version = () => {
  return remote.app.getVersion();
}

const LedgerMessage = () => {
  const message = app.getLedgerMessage();
  return message;
}

const UseLedgerButton = () => {
  if (
    app.getLedgerDeviceInfo()
    ? app.getLedgerDeviceInfo().enabled
    : false) {
    return (<div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px" onClick={(e) => getPublicKeyFromLedger()}>Use Ledger</div>);
  } else {
    return (<div className="black_on_gray bordered display_inline_block float_right fake_button_disabled rounded padding_5px">Use Ledger</div>);
  }
  return (<div/>);
}

const SendFromSeedIxField = () => {
  const accountBook = app.getAccountBook();
  if(accountBook[0]) {
    const validAccountBook = [];
    for(let accountBookIx = 0; accountBookIx < accountBook.length; accountBookIx++) {
      const accountBookElt = accountBook[accountBookIx];
      if(accountBookElt.seedIx !== undefined) {
        if(accountBookElt.balance !== undefined) {
          validAccountBook.push(accountBookElt);
        }
      }
    }
    if(validAccountBook.length == 0) {
      const item = accountBook[0];
      item.balance = 0;
      validAccountBook.push(item);
    }
    return (
      <select id="sendFromSeedIx"
        onChange={(e) => app.updateCamoSharedAccount()}
        disabled={app.isUpdateInProgress()}>
        {
          validAccountBook.map((item, index) => {
            if (app.getUseCamo()) {
              return (<option key={index}
                 value={item.seedIx}>[{item.seedIx}]{item.camoAccount} ({item.balance} BAN)</option>)
            } else {
              return (<option key={index}  value={item.seedIx}>[{item.seedIx}]{item.account} ({item.balance} BAN)</option>)
            }
          })
        }
      </select>
    )
  } else {
    return null;
  }
}

const SendToAccountField = () => {
  if (app.getUseCamo()) {
    const accountBook = app.getAccountBook();
    if(accountBook[0]) {
      return (
        <select id="sendToAccount"
          onChange = {(e) => app.updateCamoSharedAccount()}
          disabled={app.isUpdateInProgress()}>
          {
            accountBook.map((item, index) => {
              let skip = false;
              // if(item.balance === undefined) {
                // skip = true;
              // }
              if(item.seedIx !== undefined) {
                if(item.seedIx > 0) {
                  skip = true;
                }
              }
              if(skip) {
                return null;
              } else {
                return (<option key={index} value={item.camoAccount}>{item.camoAccount}</option>)
              }
            })
          }
        </select>
      )
    } else {
      return null;
    }
  } else {
    return (
      <LocalizationInput style={{
          fontFamily: 'monospace'
        }} type="text" size="64" id="sendToAccount" placeholder="sendToAccount"/>
    )
  }
}

const DisableableButton = (props) => {
  const name = props.name;
  const localizedName = app.getLocalization(name);
  const onClick = props.onClick;
  if(app.isUpdateInProgress()) {
    return (
      <div className="black_on_gray bordered display_inline_block float_right fake_button rounded padding_5px"
      >{localizedName}</div>
    )
  } else {
    return (
      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
        onClick={(e) => {
          onClick();
        }}>{localizedName}</div>
    )
  }
}

const DeleteAccountFromBookButton = (props) => {
  const item = props.item;
  if(item.readOnly) {
    return (<div/>);
  } else {
    return (
      <div className="yellow_on_black gray_border bordered display_inline_block float_right fake_button rounded padding_5px"
      onClick={(e) => app.deleteAccountFromBook(item.bookAccountIx)}>X</div>
    );
  }
}

const UseCamoButton = () => {
  if (app.getUseCamo()) {
    return (
      <div className="h310px overflow_auto">
        <div className="gray_on_yellow"><Localization name="usingCamoToSendTransaction"/></div>
        <div className="black_on_gray gray_border bordered display_inline_block float_right fake_button_disabled rounded padding_5px"><Localization name="enableCamo"/></div>
        <DisableableButton
          name="disableCamo"
          onClick={(e) => app.setUseCamo(false)}/>
        <div className="gray_on_yellow"><Localization name="firstAccountWithNoTransactions"/></div>
        <p>{app.getAccountNoHistoryOrPending()}</p>
        <div className="gray_on_yellow">
          <Localization name="sharedAccountInformation"/>
          &nbsp;
          {app.getCamoSharedAccountData().length}
          &nbsp;
          <Localization name="rows"/>.</div>
        {
          app.getCamoSharedAccountData().map((item, index) => {
            let skip = false;
            if(item.balance === undefined) {
              skip = true;
            } else {
              if(item.balance === '0') {
                skip = true;
              }
            }
            if(skip) {
              return (
                <div key={index} className="h20px">
                  <hr/>
                  <div className="gray_on_yellow">
                    <Localization name="account"/>
                     &nbsp;
                    {item.account} &nbsp;
                    0
                    BAN
                  </div>
                </div>
              )
            } else {
              return (
                <div key={index} className="h90px">
                  <hr/>
                  <div className="gray_on_yellow">
                  <Localization name="account"/> &nbsp;
                  {item.account} &nbsp;
                  {item.balance} &nbsp;
                  BAN
                  </div>
                  <p></p>
                  <DisableableButton
                    name="sendSharedAccountBalanceToFirstAccountWithNoTransactions"
                    onClick={(e) => app.sendSharedAccountBalanceToFirstAccountWithNoTransactions(index)}/>
                  <p></p>
                </div>
              )
            }
          })
        }
      </div>
    );
  } else {
    return (
      <div>
        <div className="gray_on_yellow"><Localization name="sendingRegularTransaction"/></div>
        <DisableableButton
          name="enableCamo"
          onClick={(e) => app.setUseCamo(true)}/>
        <div className="black_on_gray gray_border bordered display_inline_block float_right fake_button_disabled rounded padding_5px"><Localization name="disableCamo"/></div>
      </div>
    );
  }
  return (<div/>);
}

const CamoIcon = (props) => {
  const item = props.item;
  if (!(item)) {
    return (<div/>);
  }
  if (item.checkCamoPending) {
    return (<img className="w20px h20px" src="artwork/camo.png"/>);
  } else {
    return (<div/>);
  }
}

const TransactionHistoryElementIcon = (props) => {
  const item = props.item;
  if (!(item)) {
    return (<div/>);
  }
  if (item.type == 'receive') {
    return (<img className="svg" src="artwork/receive.svg"/>);
  }
  if (item.type == 'send') {
    return (<img className="svg" src="artwork/send.svg"/>);
  }
  return (<img className="svg" src="artwork/{item.type}.svg"/>);
}

const onLinkClick = (event) => {
  event.preventDefault();
  shell.openExternal(event.currentTarget.href);
}

class App extends React.Component {
  render() {
    return (<div>
      <table className="w800h600px no_padding no_border">
        <tbody>
          <tr className="no_padding">
            <td className="valign_top yellow_on_brown no_border" style={{
                width: '150px'
              }}>
              <table className="w100pct no_border">
                <tbody>
                  <tr>
                    <td className="h20px no_border user_select_none">
                      <select value={app.getLanguage()} name="network"
                        onChange={(e) => app.changeLanguage(e)}
                        disabled={app.isUpdateInProgress()}>
                        {
                          app.getLanguages().map((item, index) => {
                            return (
                              <option key={index} value={item[0]}>{item[1]}</option>
                            )
                          })
                        }
                      </select>
                      <br/>
                      <Localization name="title"/>
                      <br/>
                      <Version/>
                    </td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown h20px no_border"></td>
                  </tr>
                  <tr>
                    <td>
                      <Localization name="network"/>
                      <select value={app.getCurrentNetworkIx()} name="network"
                        onChange={(e) => app.changeNetwork(e)}
                        disabled={app.isUpdateInProgress()}>
                        {
                          app.NETWORKS.map((item, index) => {
                            return (
                              <option key={index} value={index}>{item.NAME}</option>
                            )
                          })
                        }
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown h20px no_border"></td>
                  </tr>
                  <tr>
                    <td id='home' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showHome()}>
                      <img className="valign_middle svg" src="artwork/home.svg"></img>&nbsp;
                      <Localization name="home"/></td>
                  </tr>
                  <tr>
                    <td id='send' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showSend()}>
                      <img className="valign_middle svg" src="artwork/send.svg"></img>&nbsp;
                      <Localization name="send"/></td>
                  </tr>
                  <tr>
                    <td id='sendToList' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showSendToList()}>
                      <img className="valign_middle svg" src="artwork/send.svg"></img>&nbsp;
                      <Localization name="sendToList"/></td>
                  </tr>
                  <tr>
                    <td id='receive' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showReceive()}>
                      <img className="valign_middle svg" src="artwork/receive.svg"></img>&nbsp;
                      <Localization name="receive"/></td>
                  </tr>
                  <tr>
                    <td id='transactions' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showTransactions()}>
                      <img className="valign_middle svg" src="artwork/transactions.svg"></img>&nbsp;
                      <Localization name="transactions"/></td>
                  </tr>
                  <tr>
                    <td id='representatives' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showRepresentatives()}>
                      <img className="valign_middle svg" src="artwork/representatives.svg"></img>&nbsp;
                      <Localization name="representative"/></td>
                  </tr>
                  <tr>
                    <td id='accounts' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showAccountBook()}>
                      <img className="valign_middle svg" src="artwork/accounts.svg"></img>&nbsp;
                      <Localization name="accountBook"/></td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown h180px no_border"></td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.requestAllBlockchainData()}><Localization name="refresh"/></td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showLogin()}><Localization name="logout"/></td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => openDevTools()}><Localization name="showDevTools"/></td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td className="valign_top no_border no_padding">
              <table className="w590px no_border no_padding">
                <tbody>
                  <tr id="camo-banano-branding" className="no_border no_padding">
                    <td className="h225px w500px no_border no_padding">
                      <div className="branding_container">
                        <a href="https://banano.cc/" onClick={(e) => onLinkClick(e)}>
                        <img className="h200px w200px no_border no_padding" src="artwork/cfccamobanano.png"/>
                        </a>
                      </div>
                      <div className="balance_container">
                      <BalancesTable/>
                      </div>
                    </td>
                  </tr>
                  <tr id="ledger-login">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="ledgerStatus"/></div>
                      <p><LedgerMessage/>
                      </p>
                      <UseLedgerButton/>
                    </td>
                  </tr>
                  <tr id="seed-login">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="seed"/></div>
                      <p><Localization name="enterSeedManually"/></p>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.showSeedEntry()}><Localization name="enterSeed"/></div>
                    </td>
                  </tr>
                  <tr id="seed-reuse">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="reuseStoredSeed"/></div>
                      <p><Localization name="reuseSeedMessage"/></p>
                      <DisableableButton name="reuseSeed" onClick={(e) => app.showSeedReuse()} />
                    </td>
                  </tr>
                  <tr id="seed-reuse-entry">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="reuseStoredSeed"/></div>
                      <div className="gray_on_yellow"><Localization name="seedStoragePasswordOptional"/></div>
                      <br/>
                      <LocalizationInput className="monospace no_pad" type="password" size="66" maxLength="64" id="reuseSeedPassword"
                       placeholder="storagePasswordOptional"/>
                      <br/>
                      <br/>
                      <DisableableButton name="reuseStoredSeed" onClick={(e) => app.reuseSeed()} />
                    </td>
                  </tr>
                  <tr id="seed-entry">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="seed"/></div>
                      <br/>
                      <LocalizationInput className="monospace no_pad" type="text" size="66" maxLength="64" id="seed" placeholder="seed"/>
                      <hr/>
                      <div className="gray_on_yellow"><Localization name="storeSeed"/></div>
                      <br/>
                      <input type="checkbox" id="storeSeed"></input><Localization name="storeSeedLocallyForReuse"/>
                      <br/>
                      <div className="gray_on_yellow"><Localization name="seedStoragePasswordOptional"/></div>
                      <br/>
                      <LocalizationInput className="monospace no_pad" type="password" size="66" maxLength="64" id="storeSeedPassword"
                        placeholder="storagePasswordOptional"/>
                      <br/>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.getAccountDataFromSeed()}><Localization name="useSeed"/></div>
                    </td>
                  </tr>
                  <tr id="private-key-generate">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="generateNewSeed"/></div>
                      <p><Localization name="generateNewSeedMessage"/></p>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.showGenerateNewSeed()}><Localization name="generateSeed"/></div>
                    </td>
                  </tr>
                  <tr id="private-key-generator">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="newSeed"/></div>
                      {app.getGeneratedSeedHex()}
                      <br/>
                      <div className="yellow_on_black bordered display_inline_block float_left fake_button rounded padding_5px"
                        onClick={(e) => app.copyToClipboard()}><Localization name="copy"/></div>
                      <br/>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.showLogin()}><Localization name="done"/></div>
                    </td>
                  </tr>
                  <tr id="your-account">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="yourPrimaryAccount"/></div>
                      <br/>{app.getAccountZero()}
                      <div className="gray_on_yellow"><Localization name="yourCamoAccount"/></div>
                      <br/>{app.getCamoAccount()}
                    </td>
                  </tr>
                  <tr id="your-representative">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="yourCurrentRepresentative"/></div>
                      <br/>{app.getAccountRepresentative()}
                      <hr/>
                      <div className="gray_on_yellow"><Localization name="yourCamoRepresentative"/></div>
                      <br/>{app.getCamoRepresentative()}
                    </td>
                  </tr>
                  <tr id="update-representative">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="newRepresentative"/> (ban_ or camo_)</div>
                      <br/>
                      <LocalizationInput className="monospace no_pad" type="text" size="67" maxLength="65" id="newRepresentative"
                        placeholder="representative"/>
                      <hr/>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.updateRepresentative()}><Localization name="updateRepresentative"/></div>
                    </td>
                  </tr>
                  <tr id="pending">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <Localization name="autoRecieve"/><br/>
                      <Localization name="nextAutoRecieve"/>&nbsp;{app.getAutoRecieveCountdown()}<br/>
                      <AutoRecieveButton/>
                      <br/>
                      <div className="gray_on_yellow"><Localization name="pending"/></div>
                      <br/>
                      <table className="w100pct no_border whitespace_nowrap">
                        {
                        app.getPending().map((item, index) => {
                          if (item.firstHashForSourceAccount) {
                            return (
                              <tbody key={index}>
                                <tr>
                                  <td className="no_border no_padding" colSpan="6">{item.sourceAccount}</td>
                                </tr>
                                <tr>
                                  <td className="no_border no_padding">{item.n}</td>
                                  <td className="no_border no_padding">
                                    <a href={item.detailsUrl} onClick={(e) => onLinkClick(e)}>{item.hash}</a>
                                  </td>
                                  <td className="no_border no_padding">{item.banano}</td>
                                  <td className="no_border no_padding">{item.banoshi}</td>
                                  <td className="no_border no_padding">{item.raw}</td>
                                  <td className="no_border no_padding">
                                    <DisableableButton
                                      name="receive"
                                      onClick={(e) => app.receivePending(item.hash, item.seedIx)}/>
                                  </td>
                                </tr>
                              </tbody>
                            )
                          }
                          else {
                            return (
                              <tbody key={index}>
                                <tr>
                                  <td className="no_border no_padding">{item.n}</td>
                                  <td className="no_border no_padding">
                                    <a href={item.detailsUrl} onClick={(e) => onLinkClick(e)}>{item.hash}</a>
                                  </td>
                                  <td className="no_border no_padding">{item.banano}</td>
                                  <td className="no_border no_padding">{item.banoshi}</td>
                                  <td className="no_border no_padding">{item.raw}</td>
                                  <td className="no_border no_padding">
                                    <DisableableButton
                                      name="receive"
                                      onClick={(e) => app.receivePending(item.hash, item.seedIx)}/>
                                  </td>
                                </tr>
                              </tbody>
                            )
                          }
                        })
                        }
                      </table>
                      <div className="gray_on_yellow"><Localization name="camoPending"/></div>
                      <br/>
                      <table className="w100pct no_border whitespace_nowrap">
                          {
                            app.getCamoPending().map((item, index) => {
                              if (item.firstHashForSendToAccount) {
                                return (
                                  <tbody key={index}>
                                    <tr>
                                      <td className="no_border no_padding" colSpan="6">{item.sendToAccount}</td>
                                    </tr>
                                    <tr>
                                      <td className="no_border no_padding">{item.n}</td>
                                      <td className="no_border no_padding">
                                        <a href={item.detailsUrl} onClick={(e) => onLinkClick(e)}>{item.hash}</a>
                                      </td>
                                      <td className="no_border no_padding">{item.banano}</td>
                                      <td className="no_border no_padding">{item.banoshi}</td>
                                      <td className="no_border no_padding">{item.raw}</td>
                                      <td className="no_border no_padding">
                                        <DisableableButton
                                          name="receive"
                                          onClick={(e) => app.receiveCamoPending(item.seedIx, item.sendToAccount, item.sharedSeedIx, item.hash, item.totalRaw)}/>
                                      </td>
                                    </tr>
                                  </tbody>
                                )
                              } else {
                                return (
                                  <tbody key={index}>
                                    <tr>
                                      <td className="no_border no_padding">{item.n}</td>
                                      <td className="no_border no_padding">
                                        <a href={item.detailsUrl} onClick={(e) => onLinkClick(e)}>{item.hash}</a>
                                      </td>
                                      <td className="no_border no_padding">{item.banano}</td>
                                      <td className="no_border no_padding">{item.banoshi}</td>
                                      <td className="no_border no_padding">{item.raw}</td>
                                      <td className="no_border no_padding">
                                        <DisableableButton
                                          name="receive"
                                          onClick={(e) => app.receiveCamoPending(item.seedIx, item.sendToAccount, item.sharedSeedIx, item.hash, item.totalRaw)}/>
                                      </td>
                                    </tr>
                                  </tbody>
                                )
                              }
                            })
                          }
                      </table>
                    </td>
                  </tr>
                  <tr id="transaction-list-small">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="` display_inline_block"><Localization name="previousTransactions"/> ({app.getTransactionHistoryByAccount().length + ' '}
                        <Localization name="total"/>)</div>
                      <div className="float_right display_inline_block">{app.getBlockchainState().count + ' '}
                        <Localization name="blocks"/></div>
                      <br/>
                      <table className="w100pct no_border whitespace_nowrap">
                        <tbody>
                          {
                            app.getTransactionHistoryByAccount().map((item, index) => {
                              if (index > 2) {
                                return undefined;
                              }
                              if(item.account) {
                                return (<tr key={index}>
                                  <td colSpan="5" className="no_border no_padding">{item.account}</td>
                                  </tr>
                                )
                              } else {
                                return (<tr key={index}>
                                  <td className="no_border no_padding">{item.n}</td>
                                  <td className="no_border no_padding">
                                    <TransactionHistoryElementIcon item={item}/>{/* item.type */}
                                  </td>
                                  <td className="no_border no_padding">{item.value + ' '}
                                    BAN</td>
                                  <td className="no_border no_padding">
                                    <a href={item.txDetailsUrl} onClick={(e) => onLinkClick(e)}>{item.txHash}</a>
                                  </td>
                                  <td className="no_border no_padding">
                                    {item.time}
                                  </td>
                                </tr>)
                              }
                            })
                          }
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr id="transaction-list-large">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="` display_inline_block"><Localization name="previousTransactions"/> ({app.getTransactionHistoryByAccount().length + ' '}
                        <Localization name="total"/>)</div>
                      <div className="float_right display_inline_block">{app.getBlockchainState().count + ' '}
                        <Localization name="blocks"/></div>
                      <p></p>
                      <div className="h440px overflow_auto">
                        <table className="w100pct no_border whitespace_nowrap">
                          <tbody>
                            {
                              app.getTransactionHistoryByAccount().map((item, index) => {
                                if(item.account) {
                                  return (<tr key={index}>
                                    <td colSpan="5" className="darkgray_border no_padding">{item.account}</td>
                                    </tr>
                                  )
                                } else {
                                  return (<tr key={index}>
                                    <td className="no_border no_padding">{item.n}</td>
                                    <td className="no_border no_padding">
                                      <TransactionHistoryElementIcon item={item}/>{/* item.type */}
                                    </td>
                                    <td className="no_border no_padding">{item.value + ' '}
                                      BAN</td>
                                    <td className="no_border no_padding">
                                      <a href={item.txDetailsUrl} onClick={(e) => onLinkClick(e)}>{item.txHash}</a>
                                    </td>
                                    <td className="no_border no_padding">
                                      {item.time}
                                    </td>
                                  </tr>)
                                }
                              })
                            }
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                  <tr id="from-account">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="fromAccount"/></div>
                      <br/>
                      <SendFromSeedIxField/>
                    </td>
                  </tr>
                  <tr id="to-account">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="toAccount"/></div>
                      <br/>
                      <SendToAccountField/>
                    </td>
                  </tr>
                  <tr id="send-amount">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="sendAmount"/></div>
                      <br/>
                      <LocalizationInput style={{
                          fontFamily: 'monospace'
                        }} type="text" size="64" id="sendAmount" placeholder="sendAmount"/>
                    </td>
                  </tr>
                  <tr id="send-spacer-01">
                    <td className="yellow_on_brown h200px no_border">
                      <div className="gray_on_yellow"><Localization name="balanceStatus"/></div>
                      <br/> {app.getBalanceStatus()}
                      <br/>
                      <div className="gray_on_yellow"><Localization name="sendStatus"/></div>
                      <br/>
                      <table>
                        <tbody>
                          {
                            app.sendToAccountStatuses.map((sendToAccountStatus, index) => {
                              return (<tr key={index}>
                                <td>{sendToAccountStatus}</td>
                              </tr>)
                            })
                          }
                          {
                            app.sendToAccountLinks.map((item, index) => {
                              return (<tr key={index}>
                                <td>
                                  <a href={item.txDetailsUrl} onClick={(e) => onLinkClick(e)}>{item.txHash}</a>
                                </td>
                              </tr>)
                            })
                          }
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr id="cancel-confirm-transaction">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow"><Localization name="confirm"/></div>
                      <p></p>
                      <DisableableButton
                        name="confirm"
                        onClick={(e) =>app.sendAmountToAccount()}/>
                    </td>
                  </tr>
                  <tr id="to-account-is-camo">
                    <td className="yellow_on_brown h120px darkgray_border bordered">
                      <UseCamoButton/>
                    </td>
                  </tr>
                  <tr id="account-book">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="h440px overflow_auto">
                      <div className="gray_on_yellow"><Localization name="accountBook"/></div>
                      <br/>
                        <table className="w100pct no_border whitespace_nowrap">
                          <tbody>
                            <tr>
                              <td className="no_border no_padding">N</td>
                              <td className="no_border no_padding"><Localization name="account"/></td>
                              <td className="no_border no_padding"><Localization name="camo"/></td>
                              <td className="no_border no_padding"><Localization name="delete"/></td>
                            </tr>
                            {
                              app.getAccountBook().map((item, index) => {
                                return (<tr key={index}>
                                  <td className="no_border no_padding">{item.n}</td>
                                  <td className="no_border no_padding">{item.account}</td>
                                  <td className="no_border no_padding">{item.checkCamoPending}
                                    <CamoIcon item={item}/>
                                  </td>
                                  <td className="no_border no_padding">
                                    <DeleteAccountFromBookButton item={item}/>
                                  </td>
                                </tr>)
                              })
                            }
                          </tbody>
                        </table>
                        <div className="gray_on_yellow"><Localization name="addAccount"/></div>
                        <br/>
                        <LocalizationInput style={{
                            fontFamily: 'monospace'
                          }} type="text" size="65" id="newBookAccount" placeholder="newAccount"/>
                        <p></p>
                        <div className="yellow_on_black gray_border bordered display_inline_block float_right fake_button rounded padding_5px"
                          onClick={(e) => app.addAccountToBook()}><Localization name="addAccountToBook"/></div>
                      </div>
                    </td>
                  </tr>
                  <tr id="please-wait">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="display_inline_block"><Localization name="pleaseWait"/>:</div>
                      <div className="display_inline_block">{app.getPleaseWaitStatus()}</div>
                    </td>
                  </tr>
                  <tr id="alert">
                    <td className="black_on_yellow h20px darkgray_border bordered">
                      <div className="display_inline_block"><Localization name="alert"/>:</div>
                      <div className="display_inline_block">{app.getAlertMessage()}</div>
                      <DisableableButton
                        name="ok"
                        onClick={(e) =>app.hideAlert()}/>
                    </td>
                  </tr>
                  <tr id="send-to-list-file-select">
                    <td className="black_on_yellow h20px darkgray_border bordered">
                      <div className="h20px">
                        <a download="send-to-list.xlsx" target="_blank" href={app.getExampleWorkbookURL()}><Localization name="downloadExampleWorkbook"/></a>
                      </div>
                      <hr />
                      <Localization name="selectFileWithAccountAndAmountOfBananos"/>
                      <br />
                      <input id="exportExampleWorkbookFileDialog" type="file" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>)
  }
}
const renderApp = () => {
  ReactDOM.render(<App/>, document.getElementById('main'));
};
const onLoad = () => {
  app.init();
  app.setAppClipboard(clipboard);
  app.setAppDocument(document);
  app.setRenderApp(renderApp);
  renderApp();
  app.showLogin();
}

/** call initialization functions */
window.onload = onLoad;
