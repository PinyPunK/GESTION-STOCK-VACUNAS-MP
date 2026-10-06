import {WAREHOUSES,type VaccineLot} from '../hooks/useInventory';
export function balancesByCode(lots:VaccineLot[]){const balances=new Map<string,Record<string,number>>();for(const l of lots){const b=balances.get(l.code)||{};for(const w of WAREHOUSES)b[w]=(b[w]||0)+(l.stocks[w]||0);balances.set(l.code,b);}return balances;}
export function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function formatDate(date:string){return new Date(date+'T12:00:00').toLocaleDateString('es-ES');}
