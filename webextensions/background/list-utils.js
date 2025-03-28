/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  log,
} from '/common/common.js';

async function getListFromAddress(address) {
  log('getListFromAddress: ', address);
  try {
    const addressbooks = await browser.addressBooks.list();
    for (const addressbook of addressbooks) {
      log('checking addressbook: ', addressbook);
      const mailingLists = await browser.mailingLists.list(addressbook.id);
      for (const mailingList of mailingLists) {
        log('checking list: ', mailingList);
        if (address == `${mailingList.name} <${mailingList.description || mailingList.name}>`) {
          log(' => matched!');
          return mailingList;
        }
      }
    }
  }
  catch(error) {
    log(' => error: ', error);
  }
  return null;
}

function contactToAddress(contact) {
  let displayName = contact.properties.DisplayName;
  if (!displayName) {
    const nameElements = [];
    if (contact.properties.FirstName)
      nameElements.push(contact.properties.FirstName);
    if (contact.properties.LastName)
      nameElements.push(contact.properties.LastName);
    if (configs.showLastNameFirst)
      nameElements.reverse();
    displayName = nameElements.join(' ');
  }
  const address = contact.properties.PrimaryEmail || contact.properties.SecondEmail;
  if (displayName)
    return `${displayName} <${address}>`;
  return address;
}

async function populateListAddresses(addresses) {
  const failedLists = [];
  const populated = await Promise.all(addresses.map(async address => {
    try {
      const list = await getListFromAddress(address);
      if (!list)
        return address;
      const contacts = await browser.mailingLists.listMembers(list.id);
      return contacts.map(contactToAddress);
    }
    catch(error) {
      log(`failed to populate the list ${address}: `, error);
      failedLists.push(address);
      return [];
    }
  }));
  return [populated.flat(), failedLists];
}

export async function populateAllListAddresses(details) {
  const failedLists = [];
  const [to, cc, bcc] = await Promise.all([
    populateListAddresses(details.to || details.recipients || []).then(([addresses, lists]) => {
      failedLists.push(...lists);
      return addresses;
    }),
    populateListAddresses(details.cc || details.ccList || []).then(([addresses, lists]) => {
      failedLists.push(...lists);
      return addresses;
    }),
    populateListAddresses(details.bcc || details.bccList || []).then(([addresses, lists]) => {
      failedLists.push(...lists);
      return addresses;
    }),
  ])
  return { to, cc, bcc, failedLists };
}
