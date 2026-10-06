const ROLE_ADMIN='Administradores',ROLE_STAFF='Profesionales';
async function role(name){return new Parse.Query(Parse.Role).equalTo('name',name).first({useMasterKey:true});}
async function member(user,name){if(!user)return false;const r=await role(name);return !!r&&!!await r.getUsers().query().equalTo('objectId',user.id).first({useMasterKey:true});}
async function authorize(user,admin=false){if(!user)throw new Error('Inicia sesión para continuar.');if(!await member(user,admin?ROLE_ADMIN:ROLE_STAFF))throw new Error(admin?'Esta acción está reservada a la cuenta administradora.':'Introduce un código de invitación válido para acceder.');return user;}
function privateACL(){const a=new Parse.ACL();a.setRoleReadAccess(ROLE_STAFF,true);return a;}
function validNif(nif){if(!/^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(nif))return false;const number=nif.slice(0,-1).replace(/^X/,'0').replace(/^Y/,'1').replace(/^Z/,'2');return 'TRWAGMYFPDXBNJZSQVHLCKE'[Number(number)%23]===nif.slice(-1);}
async function profile(user){const p=await new Parse.Query('Professional').equalTo('user',user).first({useMasterKey:true});if(!p)throw new Error('Completa tu NIF profesional antes de registrar operaciones.');return p;}
Parse.Cloud.beforeSave('_Role',r=>{if(!r.master)throw new Error('Los permisos solo se gestionan por el administrador.');});
Parse.Cloud.beforeDelete('_Role',r=>{if(!r.master)throw new Error('No se pueden eliminar permisos.');});
Parse.Cloud.define('accessStatus',async r=>{
 if(!r.user)return {authorized:false};
 const [authorized,admin,p]=await Promise.all([member(r.user,ROLE_STAFF),member(r.user,ROLE_ADMIN),new Parse.Query('Professional').equalTo('user',r.user).first({useMasterKey:true})]);
 return {authorized,admin,nif:p?.get('nif')||'',hasProfile:!!p,setupAvailable:false};
});
Parse.Cloud.define('listProfessionals',async r=>{await authorize(r.user,true);const ps=await new Parse.Query('Professional').include('user').find({useMasterKey:true});return Promise.all(ps.map(async p=>({id:p.id,userId:p.get('user').id,email:p.get('email'),nif:p.get('nif'),authorized:await member(p.get('user'),ROLE_STAFF),admin:await member(p.get('user'),ROLE_ADMIN)})));});
export {authorize,privateACL,profile,member,role,validNif};
