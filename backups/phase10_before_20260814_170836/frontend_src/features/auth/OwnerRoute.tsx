import{Navigate,Outlet}from"react-router-dom";import{useAuth}from"./AuthContext";
export function OwnerRoute(){return useAuth().hasRole("Owner")?<Outlet/>:<Navigate to="/" replace/>}
