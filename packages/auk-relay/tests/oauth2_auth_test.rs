use relay::{execute, Request};
use http::{Method, Version};
use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path, body_string_contains};

#[tokio::test]
async fn test_oauth2_client_credentials_flow() {
    let mock_server = MockServer::start().await;

    // Mock token endpoint
    Mock::given(method("POST"))
        .and(path("/oauth/token"))
        .and(body_string_contains("grant_type=client_credentials"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(serde_json::json!({
                    "access_token": "test_access_token_123",
                    "token_type": "Bearer",
                    "expires_in": 3600
                }))
        )
        .mount(&mock_server)
        .await;

    // Mock API endpoint that requires the token
    Mock::given(method("GET"))
        .and(path("/api/resource"))
        .respond_with(ResponseTemplate::new(200).set_body_string("Success"))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 500,
        url: format!("{}/api/resource", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: Some(relay::interop::AuthType::OAuth2 {
            grant_type: relay::interop::GrantType::ClientCredentials {
                token_endpoint: format!("{}/oauth/token", mock_server.uri()),
                client_id: "test_client_id".to_string(),
                client_secret: Some("test_client_secret".to_string()),
            },
            access_token: None,
            refresh_token: None,
        }),
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.status, http::StatusCode::OK);
}

#[tokio::test]
async fn test_oauth2_password_flow() {
    let mock_server = MockServer::start().await;

    // Mock token endpoint
    Mock::given(method("POST"))
        .and(path("/oauth/token"))
        .and(body_string_contains("grant_type=password"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(serde_json::json!({
                    "access_token": "password_token_456",
                    "token_type": "Bearer",
                    "expires_in": 7200
                }))
        )
        .mount(&mock_server)
        .await;

    // Mock API endpoint
    Mock::given(method("GET"))
        .and(path("/api/data"))
        .respond_with(ResponseTemplate::new(200).set_body_string("Data"))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 501,
        url: format!("{}/api/data", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: Some(relay::interop::AuthType::OAuth2 {
            grant_type: relay::interop::GrantType::Password {
                token_endpoint: format!("{}/oauth/token", mock_server.uri()),
                username: "testuser".to_string(),
                password: "testpass".to_string(),
            },
            access_token: None,
            refresh_token: None,
        }),
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.status, http::StatusCode::OK);
}

#[tokio::test]
async fn test_oauth2_with_existing_access_token() {
    let mock_server = MockServer::start().await;

    // Mock API endpoint that checks for Bearer token
    Mock::given(method("GET"))
        .and(path("/api/protected"))
        .respond_with(ResponseTemplate::new(200).set_body_string("Protected data"))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 502,
        url: format!("{}/api/protected", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: Some(relay::interop::AuthType::OAuth2 {
            grant_type: relay::interop::GrantType::ClientCredentials {
                token_endpoint: format!("{}/oauth/token", mock_server.uri()),
                client_id: "client_id".to_string(),
                client_secret: Some("client_secret".to_string()),
            },
            access_token: Some("existing_token_789".to_string()),
            refresh_token: None,
        }),
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // Should use existing token without requesting a new one
    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.status, http::StatusCode::OK);
}

#[tokio::test]
async fn test_oauth2_token_refresh() {
    let mock_server = MockServer::start().await;

    // Mock token refresh endpoint
    Mock::given(method("POST"))
        .and(path("/oauth/token"))
        .and(body_string_contains("grant_type=refresh_token"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(serde_json::json!({
                    "access_token": "refreshed_token_999",
                    "token_type": "Bearer",
                    "expires_in": 3600,
                    "refresh_token": "new_refresh_token"
                }))
        )
        .mount(&mock_server)
        .await;

    // Mock API endpoint
    Mock::given(method("GET"))
        .and(path("/api/refresh"))
        .respond_with(ResponseTemplate::new(200).set_body_string("Refreshed"))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 503,
        url: format!("{}/api/refresh", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: Some(relay::interop::AuthType::OAuth2 {
            grant_type: relay::interop::GrantType::ClientCredentials {
                token_endpoint: format!("{}/oauth/token", mock_server.uri()),
                client_id: "client_id".to_string(),
                client_secret: Some("client_secret".to_string()),
            },
            access_token: None,
            refresh_token: Some("old_refresh_token".to_string()),
        }),
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.status, http::StatusCode::OK);
}

#[tokio::test]
async fn test_oauth2_client_credentials_without_secret() {
    let mock_server = MockServer::start().await;

    // Mock token endpoint (public client)
    Mock::given(method("POST"))
        .and(path("/oauth/token"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(serde_json::json!({
                    "access_token": "public_client_token",
                    "token_type": "Bearer",
                    "expires_in": 3600
                }))
        )
        .mount(&mock_server)
        .await;

    Mock::given(method("GET"))
        .and(path("/api/public"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 504,
        url: format!("{}/api/public", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: Some(relay::interop::AuthType::OAuth2 {
            grant_type: relay::interop::GrantType::ClientCredentials {
                token_endpoint: format!("{}/oauth/token", mock_server.uri()),
                client_id: "public_client".to_string(),
                client_secret: None, // Public client without secret
            },
            access_token: None,
            refresh_token: None,
        }),
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_oauth2_token_endpoint_error() {
    let mock_server = MockServer::start().await;

    // Mock token endpoint returning error
    Mock::given(method("POST"))
        .and(path("/oauth/token"))
        .respond_with(
            ResponseTemplate::new(400)
                .set_body_json(serde_json::json!({
                    "error": "invalid_client",
                    "error_description": "Client authentication failed"
                }))
        )
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 505,
        url: format!("{}/api/resource", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: Some(relay::interop::AuthType::OAuth2 {
            grant_type: relay::interop::GrantType::ClientCredentials {
                token_endpoint: format!("{}/oauth/token", mock_server.uri()),
                client_id: "invalid_client".to_string(),
                client_secret: Some("wrong_secret".to_string()),
            },
            access_token: None,
            refresh_token: None,
        }),
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // Should fail when token endpoint returns error
    assert!(result.is_err());
}

#[tokio::test]
async fn test_oauth2_authorization_code_flow_unsupported() {
    let mock_server = MockServer::start().await;

    let request = Request {
        id: 506,
        url: format!("{}/api/resource", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: Some(relay::interop::AuthType::OAuth2 {
            grant_type: relay::interop::GrantType::AuthorizationCode {
                auth_endpoint: format!("{}/oauth/authorize", mock_server.uri()),
                token_endpoint: format!("{}/oauth/token", mock_server.uri()),
                client_id: "client_id".to_string(),
                client_secret: Some("client_secret".to_string()),
            },
            access_token: None,
            refresh_token: None,
        }),
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // Authorization Code flow requires browser interaction, should return error
    assert!(result.is_err());
    if let Err(e) = result {
        match e {
            relay::error::RelayError::UnsupportedFeature { feature, .. } => {
                assert_eq!(feature, "Authorization Code Grant");
            }
            _ => panic!("Expected UnsupportedFeature error"),
        }
    }
}

#[tokio::test]
async fn test_oauth2_implicit_flow_unsupported() {
    let mock_server = MockServer::start().await;

    let request = Request {
        id: 507,
        url: format!("{}/api/resource", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: Some(relay::interop::AuthType::OAuth2 {
            grant_type: relay::interop::GrantType::Implicit {
                auth_endpoint: format!("{}/oauth/authorize", mock_server.uri()),
                client_id: "client_id".to_string(),
            },
            access_token: None,
            refresh_token: None,
        }),
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // Implicit flow requires browser interaction, should return error
    assert!(result.is_err());
    if let Err(e) = result {
        match e {
            relay::error::RelayError::UnsupportedFeature { feature, .. } => {
                assert_eq!(feature, "Implicit Grant");
            }
            _ => panic!("Expected UnsupportedFeature error"),
        }
    }
}
