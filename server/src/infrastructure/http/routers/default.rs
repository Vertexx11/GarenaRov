use axum::{extract::Path, http::StatusCode, response::IntoResponse};

pub async fn error(Path(status_code_u16): Path<u16>) -> impl IntoResponse {
    let status_code = StatusCode::from_u16(status_code_u16).unwrap();
    (status_code, status_code.to_string()).into_response()
}
