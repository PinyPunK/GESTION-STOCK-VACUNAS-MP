export function authError(error: unknown, mode: string): string {
 const e = error as {code?: number; message?: string};
 switch(e?.code){
  case 202: case 203: return 'Ya existe una cuenta con este correo. Pulsa «Ya tengo cuenta» para iniciar sesión o «Olvidé mi contraseña» para recuperarla.';
  case 200: return 'Introduce un correo electrónico válido.';
  case 201: return 'Introduce una contraseña para crear la cuenta.';
  case 204: case 205: return 'Comprueba que el correo electrónico esté escrito correctamente.';
  case 209: return 'La sesión anterior ha caducado. Recarga la página e inténtalo de nuevo.';
  case 101: return mode==='login'?'El correo o la contraseña no son correctos. Puedes recuperar la contraseña.':'No se ha encontrado la cuenta solicitada.';
  case 142: return 'La contraseña no cumple los requisitos de seguridad. Usa al menos 10 caracteres, combinando mayúsculas, minúsculas, números y símbolos.';
  case 100: return 'No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.';
  default: return `No se pudo ${mode==='signup'?'crear la cuenta':mode==='reset'?'enviar el enlace':'iniciar sesión'}${e?.code ? ` (error ${e.code})` : ''}. Inténtalo de nuevo; si persiste, comunica este mensaje al administrador.`;
 }
}
