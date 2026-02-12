use crate::{
    domain::{
        entities::brawlers::Brawler, 
        repositories::brawlers::BrawlerRepository,
        value_objects::{
            base64_image::Base64Image, brawler_model::RegisterBrawlerModel,
            uploaded_image::UploadedImage,
        },
    },
    infrastructure::{
        argon2::hash,
        cloudinary::{UploadImageOptions},
        jwt::jwt_model::Passport,
    },
};
use anyhow::Result;
use std::sync::Arc;

pub struct BrawlersUseCase<T>
where
    T: BrawlerRepository + Send + Sync,
{
    brawler_repository: Arc<T>,
}

impl<T> BrawlersUseCase<T>
where
    T: BrawlerRepository + Send + Sync,
{
    pub fn new(brawler_repository: Arc<T>) -> Self {
        Self { brawler_repository }
    }

    pub async fn get_leaderboard(&self) -> Result<Vec<Brawler>, String> {
        self.brawler_repository.get_leaderboard().await
    }

    pub async fn get_me(&self, brawler_id: i32) -> Result<Brawler> {
        let entity = self.brawler_repository.find_by_id(brawler_id).await?;
        Ok(entity.into())
    }

    pub async fn register(&self, mut register_model: RegisterBrawlerModel) -> Result<Passport> {
        let hashed_password = hash(register_model.password.clone())?;

        register_model.password = hashed_password;

        let display_name_for_token = register_model.display_name.clone();
        let register_entity = register_model.to_entity();
        let brawler_id = self.brawler_repository.register(register_entity).await?;

        let passport = Passport::new(brawler_id, display_name_for_token);
        Ok(passport)
    }

    pub async fn upload_avatar(
        &self,
        base64_image: String,
        brawler_id: i32,
    ) -> Result<UploadedImage> {
        let option = UploadImageOptions {
            folder: None,
            public_id: None,
            transformation: None,
        };

        let base64_image = Base64Image::new(&base64_image)?;

        let uploaded_image = self
            .brawler_repository
            .upload_avatar(brawler_id, base64_image, option)
            .await?;

        Ok(uploaded_image)
    }

    pub async fn update_profile(
        &self,
        brawler_id: i32,
        update_model: crate::domain::value_objects::brawler_model::UpdateBrawlerModel,
    ) -> Result<Passport> {
        let entity = self.brawler_repository.update_profile(brawler_id, update_model).await?;
        
        let passport = Passport::new(entity.id, entity.display_name.clone());
        
        
        Ok(passport)
    }
}