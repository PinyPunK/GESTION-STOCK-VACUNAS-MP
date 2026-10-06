export default function configureOrders({serial,integer,acl,authorize,profile}){
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 Parse.Cloud.define('createVaccineOrder',({params:p,user})=>serial(async()=>{
 await authorize(user);const professional=await profile(user);
 if(!validDate(p.date)||p.date>new Date().toISOString().slice(0,10)||typeof p.number!=='string'||!p.number.trim()||p.number.length>60||!Array.isArray(p.lines)||!p.lines.length||p.lines.length>100)throw new Error('Completa la fecha, el número de pedido y al menos una vacuna.');
 if(await new Parse.Query('VaccineOrder').equalTo('number',p.number.trim()).first({useMasterKey:true}))throw new Error('Ya existe este número de pedido.');
 const codes=p.lines.map(l=>l.code);if(new Set(codes).size!==codes.length||p.lines.some(l=>!integer(l.quantity)||l.quantity<1))throw new Error('Las cantidades deben ser positivas, sin vacunas duplicadas.');
 const vaccines=await new Parse.Query('Vaccine').containedIn('code',codes).find({useMasterKey:true});const byCode=new Map(vaccines.map(v=>[v.get('code'),v]));if(vaccines.length!==codes.length)throw new Error('Selecciona vacunas registradas.');
 const order=new Parse.Object('VaccineOrder');order.set({number:p.number.trim(),date:p.date,status:'Pendiente',professional:professional.get('nif'),actor:user});order.setACL(acl());await order.save(null,{useMasterKey:true});
 const lines=p.lines.map(l=>{const v=byCode.get(l.code),row=new Parse.Object('OrderLine');row.set({order,vaccine:v,code:l.code,sivac:v.get('sivac'),name:v.get('name'),quantity:l.quantity,received:0});row.setACL(acl());return row;});await Parse.Object.saveAll(lines,{useMasterKey:true});return order.id;
 }));
 Parse.Cloud.define('receiveVaccineOrder',({params:p,user})=>serial(async()=>{
 await authorize(user);const professional=await profile(user);
 if(!p.lineId||!integer(p.quantity)||p.quantity<1||!validDate(p.date)||p.date>new Date().toISOString().slice(0,10)||!validDate(p.expiry)||p.expiry<p.date||typeof p.lot!=='string'||!p.lot.trim()||p.lot.length>100||typeof p.deliveryNote!=='string'||!p.deliveryNote.trim()||p.deliveryNote.length>60)throw new Error('Completa fecha, albarán, lote, caducidad y unidades válidas.');
 if(typeof p.operationId!=='string'||! /^[a-f0-9-]{36}$/i.test(p.operationId))throw new Error('Identificador de recepción no válido. Reabre el formulario.');
 const fingerprint=JSON.stringify([user.id,p.lineId,p.date,p.deliveryNote.trim(),p.lot.trim(),p.expiry,p.quantity]);
 const previous=await new Parse.Query('OrderReceipt').equalTo('operationId',p.operationId).first({useMasterKey:true});
 if(previous){if(previous.get('fingerprint')!==fingerprint)throw new Error('Este registro ya se recibió con otros datos. Reabre el formulario para una nueva recepción.');return previous.id;}
 const line=await new Parse.Query('OrderLine').include('order').get(p.lineId,{useMasterKey:true});const order=line.get('order');
 if(p.date<order.get('date'))throw new Error('La recepción no puede ser anterior al pedido.');
 if(order.get('status')==='Recibido'||p.quantity>line.get('quantity')-line.get('received'))throw new Error('La recepción supera las unidades pendientes de esta vacuna.');
 let lot=await new Parse.Query('VaccineLot').equalTo('code',line.get('code')).equalTo('lot',p.lot.trim()).first({useMasterKey:true});
 if(lot&&lot.get('expiry')!==p.expiry)throw new Error('Este lote ya tiene otra caducidad registrada.');
 if(!lot){lot=new Parse.Object('VaccineLot');lot.set({vaccine:line.get('vaccine'),code:line.get('code'),sivac:line.get('sivac'),name:line.get('name'),lot:p.lot.trim(),expiry:p.expiry,stocks:{'Nevera 2B':0,'Nevera 3B':0,'Cajón consulta':0}});lot.setACL(acl());}
 const stocks={...lot.get('stocks')};stocks['Nevera 2B']+=p.quantity;lot.set('stocks',stocks);await lot.save(null,{useMasterKey:true});
 const receipt=new Parse.Object('OrderReceipt');receipt.set({order,line,vaccineLot:lot,operationId:p.operationId,fingerprint,orderNumber:order.get('number'),date:p.date,deliveryNote:p.deliveryNote.trim(),code:line.get('code'),sivac:line.get('sivac'),name:line.get('name'),lot:p.lot.trim(),expiry:p.expiry,quantity:p.quantity,warehouse:'Nevera 2B',professional:professional.get('nif'),actor:user});receipt.setACL(acl());await receipt.save(null,{useMasterKey:true});
 line.increment('received',p.quantity);await line.save(null,{useMasterKey:true});
 const all=await new Parse.Query('OrderLine').equalTo('order',order).find({useMasterKey:true});order.set('status',all.every(l=>l.get('received')>=l.get('quantity'))?'Recibido':'Parcial');await order.save(null,{useMasterKey:true});
 const movement=new Parse.Object('VaccineMovement');movement.set({vaccineLot:lot,receipt,order,code:line.get('code'),sivac:line.get('sivac'),name:line.get('name'),lot:p.lot.trim(),expiry:p.expiry,movementDate:p.date,professional:professional.get('nif'),actor:user,type:'in',reason:'Recepción de pedido',source:'Proveedor',destination:'Nevera 2B',quantity:p.quantity,note:`Pedido ${order.get('number')} · Albarán ${p.deliveryNote.trim()}`,nhc:''});movement.setACL(acl());await movement.save(null,{useMasterKey:true});return receipt.id;
 }));
};
