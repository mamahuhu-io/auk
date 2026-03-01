use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use relay::Request;
use http::{Method, Version};
use std::collections::HashMap;

// Benchmark: Request object construction (no network I/O)
fn bench_request_construction(c: &mut Criterion) {
    c.bench_function("request_construction_basic", |b| {
        b.iter(|| {
            black_box(Request {
                id: 1,
                url: "https://example.com/api".to_string(),
                method: Method::GET,
                version: Version::HTTP_11,
                headers: None,
                params: None,
                content: None,
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });
}

// Benchmark: Request construction with JSON content
fn bench_request_with_json(c: &mut Criterion) {
    c.bench_function("request_construction_json", |b| {
        b.iter(|| {
            black_box(Request {
                id: 2,
                url: "https://example.com/api".to_string(),
                method: Method::POST,
                version: Version::HTTP_11,
                headers: None,
                params: None,
                content: Some(relay::interop::ContentType::Json {
                    content: serde_json::json!({"key": "value", "nested": {"data": [1, 2, 3]}}),
                    media_type: relay::interop::MediaType::Json,
                }),
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });
}

// Benchmark: Request construction with headers
fn bench_request_with_headers(c: &mut Criterion) {
    c.bench_function("request_construction_headers", |b| {
        b.iter(|| {
            let mut headers = HashMap::new();
            headers.insert("X-Custom-Header".to_string(), "custom-value".to_string());
            headers.insert("User-Agent".to_string(), "Auk/1.0".to_string());
            headers.insert("Content-Type".to_string(), "application/json".to_string());

            black_box(Request {
                id: 3,
                url: "https://example.com/api".to_string(),
                method: Method::GET,
                version: Version::HTTP_11,
                headers: Some(headers),
                params: None,
                content: None,
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });
}

// Benchmark: Request construction with authentication
fn bench_request_with_auth(c: &mut Criterion) {
    c.bench_function("request_construction_auth", |b| {
        b.iter(|| {
            black_box(Request {
                id: 4,
                url: "https://example.com/api".to_string(),
                method: Method::GET,
                version: Version::HTTP_11,
                headers: None,
                params: None,
                content: None,
                auth: Some(relay::interop::AuthType::Bearer {
                    token: "test_token_123456789".to_string(),
                }),
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });
}

// Benchmark: Content-Type construction (various content types)
fn bench_content_type_construction(c: &mut Criterion) {
    let mut group = c.benchmark_group("content_type_construction");

    // JSON content
    group.bench_function(BenchmarkId::new("json", "small"), |b| {
        b.iter(|| {
            black_box(Request {
                id: 5,
                url: "https://example.com/api".to_string(),
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
            })
        });
    });

    // Text content
    group.bench_function(BenchmarkId::new("text", "plain"), |b| {
        b.iter(|| {
            black_box(Request {
                id: 6,
                url: "https://example.com/api".to_string(),
                method: Method::POST,
                version: Version::HTTP_11,
                headers: None,
                params: None,
                content: Some(relay::interop::ContentType::Text {
                    content: "Hello, World! This is a test message.".to_string(),
                    media_type: relay::interop::MediaType::TextPlain,
                }),
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });

    // URL-encoded content
    group.bench_function(BenchmarkId::new("urlencoded", "form"), |b| {
        b.iter(|| {
            black_box(Request {
                id: 7,
                url: "https://example.com/api".to_string(),
                method: Method::POST,
                version: Version::HTTP_11,
                headers: None,
                params: None,
                content: Some(relay::interop::ContentType::Urlencoded {
                    content: "key1=value1&key2=value2&key3=value3".to_string(),
                    media_type: relay::interop::MediaType::FormUrlEncoded,
                }),
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });

    // Binary content
    group.bench_function(BenchmarkId::new("binary", "small"), |b| {
        b.iter(|| {
            black_box(Request {
                id: 8,
                url: "https://example.com/api".to_string(),
                method: Method::POST,
                version: Version::HTTP_11,
                headers: None,
                params: None,
                content: Some(relay::interop::ContentType::Binary {
                    content: bytes::Bytes::from(vec![0u8; 1024]),
                    media_type: relay::interop::MediaType::OctetStream,
                    filename: Some("test.bin".to_string()),
                }),
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });

    group.finish();
}

// Benchmark: Header construction with varying sizes
fn bench_header_construction(c: &mut Criterion) {
    let mut group = c.benchmark_group("header_construction");

    // Small header set (2 headers)
    group.bench_function(BenchmarkId::new("headers", "small_2"), |b| {
        b.iter(|| {
            let mut headers = HashMap::new();
            headers.insert("X-Header-1".to_string(), "value1".to_string());
            headers.insert("X-Header-2".to_string(), "value2".to_string());

            black_box(Request {
                id: 9,
                url: "https://example.com/api".to_string(),
                method: Method::GET,
                version: Version::HTTP_11,
                headers: Some(headers),
                params: None,
                content: None,
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });

    // Medium header set (5 headers)
    group.bench_function(BenchmarkId::new("headers", "medium_5"), |b| {
        b.iter(|| {
            let mut headers = HashMap::new();
            for i in 1..=5 {
                headers.insert(format!("X-Header-{}", i), format!("value{}", i));
            }

            black_box(Request {
                id: 10,
                url: "https://example.com/api".to_string(),
                method: Method::GET,
                version: Version::HTTP_11,
                headers: Some(headers),
                params: None,
                content: None,
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });

    // Large header set (10 headers)
    group.bench_function(BenchmarkId::new("headers", "large_10"), |b| {
        b.iter(|| {
            let mut headers = HashMap::new();
            for i in 1..=10 {
                headers.insert(format!("X-Header-{}", i), format!("value{}", i));
            }

            black_box(Request {
                id: 11,
                url: "https://example.com/api".to_string(),
                method: Method::GET,
                version: Version::HTTP_11,
                headers: Some(headers),
                params: None,
                content: None,
                auth: None,
                security: None,
                proxy: None,
                meta: None,
            })
        });
    });

    group.finish();
}

// Benchmark: JSON serialization for different payload sizes
fn bench_json_serialization(c: &mut Criterion) {
    let mut group = c.benchmark_group("json_serialization");

    // Small JSON (< 100 bytes)
    group.bench_function(BenchmarkId::new("json_size", "small"), |b| {
        b.iter(|| {
            black_box(serde_json::json!({
                "id": 1,
                "name": "test"
            }))
        });
    });

    // Medium JSON (~ 500 bytes)
    group.bench_function(BenchmarkId::new("json_size", "medium"), |b| {
        b.iter(|| {
            black_box(serde_json::json!({
                "id": 1,
                "name": "test",
                "description": "This is a longer description field with more content",
                "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
                "metadata": {
                    "created": "2024-01-01",
                    "updated": "2024-01-02",
                    "author": "test_user"
                },
                "items": [
                    {"id": 1, "value": "item1"},
                    {"id": 2, "value": "item2"},
                    {"id": 3, "value": "item3"}
                ]
            }))
        });
    });

    // Large JSON (~ 2KB)
    group.bench_function(BenchmarkId::new("json_size", "large"), |b| {
        b.iter(|| {
            let items: Vec<_> = (0..50)
                .map(|i| serde_json::json!({"id": i, "value": format!("item{}", i)}))
                .collect();

            black_box(serde_json::json!({
                "id": 1,
                "name": "test",
                "description": "This is a longer description field with more content",
                "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
                "metadata": {
                    "created": "2024-01-01",
                    "updated": "2024-01-02",
                    "author": "test_user"
                },
                "items": items
            }))
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_request_construction,
    bench_request_with_json,
    bench_request_with_headers,
    bench_request_with_auth,
    bench_content_type_construction,
    bench_header_construction,
    bench_json_serialization
);
criterion_main!(benches);
