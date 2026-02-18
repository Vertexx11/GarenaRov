export interface Brawler {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    total_points: number;
    mission_success_count: number;
    mission_joined_count: number;
}

export interface Passport {
    token_type: string;
    access_token: string;
    expires_in: number;
    display_name: string;
    avatar_url?: string;
}

export interface LoginData {
    username: string;
    password: string;
}

export interface RegisterData {
    username: string;
    password: string;
    display_name: string;
}