use anyhow::Result;
use async_trait::async_trait;
use diesel::{
    prelude::*,
    insert_into,
};
use std::sync::Arc;

use crate::{
    domain::{
        entities::{
            brawlers::{Brawler, BrawlerEntity, RegisterBrawlerEntity}, 
            missions::MissionEntity
        },
        repositories::brawlers::BrawlerRepository, 
        value_objects::{base64_image::Base64Image, uploaded_image::UploadedImage},
    },
    infrastructure::{
        cloudinary::UploadImageOptions, 
        database::{postgresql_connection::PgPoolSquad, schema::brawlers}
    },
};

pub struct BrawlerPostgres {
    db_pool: Arc<PgPoolSquad>,
}

impl BrawlerPostgres {
    pub fn new(db_pool: Arc<PgPoolSquad>) -> Self {
        Self { db_pool }
    }
}

#[async_trait]
impl BrawlerRepository for BrawlerPostgres {
    async fn register(&self, register_brawler_entity: RegisterBrawlerEntity) -> Result<i32> {
        let mut connection = Arc::clone(&self.db_pool).get()?;

        let result = insert_into(brawlers::table)
            .values(&register_brawler_entity)
            .returning(brawlers::id)
            .get_result::<i32>(&mut connection)?;

        Ok(result)
    }

    async fn find_by_username(&self, username: &String) -> Result<BrawlerEntity> {
        let mut connection = Arc::clone(&self.db_pool).get()?;

        let result = brawlers::table
            .filter(brawlers::username.eq(username))
            .select(BrawlerEntity::as_select())
            .first::<BrawlerEntity>(&mut connection)?;

        Ok(result)
    }
    
    async fn upload_avatar(
        &self,
        brawler_id: i32,
        base64_image: Base64Image,
        option: UploadImageOptions,
    ) -> Result<UploadedImage> {
        let uploaded_image =    
            crate::infrastructure::cloudinary::upload(base64_image, option).await?;

        let mut conn = Arc::clone(&self.db_pool).get()?;

        diesel::update(brawlers::table)
            .filter(brawlers::id.eq(brawler_id))
            .set((
                brawlers::avatar_url.eq(uploaded_image.url.clone()),
                brawlers::avatar_public_id.eq(uploaded_image.public_id.clone()),
            ))
            .execute(&mut conn)?;

        Ok(uploaded_image)
    }

    async fn get_leaderboard(&self) -> std::result::Result<Vec<Brawler>, String> {
        use crate::infrastructure::database::schema::brawlers::dsl::*;
        
        let mut connection = Arc::clone(&self.db_pool).get().map_err(|e| e.to_string())?;

        brawlers
            .order(total_points.desc()) 
            .limit(10)                  
            .load::<BrawlerEntity>(&mut connection)
            .map(|entities| entities.into_iter().map(|e| e.into()).collect())
            .map_err(|e| e.to_string())
    }

    async fn crew_counting(&self, _mission_id: i32) -> Result<i32> {
        todo!()
    }

    async fn get_missions(&self, _brawler_id: i32) -> Result<Vec<MissionEntity>> {
        todo!()
    }
}