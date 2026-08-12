import axios,{type InternalAxiosRequestConfig}from"axios";
import type{AuthResponse}from"../types/auth";import{getAccessToken,setAccessToken}from"./authToken";
const baseURL=import.meta.env.VITE_API_BASE_URL??"http://localhost:5081/api/v1";
export const http=axios.create({baseURL,withCredentials:true});const raw=axios.create({baseURL,withCredentials:true});let refreshing:Promise<AuthResponse>|null=null;
export async function bootstrapAuthSession(){if(!refreshing)refreshing=raw.post<AuthResponse>("/auth/refresh").then(r=>{setAccessToken(r.data.accessToken);window.dispatchEvent(new CustomEvent("clinic:auth-refreshed",{detail:r.data}));return r.data}).catch(e=>{setAccessToken(null);throw e}).finally(()=>{refreshing=null});return refreshing;}
http.interceptors.request.use((c:InternalAxiosRequestConfig)=>{const t=getAccessToken();if(t)c.headers.Authorization=`Bearer ${t}`;return c});
http.interceptors.response.use(r=>r,async e=>{const c=e.config as (InternalAxiosRequestConfig&{_retry?:boolean})|undefined;if(e.response?.status!==401||!c||c._retry||c.url?.includes("/auth/login")||c.url?.includes("/auth/refresh"))throw e;c._retry=true;await bootstrapAuthSession();const t=getAccessToken();if(t)c.headers.Authorization=`Bearer ${t}`;return http(c)});
