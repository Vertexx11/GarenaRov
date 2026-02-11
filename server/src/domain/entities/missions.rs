use chrono::NaiveDateTime;
use diesel::prelude::*;
// use serde_json::de; 

use crate::{
    domain::value_objects::mission_model::MissionModel, infrastructure::database::schema::missions,
};

#[derive(Debug, Clone, Identifiable, Selectable, Queryable)]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[diesel(table_name = missions)]
pub struct MissionEntity {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub chief_id: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub deleted_at: Option<NaiveDateTime>,
    pub max_crew: i32,
    pub difficulty: String,               
    pub base_points: i32,                 
    pub due_date: Option<NaiveDateTime>,  
}


impl MissionEntity {
    pub fn to_model(&self, crew_count: i64) -> MissionModel {
        MissionModel {
            id: self.id,
            name: self.name.clone(),
            description: self.description.clone(),
            status: self.status.clone(),
            chief_id: self.chief_id,
            crew_count,
            created_at: self.created_at,
            updated_at: self.updated_at,
            max_crew: self.max_crew,
            difficulty: self.difficulty.clone(), 
            base_points: self.base_points,       
            due_date: self.due_date,             
        }
    }
}

#[derive(Debug, Clone, Insertable)]
#[diesel(table_name = missions)]
pub struct AddMissionEntity {
    pub chief_id: i32,
    pub name: String,
    pub status: String,
    pub description: Option<String>,
    pub max_crew: i32,
    pub difficulty: String,               
    pub base_points: i32,               
    pub due_date: Option<NaiveDateTime>, 
}

#[derive(Debug, Clone, AsChangeset)]
#[diesel(table_name = missions)]
pub struct EditMissionEntity {
    pub chief_id: i32,
    pub name: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub max_crew: Option<i32>,
    pub difficulty: Option<String>,               
    pub base_points: Option<i32>,                 
    pub due_date: Option<NaiveDateTime>, 
}        