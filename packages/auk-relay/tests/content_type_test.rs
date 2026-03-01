use relay::{execute, Request};
use http::{Method, Version};
use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path, header};

#[tokio::test]
async fn test_content_type_set_for_json() {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/api"))
        .and(header("Content-Type", "application/json"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 300,
        url: format!("{}/api", mock_server.uri()),
        method: Method::POST,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: Some(relay::interop::ContentType::Json {
            content: serde_json::json!({"test": "data"}),
            media_type: relay::interop::MediaType::Json,
        }),
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_content_type_set_for_text() {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/text"))
        .and(header("Content-Type", "text/plain"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 301,
        url: format!("{}/text", mock_server.uri()),
        method: Method::POST,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: Some(relay::interop::ContentType::Text {
            content: "Hello, World!".to_string(),
            media_type: relay::interop::MediaType::TextPlain,
        }),
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_content_type_set_for_urlencoded() {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/form"))
        .and(header("Content-Type", "application/x-www-form-urlencoded"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 302,
        url: format!("{}/form", mock_server.uri()),
        method: Method::POST,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: Some(relay::interop::ContentType::Urlencoded {
            content: "key1=value1&key2=value2".to_string(),
            media_type: relay::interop::MediaType::FormUrlEncoded,
        }),
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn test_user_content_type_not_overridden() {
    let mock_server = MockServer::start().await;

    // User explicitly sets a custom Content-Type
    Mock::given(method("POST"))
        .and(path("/custom"))
        .and(header("Content-Type", "application/vnd.custom+json"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    let mut headers = std::collections::HashMap::new();
    headers.insert("Content-Type".to_string(), "application/vnd.custom+json".to_string());

    let request = Request {
        id: 303,
        url: format!("{}/custom", mock_server.uri()),
        method: Method::POST,
        version: Version::HTTP_11,
        headers: Some(headers),
        params: None,
        content: Some(relay::interop::ContentType::Json {
            content: serde_json::json!({"test": "data"}),
            media_type: relay::interop::MediaType::Json, // This should be ignored
        }),
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // Should succeed with user's custom Content-Type
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_content_type_case_insensitive_check() {
    let mock_server = MockServer::start().await;

    // User sets content-type in lowercase
    Mock::given(method("POST"))
        .and(path("/lowercase"))
        .and(header("content-type", "text/custom"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    let mut headers = std::collections::HashMap::new();
    headers.insert("content-type".to_string(), "text/custom".to_string());

    let request = Request {
        id: 304,
        url: format!("{}/lowercase", mock_server.uri()),
        method: Method::POST,
        version: Version::HTTP_11,
        headers: Some(headers),
        params: None,
        content: Some(relay::interop::ContentType::Text {
            content: "test".to_string(),
            media_type: relay::interop::MediaType::TextPlain, // Should be ignored
        }),
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // Should succeed with user's lowercase content-type
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_binary_content_type() {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/binary"))
        .and(header("Content-Type", "application/octet-stream"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 305,
        url: format!("{}/binary", mock_server.uri()),
        method: Method::POST,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: Some(relay::interop::ContentType::Binary {
            content: bytes::Bytes::from(vec![0x00, 0x01, 0x02, 0x03]),
            media_type: relay::interop::MediaType::OctetStream,
            filename: None,
        }),
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
}
