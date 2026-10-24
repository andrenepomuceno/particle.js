# Analytics: keep v1's Google Analytics or not (needs the user's decision)

v1 loads gtag G-STP92EN2LF in dist/index.html and `gtag('config', ENV.gtag_config)` in production.
v2 has none. If kept: Vite env var (VITE_GTAG_ID), production only, and a consent/notice line.
