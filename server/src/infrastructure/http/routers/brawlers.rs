use std::sync::Arc;

use axum::{
    Json, Router,
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};

use crate::{
    application::use_cases::brawlers::BrawlersUseCase,
    domain::value_objects::{brawler_model::RegisterBrawlerModel, uploaded_image::UploadedAvartar},
    infrastructure::{
        database::{postgresql_connection::PgPoolSquad, repositories::brawlers::BrawlerPostgres},
        http::middleware::auth::authorization,
    },
};

pub fn routes(db_pool: Arc<PgPoolSquad>) -> Router {
    let brawlers_repository = BrawlerPostgres::new(db_pool);
    let brawlers_use_case = BrawlersUseCase::new(Arc::new(brawlers_repository));

    let protected_router = Router::new()
        .route("/avatar", post(upload_avatar))
        .route("/me", get(get_me))
        .route("/my-missions", get(get_missions))
        .route_layer(axum::middleware::from_fn(authorization));

    Router::new()
        .merge(protected_router)
        .route("/register", post(register))
        .route("/leaderboard", get(get_leaderboard))
        .with_state(Arc::new(brawlers_use_case))
}

pub async fn get_leaderboard(
    State(brawlers_use_case): State<Arc<BrawlersUseCase<BrawlerPostgres>>>,
) -> impl IntoResponse {
    match brawlers_use_case.get_leaderboard().await {
        Ok(leaderboard) => (StatusCode::OK, Json(leaderboard)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn register(
    State(brawlers_use_case): State<Arc<BrawlersUseCase<BrawlerPostgres>>>,
    Json(register_brawler_model): Json<RegisterBrawlerModel>,
) -> impl IntoResponse {
    match brawlers_use_case.register(register_brawler_model).await {
        Ok(passport) => (StatusCode::CREATED, Json(passport)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn upload_avatar(
    State(brawlers_use_case): State<Arc<BrawlersUseCase<BrawlerPostgres>>>,
    Extension(brawler_id): Extension<i32>,
    Json(upload_image): Json<UploadedAvartar>,
) -> impl IntoResponse {
    match brawlers_use_case
        .upload_avatar(upload_image.base64_string, brawler_id)
        .await
    {
        Ok(uploaded_image) => (StatusCode::CREATED, Json(uploaded_image)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn get_missions(
    State(_brawlers_use_case): State<Arc<BrawlersUseCase<BrawlerPostgres>>>,
    Extension(_brawler_id): Extension<i32>,
) -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({})))
}

pub async fn get_me(
    State(brawlers_use_case): State<Arc<BrawlersUseCase<BrawlerPostgres>>>,
    Extension(brawler_id): Extension<i32>,
) -> impl IntoResponse {
    match brawlers_use_case.get_me(brawler_id).await {
        Ok(brawler) => (StatusCode::OK, Json(brawler)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
