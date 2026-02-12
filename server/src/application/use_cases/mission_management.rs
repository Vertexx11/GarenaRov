use std::sync::Arc;

use crate::domain::{
    repositories::{
        mission_management::MissionManagementRepository, mission_viewing::MissionViewingRepository,
        brawlers::BrawlerRepository,
    },
    value_objects::{
        mission_model::{AddMissionModel, EditMissionModel},
        mission_statuses::MissionStatuses,
    },
};

pub struct MissionManagementUseCase<T1, T2, T3>
where
    T1: MissionManagementRepository + Send + Sync,
    T2: MissionViewingRepository + Send + Sync,
    T3: BrawlerRepository + Send + Sync,
{
    mission_management_repository: Arc<T1>,
    mission_viewing_repository: Arc<T2>,
    brawler_repository: Arc<T3>,
}

use anyhow::Result;
impl<T1, T2, T3> MissionManagementUseCase<T1, T2, T3>
where
    T1: MissionManagementRepository + Send + Sync,
    T2: MissionViewingRepository + Send + Sync,
    T3: BrawlerRepository + Send + Sync,
{
    pub fn new(
        mission_management_repository: Arc<T1>,
        mission_viewing_repository: Arc<T2>,
        brawler_repository: Arc<T3>,
    ) -> Self {
        Self {
            mission_management_repository,
            mission_viewing_repository,
            brawler_repository,
        }
    }

    pub async fn add(&self, chief_id: i32, mut add_mission_model: AddMissionModel) -> Result<i32> {
        // Daily Limit Check
        let daily_count = self.mission_viewing_repository.get_daily_interaction_count(chief_id).await?;
        if daily_count >= 3 {
             return Err(anyhow::anyhow!("Daily mission limit (3) reached. You cannot create or join more missions today."));
        }

        if add_mission_model.name.trim().is_empty() || add_mission_model.name.trim().len() < 3 {
            return Err(anyhow::anyhow!(
                "Mission name must be at least 3 characters long."
            ));
        }
        add_mission_model.description = add_mission_model.description.and_then(|s| {
            if s.trim().is_empty() {
                None
            } else {
                Some(s.trim().to_string())
            }
        });

        let insert_mission_entity = add_mission_model.to_entity(chief_id);

        let result = self
            .mission_management_repository
            .add(insert_mission_entity)
            .await?;

        Ok(result)
    }

    pub async fn edit(
        &self,
        mission_id: i32,
        chief_id: i32,
        mut edit_mission_model: EditMissionModel,
    ) -> Result<i32> {

        if let Some(mission_name) = &edit_mission_model.name {
            if mission_name.trim().is_empty() {
                edit_mission_model.name = None;
            }else if mission_name.trim().len() < 3 {
                return Err(anyhow::anyhow!(
                    "Mission name must be at least 3 characters long."
                ));
            }else {
                edit_mission_model.name = Some(mission_name.trim().to_string());
            }
        }

        edit_mission_model.description = edit_mission_model.description.and_then(|s| {
            if s.trim().is_empty() {
                None
            } else {
                Some(s.trim().to_string())
            }
        });


        let crew_count = self
            .mission_viewing_repository
            .crew_counting(mission_id)
            .await?;
        if crew_count > 0 {
            return Err(anyhow::anyhow!(
                "Mission has been taken by brawler for now!"
            ));
        }

        let old_mission = self.mission_viewing_repository.get_one(mission_id).await?;
        let new_status = edit_mission_model.status.clone();

        let edit_mission_entity = edit_mission_model.to_entity(chief_id);

        let result = self
            .mission_management_repository
            .edit(mission_id, edit_mission_entity)
            .await?;

        // 🌟 Award points if changed to Completed 🌟
        if new_status == Some(MissionStatuses::Completed.to_string()) && old_mission.status != MissionStatuses::Completed.to_string() {
            let mut member_ids = self.mission_viewing_repository.get_crew_ids(mission_id).await?;
            member_ids.push(chief_id);
            
            let mission_points = old_mission.base_points as i64;
            for uid in member_ids {
                 let earned_today = self.mission_viewing_repository.get_daily_earned_points(uid).await?;
                 let prior_points = if earned_today > mission_points { earned_today - mission_points } else { 0 };
                 let limit = 15;
                 let allowed = if prior_points < limit { limit - prior_points } else { 0 };
                 let to_add = if mission_points < allowed { mission_points } else { allowed };
                 if to_add > 0 {
                     self.brawler_repository.add_points(uid, to_add as i32).await?;
                 }
            }
        }

        Ok(result)
    }

    pub async fn remove(&self, mission_id: i32, chief_id: i32) -> Result<()> {
        let crew_count = self
            .mission_viewing_repository
            .crew_counting(mission_id)
            .await?;
        if crew_count > 0 {
            return Err(anyhow::anyhow!(
                "Mission has been taken by brawler for now!"
            ));
        }

        self.mission_management_repository
            .remove(mission_id, chief_id)
            .await?;
        Ok(())
    }
}
