use std::sync::Arc;

use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    routing::post,
    Json, Router,
};

use crate::{
    application::use_cases::brawlers::BrawlersUseCase,
    domain::value_objects::{brawler_model::RegisterBrawlerModel, uploaded_image::UploadedAvartar},
    infrastructure::{
        database::{
            postgresql_connection::PgPoolSquad, repositories::brawlers::BrawlerPostgres,
        },
        http::middleware::auth::authorization,
    },
};

// 1. แก้ฟังก์ชัน routes: รับ PgPoolSquad ตรงๆ (เลิกใช้ <T>)
pub fn routes(db_pool: Arc<PgPoolSquad>) -> Router {
    // สร้าง Repository จาก DB Pool
    let brawlers_repository = BrawlerPostgres::new(db_pool);
    // สร้าง UseCase โดยยัด Repository เข้าไป
    let brawlers_use_case = BrawlersUseCase::new(Arc::new(brawlers_repository));

    let protected_router = Router::new()
        .route("/avatar", post(upload_avatar))
        .route_layer(axum::middleware::from_fn(authorization));

    Router::new()
        .merge(protected_router)
        .route("/register", post(register))
        .with_state(Arc::new(brawlers_use_case)) // state จะเป็น Arc<BrawlersUseCase<BrawlerPostgres>>
}

// 2. แก้ฟังก์ชัน register: ระบุชนิด UseCase ให้ชัดเจน (BrawlerPostgres)
pub async fn register(
    State(brawlers_use_case): State<Arc<BrawlersUseCase<BrawlerPostgres>>>,
    Json(register_brawler_model): Json<RegisterBrawlerModel>,
) -> impl IntoResponse {
    match brawlers_use_case.register(register_brawler_model).await {
        Ok(passport) => (StatusCode::CREATED, Json(passport)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// 3. แก้ฟังก์ชัน upload_avatar: ระบุชนิด UseCase ให้ชัดเจนเช่นกัน
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