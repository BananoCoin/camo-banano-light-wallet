"use strict";

/** imports */
const React = require('react');
const ReactDOM = require('react-dom');

const electron = require('electron');
const shell = electron.shell;
const remote = electron.remote;
const clipboard = electron.clipboard;

const Row = require('react-bootstrap').Row;
const Col = require('react-bootstrap').Col;
const Grid = require('react-bootstrap').Grid;
const Table = require('react-bootstrap').Table;

/** modules */

const app = require('./app.js');

const openDevTools = () => {
  try {
    const window = remote.getCurrentWindow();
    window.webContents.openDevTools();
  } catch (e) {
    alert(`error:${e}`);
  }
};

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
      <input style={{
          fontFamily: 'monospace'
        }} type="text" size="64" id="sendToAccount" placeholder="Send To Account"></input>
    )
  }
}

const DisableableButton = (props) => {
  const name = props.name;
  const onClick = props.onClick;
  if(app.isUpdateInProgress()) {
    return (
      <div className="black_on_gray bordered display_inline_block float_right fake_button rounded padding_5px"
      >{name}</div>
    )
  } else {
    return (
      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
        onClick={(e) => {
          onClick();
        }}>{name}</div>
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
        <div className="gray_on_yellow">Using Camo To Send Transaction</div>
        <div className="black_on_gray gray_border bordered display_inline_block float_right fake_button_disabled rounded padding_5px">Enable Camo</div>
        <DisableableButton
          name="Disable Camo"
          onClick={(e) => app.setUseCamo(false)}/>
        <div className="gray_on_yellow">First Account With No Transactions</div>
        <p>{app.getAccountNoHistoryOrPending()}</p>
        <div className="gray_on_yellow">Shared Account Information {app.getCamoSharedAccountData().length} rows.</div>
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
                  Account &nbsp;
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
                  Account &nbsp;
                  {item.account} &nbsp;
                  {item.balance} &nbsp;
                  BAN
                  </div>
                  <p></p>
                  <DisableableButton
                    name="Send Shared Account Balance To First Account With No Transactions"
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
        <div className="gray_on_yellow">Sending Regular Transaction</div>
        <DisableableButton
          name="Enable Camo"
          onClick={(e) => app.setUseCamo(true)}/>
        <div className="black_on_gray gray_border bordered display_inline_block float_right fake_button_disabled rounded padding_5px">Disable Camo</div>
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
                      Camo Banano
                      <br/>
                      <Version/>
                    </td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown h20px no_border"></td>
                  </tr>
                  <tr>
                    <td>
                      Network
                      <select value={app.currentNetworkIx} name="network"
                        onChange={(e) => changeNetwork(e)}
                        disabled={app.isUpdateInProgress()}>
                        <option value="0">{app.NETWORKS[0].NAME}</option>
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
                      Home</td>
                  </tr>
                  <tr>
                    <td id='send' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showSend()}>
                      <img className="valign_middle svg" src="artwork/send.svg"></img>&nbsp;
                      Send</td>
                  </tr>
                  <tr>
                    <td id='receive' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showReceive()}>
                      <img className="valign_middle svg" src="artwork/receive.svg"></img>&nbsp;
                      Receive</td>
                  </tr>
                  <tr>
                    <td id='transactions' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showTransactions()}>
                      <img className="valign_middle svg" src="artwork/transactions.svg"></img>&nbsp;
                      Transactions</td>
                  </tr>
                  <tr>
                    <td id='representatives' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showRepresentatives()}>
                      <img className="valign_middle svg" src="artwork/representatives.svg"></img>&nbsp;
                      Representative</td>
                  </tr>
                  <tr>
                    <td id='accounts' className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showAccountBook()}>
                      <img className="valign_middle svg" src="artwork/accounts.svg"></img>&nbsp;
                      Account Book</td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown h200px no_border"></td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.requestAllBlockchainData()}>Refresh</td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => app.showLogin()}>Logout</td>
                  </tr>
                  <tr>
                    <td className="yellow_on_brown_with_hover h20px fake_button"
                      onClick={(e) => openDevTools()}>Show Dev Tools</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td className="valign_top no_border no_padding">
              <table className="w626px no_border no_padding">
                <tbody>
                  <tr id="camo-banano-branding" className="no_border no_padding">
                    <td className="h225px w595px no_border no_padding">
                      <div className="branding_container">
                        <a href="https://banano.cc/" onClick={(e) => onLinkClick(e)}>
                        <img className="h200px w200px no_border no_padding" src="artwork/cfccamobanano.png"/>
                        </a>
                      </div>
                    </td>
                  </tr>
                  <tr id="ledger-login">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Ledger Status</div>
                      <p><LedgerMessage/>
                      </p>
                      <UseLedgerButton/>
                    </td>
                  </tr>
                  <tr id="seed-login">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Seed</div>
                      <p>Enter seed manually.</p>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.showSeedEntry()}>Enter Seed</div>
                    </td>
                  </tr>
                  <tr id="seed-reuse">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Reuse Stored Seed</div>
                      <p>Reuse a seed that you have stored previously.</p>
                      <DisableableButton name="Reuse Seed" onClick={(e) => app.showSeedReuse()} />
                    </td>
                  </tr>
                  <tr id="seed-reuse-entry">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Reuse Stored Seed</div>
                      <div className="gray_on_yellow">Seed Storage Password (Optional)</div>
                      <br/>
                      <input className="monospace no_pad" type="password" size="66" maxLength="64" id="reuseSeedPassword" placeholder="Storage Password (Optional)"></input>
                      <br/>
                      <br/>
                      <DisableableButton name="Reuse Stored Seed" onClick={(e) => app.reuseSeed()} />
                    </td>
                  </tr>
                  <tr id="seed-entry">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Seed</div>
                      <br/>
                      <input className="monospace no_pad" type="text" size="66" maxLength="64" id="seed" placeholder="Seed"></input>
                      <hr/>
                      <div className="gray_on_yellow">Store Seed</div>
                      <br/>
                      <input type="checkbox" id="storeSeed"></input>Store Seed Locally for Reuse
                      <br/>
                      <div className="gray_on_yellow">Seed Storage Password (Optional)</div>
                      <br/>
                      <input className="monospace no_pad" type="password" size="66" maxLength="64" id="storeSeedPassword" placeholder="Storage Password (Optional)"></input>
                      <br/>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.getAccountDataFromSeed()}>Use Seed</div>
                    </td>
                  </tr>
                  <tr id="private-key-generate">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Generate New Seed</div>
                      <p>Generate a new seed, to be used in this wallet.</p>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.showGenerateNewSeed()}>Generate Seed</div>
                    </td>
                  </tr>
                  <tr id="private-key-generator">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">New Seed</div>
                      {app.getGeneratedSeedHex()}
                      <br/>
                      <div className="yellow_on_black bordered display_inline_block float_left fake_button rounded padding_5px"
                        onClick={(e) => app.copyToClipboard()}>Copy</div>
                      <br/>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.showLogin()}>Done</div>
                    </td>
                  </tr>
                  <tr id="your-account">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Your Primary Account</div>
                      <br/>{app.getAccountZero()}
                      <div className="gray_on_yellow">Your Camo Account</div>
                      <br/>{app.getCamoAccount()}
                    </td>
                  </tr>
                  <tr id="your-representative">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Your Current Representative</div>
                      <br/>{app.getAccountRepresentative()}
                      <hr/>
                      <div className="gray_on_yellow">Your Camo Representative</div>
                      <br/>{app.getCamoRepresentative()}
                    </td>
                  </tr>
                  <tr id="update-representative">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">New Representative (can be ban_ or camo_)</div>
                      <br/>
                      <input className="monospace no_pad" type="text" size="67" maxLength="65" id="newRepresentative" placeholder="Representative"></input>
                      <hr/>
                      <div className="yellow_on_black bordered display_inline_block float_right fake_button rounded padding_5px"
                        onClick={(e) => app.updateRepresentative()}>Update Representative</div>
                    </td>
                  </tr>
                  <tr id="pending">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Pending</div>
                      <br/>
                      <table className="w100pct no_border whitespace_nowrap">
                        <tbody>
                          {
                            app.getPending().map((item, index) => {
                              return (<tr key={index}>
                                <td className="no_border no_padding">{item.n}</td>
                                <td className="no_border no_padding">
                                  <a href={item.detailsUrl} onClick={(e) => onLinkClick(e)}>{item.hash}</a>
                                </td>
                                <td className="no_border no_padding">{item.banano}</td>
                                <td className="no_border no_padding">{item.banoshi}</td>
                                <td className="no_border no_padding">{item.raw}</td>
                                <td className="no_border no_padding">
                                  <DisableableButton
                                    name="Receive"
                                    onClick={(e) => app.receivePending(item.hash, item.seedIx)}/>
                                </td>
                              </tr>)
                            })
                          }
                        </tbody>
                      </table>
                      <div className="gray_on_yellow">Camo Pending</div>
                      <br/>
                      <table className="w100pct no_border whitespace_nowrap">
                        <tbody>
                          {
                            app.getCamoPending().map((item, index) => {
                              return (<tr key={index}>
                                <td className="no_border no_padding">{item.n}</td>
                                <td className="no_border no_padding">
                                  <a href={item.detailsUrl} onClick={(e) => onLinkClick(e)}>{item.hash}</a>
                                </td>
                                <td className="no_border no_padding">{item.banano}</td>
                                <td className="no_border no_padding">{item.banoshi}</td>
                                <td className="no_border no_padding">{item.raw}</td>
                                <td className="no_border no_padding">
                                  <DisableableButton
                                    name="Receive"
                                    onClick={(e) => app.receiveCamoPending(item.seedIx, item.sendToAccount, item.sharedSeedIx, item.hash, item.totalRaw)}/>
                                </td>
                              </tr>)
                            })
                          }
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr id="transaction-list-small">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="` display_inline_block">Previous Transactions ({app.getTransactionHistoryByAccount().length + ' '}
                        total)</div>
                      <div className="float_right display_inline_block">{app.getBlockchainState().count + ' '}
                        Blocks</div>
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
                      <div className="` display_inline_block">Previous Transactions ({app.getTransactionHistoryByAccount().length + ' '}
                        total)</div>
                      <div className="float_right display_inline_block">{app.getBlockchainState().count + ' '}
                        Blocks</div>
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
                      <div className="gray_on_yellow">From Account</div>
                      <br/>
                      <SendFromSeedIxField/>
                    </td>
                  </tr>
                  <tr id="to-account">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">To Account</div>
                      <br/>
                      <SendToAccountField/>
                    </td>
                  </tr>
                  <tr id="send-amount">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="gray_on_yellow">Send Amount</div>
                      <br/>
                      <input style={{
                          fontFamily: 'monospace'
                        }} type="text" size="64" id="sendAmount" placeholder="Send Amount"></input>
                    </td>
                  </tr>
                  <tr id="send-spacer-01">
                    <td className="yellow_on_brown h200px no_border">
                      <div className="gray_on_yellow">Balance Status</div>
                      <br/> {app.getBalanceStatus()}
                      <br/>
                      <div className="gray_on_yellow">Send Status</div>
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
                      <div className="gray_on_yellow">Confirm</div>
                      <p></p>
                      <DisableableButton
                        name="Confirm"
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
                      <div className="gray_on_yellow">Account Book</div>
                      <br/>
                        <table className="w100pct no_border whitespace_nowrap">
                          <tbody>
                            <tr>
                              <td className="no_border no_padding">N</td>
                              <td className="no_border no_padding">Account</td>
                              <td className="no_border no_padding">Camo</td>
                              <td className="no_border no_padding">Delete</td>
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
                        <div className="gray_on_yellow">Add Account</div>
                        <br/>
                        <input style={{
                            fontFamily: 'monospace'
                          }} type="text" size="65" id="newBookAccount" placeholder="New Account"></input>
                        <p></p>
                        <div className="yellow_on_black gray_border bordered display_inline_block float_right fake_button rounded padding_5px"
                          onClick={(e) => app.addAccountToBook()}>Add Account To Book</div>
                      </div>
                    </td>
                  </tr>
                  <tr id="please-wait">
                    <td className="yellow_on_brown h20px darkgray_border bordered">
                      <div className="display_inline_block">Please Wait:</div>
                      <div className="display_inline_block">{app.getPleaseWaitStatus()}</div>
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
