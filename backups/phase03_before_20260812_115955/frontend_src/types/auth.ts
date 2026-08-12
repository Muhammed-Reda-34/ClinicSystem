export type AuthUser={id:string;fullName:string;email:string;roles:string[]};
export type AuthResponse={accessToken:string;accessTokenExpiresAtUtc:string;user:AuthUser};
