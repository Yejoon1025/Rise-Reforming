import{r as a,j as r,l as p,L as l}from"./index-CMyaqqzd.js";function y(){const[t,e]=a.useState(!1);return a.useEffect(()=>{function s(n){n.clientY<80?e(!0):e(!1)}return window.addEventListener("mousemove",s),()=>window.removeEventListener("mousemove",s)},[]),r.jsxs("nav",{className:"fixed top-0 left-0 w-full flex items-center justify-between px-8 py-4 bg-transparent z-50",children:[r.jsx("div",{className:"flex items-center",children:r.jsx("img",{src:p,alt:"Logo",className:"h-14 w-auto"})}),r.jsxs("ul",{className:`grid grid-cols-4 gap-x-20 flex-1 max-w-2xl font-bahnschrift text-xl ml-auto pr-20 translate-y-[2px] transition-all duration-300 ${t?"text-[#f8da9c] [text-shadow:0_0_6px_rgba(248,218,156,0.8)]":"text-[#f8da9c]/70"}`,children:[r.jsx("li",{className:"justify-self-center",children:r.jsx(l,{to:"/home",className:"hover:no-underline focus:no-underline active:no-underline",children:"Home"})}),r.jsx("li",{className:"justify-self-center",children:r.jsx(l,{to:"/tech",className:"hover:no-underline focus:no-underline active:no-underline",children:"Tech"})}),r.jsx("li",{className:"justify-self-center",children:r.jsx(l,{to:"/team",className:"hover:no-underline focus:no-underline active:no-underline",children:"Team"})}),r.jsx("li",{className:"justify-self-center",children:r.jsx(l,{to:"/news",className:"hover:no-underline focus:no-underline active:no-underline",children:"News"})})]})]})}/**
 * @license lucide-react v0.540.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),j=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,s,n)=>n?n.toUpperCase():s.toLowerCase()),u=t=>{const e=j(t);return e.charAt(0).toUpperCase()+e.slice(1)},d=(...t)=>t.filter((e,s,n)=>!!e&&e.trim()!==""&&n.indexOf(e)===s).join(" ").trim(),v=t=>{for(const e in t)if(e.startsWith("aria-")||e==="role"||e==="title")return!0};/**
 * @license lucide-react v0.540.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var N={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.540.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=a.forwardRef(({color:t="currentColor",size:e=24,strokeWidth:s=2,absoluteStrokeWidth:n,className:i="",children:o,iconNode:m,...c},f)=>a.createElement("svg",{ref:f,...N,width:e,height:e,stroke:t,strokeWidth:n?Number(s)*24/Number(e):s,className:d("lucide",i),...!o&&!v(c)&&{"aria-hidden":"true"},...c},[...m.map(([x,h])=>a.createElement(x,h)),...Array.isArray(o)?o:[o]]));/**
 * @license lucide-react v0.540.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=(t,e)=>{const s=a.forwardRef(({className:n,...i},o)=>a.createElement(g,{ref:o,iconNode:e,className:d(`lucide-${w(u(t))}`,`lucide-${t}`,n),...i}));return s.displayName=u(t),s};export{y as N,b as c};
