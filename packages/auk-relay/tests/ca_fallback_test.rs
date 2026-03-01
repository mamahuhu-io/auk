use relay::certs::apply_fallback_ca;
use curl::easy::Easy;
use std::env;

#[test]
fn test_ca_fallback_with_system_ca() {
    // When system CA exists, should not use fallback
    let mut handle = Easy::new();

    // Ensure env var is not set
    env::remove_var("AUK_FORCE_SYSTEM_CA");

    let result = apply_fallback_ca(&mut handle);

    // Should succeed (either uses system CA or fallback)
    assert!(result.is_ok());
}

#[test]
fn test_ca_fallback_with_force_system_ca() {
    // When AUK_FORCE_SYSTEM_CA is set, should skip fallback
    let mut handle = Easy::new();

    env::set_var("AUK_FORCE_SYSTEM_CA", "1");

    let result = apply_fallback_ca(&mut handle);

    // Should succeed and skip fallback
    assert!(result.is_ok());

    // Cleanup
    env::remove_var("AUK_FORCE_SYSTEM_CA");
}

#[tokio::test]
async fn test_https_request_with_valid_cert() {
    use relay::{execute, Request};
    use http::{Method, Version};

    // Test against a known good HTTPS endpoint
    let request = Request {
        id: 100,
        url: "https://httpbin.org/get".to_string(),
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

    // Should succeed with valid certificate
    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.status, http::StatusCode::OK);
}

#[tokio::test]
async fn test_https_request_with_self_signed_cert_rejected() {
    use relay::{execute, Request};
    use http::{Method, Version};

    // Test against self-signed cert endpoint (should fail by default)
    let request = Request {
        id: 101,
        url: "https://self-signed.badssl.com/".to_string(),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: None,
        security: Some(relay::interop::SecurityConfig {
            certificates: None,
            verify_host: Some(true),
            verify_peer: Some(true),
        }),
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // Should fail due to self-signed certificate
    assert!(result.is_err());
}

#[tokio::test]
async fn test_https_request_with_verification_disabled() {
    use relay::{execute, Request};
    use http::{Method, Version};

    // Test with verification disabled
    let request = Request {
        id: 102,
        url: "https://self-signed.badssl.com/".to_string(),
        method: Method::GET,
        version: Version::HTTP_11,
        headers: None,
        params: None,
        content: None,
        auth: None,
        security: Some(relay::interop::SecurityConfig {
            certificates: None,
            verify_host: Some(false),
            verify_peer: Some(false),
        }),
        proxy: None,
        meta: None,
    };

    let result = execute(request).await;

    // Should succeed when verification is disabled
    assert!(result.is_ok());
}

#[test]
fn test_ca_bundle_is_embedded() {
    // Verify that the CA bundle is properly embedded
    let ca_pem = include_str!("../certs/cacert.pem");

    // Should not be empty
    assert!(!ca_pem.is_empty());

    // Should contain certificate markers
    assert!(ca_pem.contains("-----BEGIN CERTIFICATE-----"));
    assert!(ca_pem.contains("-----END CERTIFICATE-----"));

    // Should be reasonably sized (at least 100KB)
    assert!(ca_pem.len() > 100_000);
}
