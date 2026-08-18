export type DoctorListItem={doctorId:string;userId:string;fullName:string;specialization:string;isOwner:boolean;isActive:boolean};
export type StaffDoctorItem={doctorId:string;fullName:string};
export type StaffListItem={userId:string;fullName:string;role:"Secretary"|"Nurse";isActive:boolean;doctors:StaffDoctorItem[]};
