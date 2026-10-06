import type {VaccineLot} from '../hooks/useInventory';
export function normalizeLot(value:string){return String(value||'').normalize('NFKC').trim().replace(/[\u2010-\u2015\u2212]/g,'-').toLocaleUpperCase('es-ES');}
export function resolveLot(lots:VaccineLot[],text:string,choice:string){const key=normalizeLot(text);if(!key)return {matches:[] as VaccineLot[],selected:undefined};const matches=lots.filter(l=>normalizeLot(l.lot)===key);return {matches,selected:matches.length===1?matches[0]:matches.find(l=>l.id===choice)};}
export function searchLots(lots:VaccineLot[],text:string){const key=normalizeLot(text);if(!key)return lots;return lots.filter(l=>normalizeLot(l.lot).includes(key)||normalizeLot(l.code).includes(key)||normalizeLot(l.name).includes(key));}
