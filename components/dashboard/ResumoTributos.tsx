import {memo,useMemo} from 'react'; 
 export interface TributoDetalhadoItem{nome:string;mercadoriaInterno:number;mercadoriaExterno:number;servicoInterno:number;servicoExterno:number;} 
 interface ResumoTributosProps{dados:TributoDetalhadoItem[]|undefined;darkMode?:boolean;} 
 export const ResumoTributos=memo(function ResumoTributos({dados,darkMode=false}:ResumoTributosProps){ 
 const fmt=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}).format(v); 
 const{totais,cols}=useMemo(()=>{ 
 const ini={mi:0,me:0,si:0,se:0,total:0};if(!dados||!dados.length)return{totais:ini,cols:{mi:false,me:false,si:false,se:false}}; 
 const s=dados.reduce((a,i)=>{const t=i.mercadoriaInterno+i.mercadoriaExterno+i.servicoInterno+i.servicoExterno; 
 return{mi:a.mi+i.mercadoriaInterno,me:a.me+i.mercadoriaExterno,si:a.si+i.servicoInterno,se:a.se+i.servicoExterno,total:a.total+t};},ini); 
 return{totais:s,cols:{mi:s.mi>0,me:s.me>0,si:s.si>0,se:s.se>0}};},[dados]); 
 if(!dados||!dados.length)return(<div className={`text-center py-8 ${darkMode?'text-slate-400':'text-slate-500'}`}>Sem dados.</div>); 
 const tp=darkMode?'text-slate-200':'text-gray-800';const ts=darkMode?'text-slate-400':'text-gray-600'; 
 const bc=darkMode?'border-slate-700':'border-gray-200';const hbg=darkMode?'bg-slate-800':'bg-gray-50'; 
 const rh=darkMode?'hover:bg-slate-700/50':'hover:bg-gray-50';const ft=darkMode?'bg-slate-700':'bg-gray-100'; 
 return(<div className="w-full space-y-4"><div><h4 className={`font-bold text-lg ${tp}`}>Detalhamento</h4></div> 
 <div className={`w-full overflow-x-auto rounded-lg border ${bc}`}><table className="w-full text-sm text-left whitespace-nowrap"> 
 <thead className={`${hbg} text-xs uppercase font-semibold ${ts}`}><tr><th className="py-3 pl-4 text-left">Tributo</th> 
 {cols.mi&&<th className="py-3 px-3 text-right text-blue-500">Merc.(Int)</th>}{cols.me&&<th className="py-3 px-3 text-right text-blue-500">Merc.(Ext)</th>} 
 {cols.si&&<th className="py-3 px-3 text-right text-indigo-500">Serv.(Int)</th>}{cols.se&&<th className="py-3 px-3 text-right text-indigo-500">Serv.(Ext)</th>} 
 <th className={`py-3 px-4 text-right font-bold ${darkMode?'text-slate-100':'text-gray-900'}`}>Total</th></tr></thead> 
 <tbody className={`divide-y ${bc}`}>{dados.map((i,x)=>{const t=i.mercadoriaInterno+i.mercadoriaExterno+i.servicoInterno+i.servicoExterno;if(t===0)return null; 
 return(<tr key={x} className={`transition ${rh}`}><td className={`py-3 pl-4 font-medium ${tp}`}>{i.nome}</td> 
 {cols.mi&&<td className={`py-3 px-3 text-right ${ts}`}>{fmt(i.mercadoriaInterno)}</td>}{cols.me&&<td className={`py-3 px-3 text-right ${ts}`}>{fmt(i.mercadoriaExterno)}</td>} 
 {cols.si&&<td className={`py-3 px-3 text-right ${ts}`}>{fmt(i.servicoInterno)}</td>}{cols.se&&<td className={`py-3 px-3 text-right ${ts}`}>{fmt(i.servicoExterno)}</td>} 
 <td className="py-3 px-4 text-right font-bold text-purple-600">{fmt(t)}</td></tr>);})} 
 <tr className={`${ft} font-bold border-t-2 ${bc}`}><td className={`py-3 pl-4 ${tp}`}>TOTAL</td> 
 {cols.mi&&<td className="py-3 px-3 text-right text-blue-600">{fmt(totais.mi)}</td>}{cols.me&&<td className="py-3 px-3 text-right text-blue-600">{fmt(totais.me)}</td>} 
 {cols.si&&<td className="py-3 px-3 text-right text-indigo-600">{fmt(totais.si)}</td>}{cols.se&&<td className="py-3 px-3 text-right text-indigo-600">{fmt(totais.se)}</td>} 
 <td className="py-3 px-4 text-right text-purple-700 text-base">{fmt(totais.total)}</td></tr></tbody></table></div></div>);});