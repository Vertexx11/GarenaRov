use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::domain::entities::missions::{AddMissionEntity, EditMissionEntity, MissionEntity};
use crate::domain::value_objects::mission_statuses::MissionStatuses;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MissionModel {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub chief_id: i32,
    pub crew_count: i64,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub max_crew: i32,
    pub difficulty: String,
    pub base_points: i32,
    pub due_date: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AddMissionModel {
    pub name: String,
    pub description: Option<String>,
    pub max_crew: i32,
    pub difficulty: String,
    pub due_date: Option<NaiveDateTime>,
}

impl AddMissionModel {
    pub fn to_entity(&self, chief_id: i32) -> AddMissionEntity {
        let points = match self.difficulty.to_uppercase().as_str() {
            "EASY" => 1,
            "HARD" => 5,
            _ => 3, 
        };

        AddMissionEntity {
            chief_id,
            name: self.name.clone(),
            status: MissionStatuses::Open.to_string(),
            description: self.description.clone(),
            max_crew: self.max_crew,
            difficulty: self.difficulty.clone(),
            base_points: points,
            due_date: self.due_date,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EditMissionModel {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub max_crew: Option<i32>,
    pub difficulty: Option<String>,
    pub due_date: Option<NaiveDateTime>,
}

impl EditMissionModel {
    pub fn to_entity(&self, chief_id: i32) -> EditMissionEntity {
        let new_points = self.difficulty.as_ref().map(|d| match d.to_uppercase().as_str() {
            "EASY" => 1,
            "HARD" => 5,
            _ => 3,
        });

        EditMissionEntity {
            chief_id,
            name: self.name.clone(),
            status: self.status.clone(),
            description: self.description.clone(),
            max_crew: self.max_crew,
            difficulty: self.difficulty.clone(),
            base_points: new_points,
            due_date: self.due_date,
        }
    }
}