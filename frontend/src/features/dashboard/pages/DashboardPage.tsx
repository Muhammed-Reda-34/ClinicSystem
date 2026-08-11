import{useAuth}from"../../auth/AuthContext";export function DashboardPage(){return <section><h1>أهلاً {useAuth().user?.fullName}</h1><p>تم تشغيل نظام الصلاحيات والحسابات الأساسية.</p></section>}
