export interface Brawler {
    displayname: string,
    avatar: string,
    mission_success_count: number,
    mission_join_count: number
}

export interface Passport {
    token_type:string,
    access_token:string,
    expires_in:number,
    display_name:string,
    arvatar_url?:string
}

export interface LoginData{
    username:string
    password:string
}

export interface RegisterData{
    username:string,
    password:string,
    display_name:string
}