use axum::{
    extract::{Path, Json, Extension},
    routing::get,
    Router,
    http::StatusCode,
    middleware,
};
use std::sync::Arc;
use crate::{
    application::use_cases::chat::{ChatUseCase, ChatMessage},
    infrastructure::{
        database::{postgresql_connection::PgPoolSquad, repositories::brawlers::BrawlerPostgres},
        http::middleware::auth::authorization,
    },
    domain::repositories::brawlers::BrawlerRepository,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct ChatResponse {
    pub message: String,
}

#[derive(Deserialize)]
pub struct CreateMessageRequest {
    pub content: String,
}

pub fn routes(pool: Arc<PgPoolSquad>) -> Router {
    Router::new()
        .route("/{mission_id}/messages", get(get_messages).post(send_message))
        .layer(middleware::from_fn(authorization))
        .layer(Extension(pool))
}

pub async fn get_messages(
    Path(mission_id): Path<i32>,
    Extension(_brawler_id): Extension<i32>,
) -> Result<Json<Vec<ChatMessage>>, (StatusCode, String)> {
    let use_case = ChatUseCase::new();
    let messages = use_case.get_messages(mission_id).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(messages))
}

pub async fn send_message(
    Path(mission_id): Path<i32>,
    Extension(brawler_id): Extension<i32>,
    Extension(pool): Extension<Arc<PgPoolSquad>>, 
    Json(payload): Json<CreateMessageRequest>,
) -> Result<Json<ChatMessage>, (StatusCode, String)> {
    
    let repo = BrawlerPostgres::new(pool);
    let user = repo.find_by_id(brawler_id).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let use_case = ChatUseCase::new();
    // Prefer display_name
    let name = if user.display_name.is_empty() { user.username } else { user.display_name };
    
    let msg = use_case.send_message(mission_id, brawler_id, name, payload.content).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(msg))
}
