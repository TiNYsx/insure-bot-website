module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/api/proxy/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
async function POST(req) {
    try {
        const body = await req.json();
        const { webhookUrl, message, messages, audioBase64, audioFilename } = body;
        if (!webhookUrl || typeof webhookUrl !== 'string') {
            return new Response(JSON.stringify({
                error: 'Missing webhookUrl'
            }), {
                status: 400
            });
        }
        const controller = new AbortController();
        // Mirror the client timeout (5 minutes)
        const timeout = setTimeout(()=>controller.abort(), 300000);
        let forwardRes;
        if (audioBase64) {
            // Construct FormData with a binary audio file and messages
            const formData = new FormData();
            // Convert base64 to Uint8Array
            const buffer = Buffer.from(audioBase64, 'base64');
            const blob = new Blob([
                buffer
            ], {
                type: 'audio/wav'
            });
            formData.append('audio', blob, audioFilename || 'audio.wav');
            formData.append('messages', JSON.stringify(messages || []));
            forwardRes = await fetch(webhookUrl, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
        } else {
            // Forward as JSON
            forwardRes = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    messages
                }),
                signal: controller.signal
            });
        }
        clearTimeout(timeout);
        const contentType = forwardRes.headers.get('content-type') || 'text/plain';
        const payload = await forwardRes.arrayBuffer();
        return new Response(payload, {
            status: forwardRes.status,
            headers: {
                'content-type': contentType
            }
        });
    } catch (err) {
        console.error('Proxy error:', err);
        if (err.name === 'AbortError') {
            return new Response(JSON.stringify({
                error: 'Upstream request timed out'
            }), {
                status: 504
            });
        }
        return new Response(JSON.stringify({
            error: 'Proxy failed',
            details: String(err)
        }), {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b1e68d93._.js.map