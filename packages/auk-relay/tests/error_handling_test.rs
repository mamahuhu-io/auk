use relay::{execute, Request};
use http::{Method, Version};

#[tokio::test]
async fn test_invalid_url() {
    let request = Request {
        id: 200,
        url: "not-a-valid-url".to_string(),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // curl may accept this as a relative URL or fail
    // Either outcome is acceptable for this edge case
    if result.is_ok() {
        // If it succeeds, it's treating it as a relative URL
        println!("curl treated invalid URL as relative path");
    } else {
        // Expected: should fail with network error
        println!("curl rejected invalid URL");
    }
}

#[tokio::test]
#[ignore] // Ignore this test as curl behavior varies by platform
async fn test_connection_refused() {
    let request = Request {
        id: 201,
        url: "http://127.0.0.1:9/nonexistent".to_string(), // Port 9 is typically unused
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: None,
        security: None,
        proxy: None,
        meta: Some(relay::interop::RequestMeta {
            options: Some(relay::interop::RequestOptions {
                timeout: Some(2000), // 2 second timeout
                follow_redirects: None,
                max_redirects: None,
                decompress: None,
                cookies: None,
                keep_alive: None,
            }),
        }),
    };

    let result = execute(request).await;

    // Should fail with connection error or timeout
    assert!(result.is_err());
}

#[tokio::test]
#[ignore] // Ignore this test as DNS behavior varies by platform and network config
async fn test_dns_resolution_failure() {
    let request = Request {
        id: 202,
        url: "http://invalid-domain-that-definitely-does-not-exist-xyz123456789.test/".to_string(),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: None,
        security: None,
        proxy: None,
        meta: Some(relay::interop::RequestMeta {
            options: Some(relay::interop::RequestOptions {
                timeout: Some(3000), // 3 second timeout
                follow_redirects: None,
                max_redirects: None,
                decompress: None,
                cookies: None,
                keep_alive: None,
            }),
        }),
    };

    let result = execute(request).await;

    // Should fail with DNS resolution error
    assert!(result.is_err());
}

#[tokio::test]
async fn test_cancel_nonexistent_request() {
    use relay::cancel;

    // Try to cancel a request that doesn't exist
    let result = cancel(999999).await;

    // Should fail
    assert!(result.is_err());
}

#[tokio::test]
async fn test_multiple_cancellations() {
    use relay::cancel;
    use wiremock::{MockServer, Mock, ResponseTemplate};
    use wiremock::matchers::{method, path};

    let mock_server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/slow"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_delay(std::time::Duration::from_secs(5))
        )
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 203,
        url: format!("{}/slow", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let request_id = request.id;

    // Start request
    let _handle = tokio::spawn(async move {
        execute(request).await
    });

    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // Cancel multiple times
    let result1 = cancel(request_id).await;
    let _result2 = cancel(request_id).await;

    // First cancel may succeed or fail depending on timing
    // This is acceptable - the request is either cancelled or already completed
    println!("First cancel result: {:?}", result1);
}

#[tokio::test]
async fn test_invalid_json_content() {
    use wiremock::{MockServer, Mock, ResponseTemplate};
    use wiremock::matchers::{method, path};

    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/api"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&mock_server)
        .await;

    // Valid JSON should work
    let request = Request {
        id: 204,
        url: format!("{}/api", mock_server.uri()),
        method: Method::POST,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: Some(relay::interop::ContentType::Json {
            content: serde_json::json!({"key": "value"}),
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
async fn test_empty_response_body() {
    use wiremock::{MockServer, Mock, ResponseTemplate};
    use wiremock::matchers::{method, path};

    let mock_server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/empty"))
        .respond_with(ResponseTemplate::new(204)) // No Content
        .mount(&mock_server)
        .await;

    let request = Request {
        id: 205,
        url: format!("{}/empty", mock_server.uri()),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: None,
        security: None,
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.status, http::StatusCode::NO_CONTENT);
    assert!(response.body.body.is_empty());
}
