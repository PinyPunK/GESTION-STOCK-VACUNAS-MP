import {lazy,Suspense} from 'react';
import AuthGate from './components/AuthGate';
const Dashboard=lazy(()=>import('./Dashboard'));
export default function App(){return <AuthGate>{(access,onLogout)=><Suspense fallback={<p className="empty">Cargando tu espacio…</p>}><Dashboard access={access} onLogout={onLogout}/></Suspense>}</AuthGate>;}
