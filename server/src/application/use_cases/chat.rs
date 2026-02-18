use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex, OnceLock};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub mission_id: i32,
    pub sender_id: i32,
    pub sender_name: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

static CHAT_STORE: OnceLock<Arc<Mutex<HashMap<i32, Vec<ChatMessage>>>>> = OnceLock::new();

fn get_chat_store() -> Arc<Mutex<HashMap<i32, Vec<ChatMessage>>>> {
    CHAT_STORE.get_or_init(|| Arc::new(Mutex::new(HashMap::new()))).clone()
}

pub struct ChatUseCase;

impl ChatUseCase {
    pub fn new() -> Self {
        Self
    }

    pub async fn get_messages(&self, mission_id: i32) -> anyhow::Result<Vec<ChatMessage>> {
        let store_arc = get_chat_store();
        let store = store_arc.lock().unwrap();
        
        // Return empty vec if no messages yet
        let messages = store.get(&mission_id).cloned().unwrap_or_else(Vec::new);
        Ok(messages)
    }

    pub async fn send_message(&self, mission_id: i32, sender_id: i32, sender_name: String, content: String) -> anyhow::Result<ChatMessage> {
        let store_arc = get_chat_store();
        let mut store = store_arc.lock().unwrap();
        
        let messages = store.entry(mission_id).or_insert_with(Vec::new);
        
        let msg = ChatMessage {
            id: Uuid::new_v4().to_string(),
            mission_id,
            sender_id,
            sender_name,
            content,
            created_at: Utc::now(),
        };
        
        messages.push(msg.clone());
        Ok(msg)
    }
}
