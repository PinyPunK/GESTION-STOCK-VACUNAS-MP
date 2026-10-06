import type {VaccineLot} from '../hooks/useInventory';
import {normalizeLot} from './lotLookup';
export function normalizeScanCode(value:string){return String(value||'').normalize('NFC').trim();}
export function findScannedLots(lots:VaccineLot[],raw:string){const value=normalizeScanCode(raw);if(!value)return [];const exact=lots.filter(l=>l.scanCode&&normalizeScanCode(l.scanCode)===value);if(exact.length)return exact;const code=normalizeLot(value);const byVaccine=lots.filter(l=>normalizeLot(l.code)===code||normalizeLot(l.sivac)===code);if(byVaccine.length)return byVaccine;return lots.filter(l=>normalizeLot(l.lot)===code);}
