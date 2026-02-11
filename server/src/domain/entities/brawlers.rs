use crate::{infrastructure::{ database::{ schema::brawlers}}};
use chrono::NaiveDateTime;
use diesel::{Selectable, prelude::*};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Brawler {
    pub id: i32,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub total_points: i32, 
}

#[derive(Debug, Clone, Identifiable, Selectable, Queryable)]
#[diesel(table_name = brawlers)]
pub struct BrawlerEntity {
    pub id: i32,
    pub username: String,
    pub password: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub avatar_public_id: Option<String>,
    pub total_points: i32,  
}   

impl From<BrawlerEntity> for Brawler {
    fn from(entity: BrawlerEntity) -> Self {
        Self {
            id: entity.id,
            username: entity.username,
            display_name: entity.display_name,
            avatar_url: entity.avatar_url,
            total_points: entity.total_points,
        }
    }
}

#[derive(Debug, Clone, Insertable)]
#[diesel(table_name = brawlers)]
pub struct RegisterBrawlerEntity {
    pub username: String,
    pub password: String,
    pub display_name: String,
}