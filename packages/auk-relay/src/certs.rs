use curl::easy::Easy;
use std::env;

use crate::error::{RelayError, Result};

// NOTE: Keep in sync with docs/curl-migration.md. Bundled CA is only used as a fallback.
const CACERT_PEM: &str = include_str!("../certs/cacert.pem");

// Make this public for testing
pub fn apply_fallback_ca(handle: &mut Easy) -> Result<()> {
    if env::var_os("AUK_FORCE_SYSTEM_CA").is_some() {
        tracing::info!("AUK_FORCE_SYSTEM_CA set; skipping bundled CA fallback");
        return Ok(());
    }

    let probe = openssl_probe::probe();
    if probe.cert_file.is_some() || probe.cert_dir.is_some() {
        tracing::debug!("System CA found; bundled CA fallback not needed");
        return Ok(());
    }

    tracing::warn!("No system CA detected; injecting bundled cacert.pem");
    handle
        .ssl_cainfo_blob(CACERT_PEM.as_bytes())
        .map_err(|e| RelayError::Certificate {
            message: "Failed to set bundled CA certificates".into(),
            cause: Some(e.to_string()),
        })
}
