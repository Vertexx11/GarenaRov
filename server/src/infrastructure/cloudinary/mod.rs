use crate::config::{config_loader::get_cloundinary_env, config_model::CloudinaryEnv};
use crate::domain::value_objects::base64_image::Base64Image;
use crate::domain::value_objects::uploaded_image::UploadedImage;
use anyhow::{Context, Ok, Result};
use chrono::Utc;
use reqwest::multipart::{Form, Part};
use sha1::{Digest, Sha1};
use std::collections::HashMap;

pub struct UploadImageOptions {
    pub folder: Option<String>,
    pub public_id: Option<String>,
    pub transformation: Option<String>,
}

use tracing; 

fn form_builder(option: UploadImageOptions, cloud_env: &CloudinaryEnv) -> Result<(Form, String)> {
    let mut form = Form::new();
    let timestamp = Utc::now().timestamp().to_string();

    let mut params: HashMap<String, String> = HashMap::new();
    params.insert("timestamp".to_string(), timestamp.clone());
    
    if let Some(f) = option.folder {
        if !f.is_empty() { params.insert("folder".to_string(), f); }
    }
    if let Some(p) = option.public_id {
        if !p.is_empty() { params.insert("public_id".to_string(), p); }
    }
    if let Some(t) = option.transformation {
        if !t.is_empty() { params.insert("transformation".to_string(), t); }
    }

    let mut sorted_keys: Vec<_> = params.keys().collect();
    sorted_keys.sort();

    let mut signature_parts = Vec::new();
    for key in sorted_keys {
        if let Some(value) = params.get(key) {
            signature_parts.push(format!("{}={}", key, value));
        }
    }

    let clean_secret = cloud_env.api_secret.trim().replace('"', "");
    let to_sign = format!("{}{}", signature_parts.join("&"), clean_secret);
    
    let mut hasher = Sha1::new();
    hasher.update(to_sign.as_bytes());
    let signature = format!("{:x}", hasher.finalize());

    form = form.text("signature", signature);
    form = form.text("api_key", cloud_env.api_key.trim().replace('"', ""));
    
    for (key, value) in params {
        form = form.text(key, value);
    }
    Ok((form, to_sign))
}

pub async fn upload(base64_image: Base64Image, option: UploadImageOptions) -> Result<UploadedImage> {
    let cloud_env = get_cloundinary_env()?;

    let (form, debug_to_sign) = form_builder(option, &cloud_env)?; 
    
    tracing::error!(">>> [DEBUG] STRING TO SIGN: {}", debug_to_sign);

    let file = Part::text(base64_image.into_inner());
    let multipart = form.part("file", file);
    let client = reqwest::Client::new();
    let url = format!("https://api.cloudinary.com/v1_1/{}/image/upload", cloud_env.cloud_name.trim());

    let response = client.post(&url).multipart(multipart).send().await?;
    let status = response.status();
    let text = response.text().await?;

    if !status.is_success() {
        tracing::error!(">>> [CLOUDINARY ERROR]: {}", text);
        return Err(anyhow::anyhow!("Cloudinary failed: {}", text));
    }

    let json: UploadedImage = serde_json::from_str(&text)?;
    Ok(json)
}