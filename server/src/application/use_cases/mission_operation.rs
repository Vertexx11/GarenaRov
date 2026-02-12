use std::sync::Arc;

use anyhow::Result;

use crate::domain::{
    repositories::{
        mission_operation::MissionOperationRepository, mission_viewing::MissionViewingRepository,
        brawlers::BrawlerRepository,
    },
    value_objects::mission_statuses::MissionStatuses,
};

pub struct MissionOperationUseCase<T1, T2, T3>
where
    T1: MissionOperationRepository + Send + Sync,
    T2: MissionViewingRepository + Send + Sync,
    T3: BrawlerRepository + Send + Sync,
{
    mission_operation_repository: Arc<T1>,
    missiom_viewing_repository: Arc<T2>,
    brawler_repository: Arc<T3>,
}

impl<T1, T2, T3> MissionOperationUseCase<T1, T2, T3>
where
    T1: MissionOperationRepository + Send + Sync,
    T2: MissionViewingRepository + Send + Sync,
    T3: BrawlerRepository + Send + Sync,
{
    pub fn new(
        mission_operation_repository: Arc<T1>, 
        missiom_viewing_repository: Arc<T2>,
        brawler_repository: Arc<T3>,
    ) -> Self {
        Self {
            mission_operation_repository,
            missiom_viewing_repository,
            brawler_repository,
        }
    }

    pub async fn in_progress(&self, mission_id: i32, chief_id: i32) -> Result<i32> {
        let mission = self.missiom_viewing_repository.get_one(mission_id).await?;

        let crew_count = self
            .missiom_viewing_repository
            .crew_counting(mission_id)
            .await?;

        let is_status_open_or_fail = mission.status == MissionStatuses::Open.to_string()
            || mission.status == MissionStatuses::Failed.to_string();

        let max_crew_per_mission = std::env::var("MAX_CREW_PER_MISSION")
            .expect("missing value")
            .parse()?;

        let update_condition = is_status_open_or_fail
            && crew_count > 0
            && crew_count < max_crew_per_mission
            && mission.chief_id == chief_id;
        if !update_condition {
            if !is_status_open_or_fail {
                return Err(anyhow::anyhow!(
                    "Mission status must be Open or Failed to start. Current: {}",
                    mission.status
                ));
            }
            if crew_count <= 0 {
                return Err(anyhow::anyhow!(
                    "Mission must have at least one crew member"
                ));
            }
            if crew_count >= max_crew_per_mission {
                return Err(anyhow::anyhow!(
                    "Mission crew limit reached or exceeded (Max: {})",
                    max_crew_per_mission
                ));
            }
            if mission.chief_id != chief_id {
                return Err(anyhow::anyhow!("Only the Chief can start the mission"));
            }
            return Err(anyhow::anyhow!("Invalid condition to change stages!"));
        }

        let result = self
            .mission_operation_repository
            .to_progress(mission_id, chief_id)
            .await?;
        Ok(result)
    }

    pub async fn to_completed(&self, mission_id: i32, chief_id: i32) -> Result<i32> {
        let mission = self.missiom_viewing_repository.get_one(mission_id).await?;

        let update_condition = mission.status == MissionStatuses::InProgress.to_string()
            && mission.chief_id == chief_id;

        if !update_condition {
            if mission.status != MissionStatuses::InProgress.to_string() {
                return Err(anyhow::anyhow!(
                    "Mission must be In Progress to complete. Current: {}",
                    mission.status
                ));
            }
            if mission.chief_id != chief_id {
                return Err(anyhow::anyhow!("Only the Chief can complete the mission"));
            }
            return Err(anyhow::anyhow!("Invalid condition to change stages!"));
        }

        let result = self
            .mission_operation_repository
            .to_completed(mission_id, chief_id)
            .await?;

        // 🌟 Add Points Logic 🌟
        // Fetch Crew
        let mut member_ids = self.missiom_viewing_repository.get_crew_ids(mission_id).await?;
        member_ids.push(chief_id); // Add Chief
        
        let mission_points = mission.base_points as i64;

        for uid in member_ids {
             // Because we updated status already, daily_earned INCLUDES this mission points
             let earned_today = self.missiom_viewing_repository.get_daily_earned_points(uid).await?;
             
             // earned_today should be at least mission_points (since included).
             // We want to limit the *contribution* of this mission to fit within 15.
             
             // Points prior to this mission (approx logic)
             let prior_points = if earned_today > mission_points { earned_today - mission_points } else { 0 };
             
             let limit = 15;
             let allowed = if prior_points < limit { limit - prior_points } else { 0 };
             
             let to_add = if mission_points < allowed { mission_points } else { allowed };
             
             if to_add > 0 {
                 // add_points accumulates Total Points.
                 // Note: We are using "daily limit logic" to decide IF to add to Total.
                 // We don't track daily points in DB, we calculate them.
                 self.brawler_repository.add_points(uid, to_add as i32).await?;
             }
        }

        Ok(result)
    }

    pub async fn to_failed(&self, mission_id: i32, chief_id: i32) -> Result<i32> {
        let mission = self.missiom_viewing_repository.get_one(mission_id).await?;

        let update_condition = mission.status == MissionStatuses::InProgress.to_string()
            && mission.chief_id == chief_id;
        if !update_condition {
            if mission.status != MissionStatuses::InProgress.to_string() {
                return Err(anyhow::anyhow!(
                    "Mission must be In Progress to fail. Current: {}",
                    mission.status
                ));
            }
            if mission.chief_id != chief_id {
                return Err(anyhow::anyhow!("Only the Chief can fail the mission"));
            }
            return Err(anyhow::anyhow!("Invalid condition to change stages!"));
        }
        let result = self
            .mission_operation_repository
            .to_failed(mission_id, chief_id)
            .await?;

        Ok(result)
    }
}
