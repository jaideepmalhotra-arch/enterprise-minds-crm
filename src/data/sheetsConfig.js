export const SHEETS_CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbw3fjUzgDoRaHXbXi3thmCEZCFdn4PhdWiRmmAAnJHV2qxoZffSiLOlN7DYasn5Iw/exec',
  SHEET_ID:   '1vdibpwuHZJay3O7eEvJ8axwp33dqkLBEb8tghauTbZU',
  TABS: { CONTACTS:'Contacts', IMPORTS:'Imports' },
};
export const SHEETS_CONNECTED = !!(SHEETS_CONFIG.SCRIPT_URL && SHEETS_CONFIG.SHEET_ID);
