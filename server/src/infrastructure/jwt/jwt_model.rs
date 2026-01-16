use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::{config::config_loader::get_jwt_env, infrastructure::jwt::generate_token};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: i32,
    pub display_name: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Passport {
    pub token_type: String,
    pub access_token: String,
    pub expires_in: usize,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub user: UserProfile, // นี่คือสิ่งที่ Frontend Angular รออยู่
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: i32,
    pub exp: usize,
    pub iat: usize,
}

impl Passport {
    // 1. แก้ Signature: รับ display_name เข้ามาด้วย (ลบ avatar_url hardcode ออก)
    pub fn new(brawler_id: i32, display_name: String) -> Self {
        let jwt_env = get_jwt_env().unwrap();
        let token_type = "Bearer".to_string();
        let expires_in = (Utc::now() + Duration::days(jwt_env.life_time_days)).timestamp() as usize;
        
        // 2. ใช้ display_name ที่รับเข้ามา (ไม่ hardcode แล้ว)
        let avatar_url = None;

        let access_token_claims = Claims {
            sub: brawler_id,
            exp: expires_in,
            iat: Utc::now().timestamp() as usize,
        };

        let access_token = generate_token(jwt_env.secret, &access_token_claims).unwrap();

        // 3. สร้าง UserProfile object
        let user_profile = UserProfile {
            id: brawler_id,
            display_name: display_name.clone(),
            avatar_url: avatar_url.clone(),
        };

        Passport {
            token_type,
            access_token,
            expires_in,
            display_name,
            avatar_url,
            user: user_profile, // 4. ใส่ field user เข้าไปให้ครบ
        }
    }
}