use std::time::Duration;

use reqwest::Method;
use serde::{Deserialize, Serialize};

const DEFAULT_TIMEOUT_MS: u64 = 60_000;
const MIN_TIMEOUT_MS: u64 = 1_000;
const MAX_TIMEOUT_MS: u64 = 120_000;

const ALLOWED_OAUTH_URLS: &[&str] = &[
    "https://github.com/login/oauth/access_token",
    "https://api.github.com/user",
    "https://gitlab.com/oauth/token",
    "https://gitlab.com/api/v4/user",
    "https://gitee.com/oauth/token",
    "https://gitee.com/api/v5/user",
    "https://bitbucket.org/site/oauth2/access_token",
    "https://api.bitbucket.org/2.0/user",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthHttpRequest {
    pub provider: String,
    pub action: String,
    pub body: Option<String>,
    pub access_token: Option<String>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthHttpResponse {
    pub status: u16,
    pub body: String,
}

#[derive(Debug, Clone, Copy)]
enum OAuthProvider {
    GitHub,
    GitLab,
    Gitee,
    Bitbucket,
}

impl OAuthProvider {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "github" => Ok(Self::GitHub),
            "gitlab" => Ok(Self::GitLab),
            "gitee" => Ok(Self::Gitee),
            "bitbucket" => Ok(Self::Bitbucket),
            _ => Err(format!("Unsupported OAuth provider: {}", value)),
        }
    }

    fn token_url(self) -> &'static str {
        match self {
            Self::GitHub => "https://github.com/login/oauth/access_token",
            Self::GitLab => "https://gitlab.com/oauth/token",
            Self::Gitee => "https://gitee.com/oauth/token",
            Self::Bitbucket => "https://bitbucket.org/site/oauth2/access_token",
        }
    }

    fn user_info_url(self) -> &'static str {
        match self {
            Self::GitHub => "https://api.github.com/user",
            Self::GitLab => "https://gitlab.com/api/v4/user",
            Self::Gitee => "https://gitee.com/api/v5/user",
            Self::Bitbucket => "https://api.bitbucket.org/2.0/user",
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum OAuthAction {
    Token,
    UserInfo,
}

impl OAuthAction {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "token" => Ok(Self::Token),
            "user_info" => Ok(Self::UserInfo),
            _ => Err(format!("Unsupported OAuth action: {}", value)),
        }
    }
}

fn is_allowed_oauth_url(url: &str) -> bool {
    ALLOWED_OAUTH_URLS.contains(&url)
}

#[tauri::command]
pub async fn oauth_http_request(request: OAuthHttpRequest) -> Result<OAuthHttpResponse, String> {
    let provider = OAuthProvider::parse(&request.provider)?;
    let action = OAuthAction::parse(&request.action)?;

    let timeout_ms = request
        .timeout_ms
        .unwrap_or(DEFAULT_TIMEOUT_MS)
        .clamp(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);

    let client = reqwest::Client::builder()
        .user_agent(format!("auk-desktop/{}", env!("CARGO_PKG_VERSION")))
        .timeout(Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| format!("Failed to create OAuth client: {}", e))?;

    let (method, url) = match action {
        OAuthAction::Token => (Method::POST, provider.token_url()),
        OAuthAction::UserInfo => (Method::GET, provider.user_info_url()),
    };

    if !is_allowed_oauth_url(url) {
        return Err(format!("OAuth URL not allowed: {}", url));
    }

    let mut req_builder = client
        .request(method, url)
        .header("Accept", "application/json");
    match action {
        OAuthAction::Token => {
            let body = request
                .body
                .ok_or("Missing OAuth token request body".to_string())?;
            req_builder = req_builder
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(body);
        }
        OAuthAction::UserInfo => {
            let access_token = request
                .access_token
                .ok_or("Missing OAuth access token for user info request".to_string())?;
            req_builder = match provider {
                // GitHub OAuth app tokens are expected as `token <access_token>`.
                OAuthProvider::GitHub => {
                    req_builder.header("Authorization", format!("token {}", access_token))
                }
                _ => req_builder.bearer_auth(access_token),
            };
        }
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("OAuth request failed: {}", e))?;
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed reading OAuth response body: {}", e))?;

    Ok(OAuthHttpResponse { status, body })
}
