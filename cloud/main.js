const warehouses = ['Nevera 2B','Nevera 3B','Cajón consulta'];
import {authorize,privateACL as acl,profile,member,role,validNif} from './access.js';
import configureOrders from './orders.js';
import configureChanges from './recordChanges.js';
import configureInvitations from './invitations.js';
for(const cls of ['Product','Movement','Vaccine','VaccineLot','VaccineMovement','VaccineOrder','OrderLine','OrderReceipt','Professional','RecordChange','Invitation']) {
 Parse.Cloud.beforeSave(cls,r=>{if(!r.master)throw new Error('Utiliza los formularios de inventario.');});
 Parse.Cloud.beforeDelete(cls,r=>{if(!r.master)throw new Error('La eliminación no está disponible.');});
 if(cls!=='Professional')Parse.Cloud.beforeFind(cls,async r=>{if(!r.master)await authorize(r.user,cls==='Invitation');});
}
let queue=Promise.resolve();
const serial=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
const integer=n=>Number.isInteger(n)&&n>=0&&n<=1000000;
Parse.Cloud.define('registerVaccineLot',({params:p,user})=>serial(async()=>{
 await authorize(user);const professional=await profile(user);
 for(const key of ['code','sivac','name','lot'])if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>100)throw new Error('Completa todos los datos de la vacuna y el lote.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.expiry||'')||Number.isNaN(Date.parse(p.expiry))||new Date(p.expiry).toISOString().slice(0,10)!==p.expiry)throw new Error('Introduce una fecha de caducidad válida.');
 for(const w of warehouses)if(!integer(p.stocks?.[w])||!integer(p.minimum?.[w]))throw new Error('Las unidades y los mínimos deben ser números enteros no negativos.');
 const code=p.code.trim().toUpperCase(),lot=p.lot.trim();
 if(p.scanCode!==undefined&&p.scanCode!==null&&(typeof p.scanCode!=='string'||p.scanCode.trim().length>512||p.scanCode.includes('\u0000')))throw new Error('El código QR / barras no es válido o supera 512 caracteres.');
 const scanCode=String(p.scanCode||'').normalize('NFC').trim();
 if(await new Parse.Query('VaccineLot').equalTo('code',code).equalTo('lot',lot).first({useMasterKey:true}))throw new Error('Este lote ya está registrado para esta vacuna. Utiliza una entrada para añadir unidades.');
 let vaccine=await new Parse.Query('Vaccine').equalTo('code',code).first({useMasterKey:true});
 if(vaccine&&(vaccine.get('sivac')!==p.sivac.trim()||vaccine.get('name')!==p.name.trim()))throw new Error('El código ya pertenece a otra ficha. Usa el mismo nombre y código SIVAC.');
 if(!vaccine){vaccine=new Parse.Object('Vaccine');vaccine.set({code,sivac:p.sivac.trim(),name:p.name.trim(),minimum:p.minimum});vaccine.setACL(acl());await vaccine.save(null,{useMasterKey:true});}
 const record=new Parse.Object('VaccineLot');record.set({vaccine,code,sivac:vaccine.get('sivac'),name:vaccine.get('name'),lot,expiry:p.expiry,scanCode,stocks:p.stocks});record.setACL(acl());await record.save(null,{useMasterKey:true});
 const entries=warehouses.filter(w=>p.stocks[w]>0).map(w=>{const m=new Parse.Object('VaccineMovement');m.set({vaccineLot:record,name:record.get('name'),code,lot,expiry:p.expiry,professional:professional.get('nif'),actor:user,type:'initial',reason:'Registro inicial',source:'',destination:w,quantity:p.stocks[w],note:''});m.setACL(acl());return m;});
 if(entries.length)await Parse.Object.saveAll(entries,{useMasterKey:true});return record.id;
}));
Parse.Cloud.define('moveVaccine',({params:p,user})=>serial(async()=>{
 await authorize(user);const professional=await profile(user);
 if(p.type==='out'&&!['39714299S','40888694F','47106285P','19989298K'].includes(p.professional))throw new Error('Selecciona el profesional que suministra la vacuna.');
 if(p.type==='out'&&(typeof p.nhc!=='string'||!p.nhc.trim()||p.nhc.length>40||! /^[A-Za-z0-9-]+$/.test(p.nhc.trim())))throw new Error('Introduce un NHC válido (letras, números o guiones).');
 if(!p.lotId||!['transfer','in','out','return','waste'].includes(p.type)||!integer(p.quantity)||p.quantity<1)throw new Error('Selecciona un lote e introduce una cantidad positiva.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.movementDate||'')||Number.isNaN(Date.parse(p.movementDate))||new Date(p.movementDate).toISOString().slice(0,10)!==p.movementDate||p.movementDate>new Date().toISOString().slice(0,10))throw new Error('Introduce una fecha válida, no posterior a hoy.');
 if(p.type!=='in'&&!warehouses.includes(p.source))throw new Error('Selecciona el almacén de origen.');
 if(['in','transfer'].includes(p.type)&&!warehouses.includes(p.destination))throw new Error('Selecciona el almacén de destino.');
 if(p.type==='transfer'&&p.source===p.destination)throw new Error('El origen y el destino deben ser diferentes.');
 if(p.type==='out'&&p.reason!=='Suministro a pacientes')throw new Error('Selecciona suministro a pacientes para una salida.');
 if(p.type==='waste'&&!['Baja por rotura','Baja por caducidad'].includes(p.reason))throw new Error('Selecciona el motivo de la baja.');
 const lot=await new Parse.Query('VaccineLot').get(p.lotId,{useMasterKey:true});const stocks={...lot.get('stocks')};
 if(p.type!=='in'&&stocks[p.source]<p.quantity)throw new Error('No hay unidades suficientes en el almacén de origen.');
 if(p.type==='out'&&lot.get('expiry')<p.movementDate)throw new Error('No se permite suministrar a pacientes un lote caducado en la fecha del movimiento.');
 if(p.type==='waste'&&p.reason==='Baja por caducidad'&&lot.get('expiry')>=p.movementDate)throw new Error('El lote no estaba caducado en la fecha indicada.');
 if(p.type!=='in')stocks[p.source]-=p.quantity;if(['in','transfer'].includes(p.type))stocks[p.destination]+=p.quantity;
 lot.set('stocks',stocks);await lot.save(null,{useMasterKey:true});
 const m=new Parse.Object('VaccineMovement');m.set({vaccineLot:lot,name:lot.get('name'),code:lot.get('code'),sivac:lot.get('sivac'),lot:lot.get('lot'),expiry:lot.get('expiry'),movementDate:p.movementDate,professional:p.type==='out'?p.professional:professional.get('nif'),actor:user,nhc:p.type==='out'?p.nhc.trim():'',type:p.type,reason:p.type==='in'?'Entrada manual de proveedor':p.type==='transfer'?'Transferencia':p.type==='return'?'Devolución por caducidad próxima':p.reason,source:p.type==='in'?'Proveedor':p.source,destination:p.type==='out'?'Paciente':p.type==='return'?'Proveedor':p.type==='waste'?'Baja':p.destination,quantity:p.quantity,note:String(p.note||'').slice(0,300)});m.setACL(acl());await m.save(null,{useMasterKey:true});return m.id;
}));
configureOrders({serial,integer,acl,authorize,profile});
configureChanges({serial,integer,acl,authorize,profile});
configureInvitations({serial,authorize,member,role,validNif,privateACL:acl});
