module.exports = [
"[next]/internal/font/google/inter_5972bc34.module.css [app-rsc] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "className": "inter_5972bc34-module__OU16Qa__className",
});
}),
"[next]/internal/font/google/inter_5972bc34.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_5972bc34$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_5972bc34.module.css [app-rsc] (css module)");
;
const fontData = {
    className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_5972bc34$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].className,
    style: {
        fontFamily: "'Inter', 'Inter Fallback'",
        fontStyle: "normal"
    }
};
if (__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_5972bc34$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].variable != null) {
    fontData.variable = __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_5972bc34$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].variable;
}
const __TURBOPACK__default__export__ = fontData;
}),
"[project]/lib/env-validation.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Environment Variable Validation Utility
 * 
 * Provides runtime validation and helpful error messages for missing environment variables
 */ __turbopack_context__.s([
    "getEnvOrThrow",
    ()=>getEnvOrThrow,
    "logEnvStatus",
    ()=>logEnvStatus,
    "validateClientEnv",
    ()=>validateClientEnv,
    "validateServerEnv",
    ()=>validateServerEnv
]);
function validateClientEnv() {
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_GHL_CLIENT_ID',
        'NEXT_PUBLIC_APP_URL'
    ];
    const missing = required.filter((key)=>!process.env[key]);
    if (missing.length > 0) {
        return {
            isValid: false,
            missing,
            errorMessage: `Missing required environment variables: ${missing.join(', ')}. Please configure these in your Vercel project settings.`
        };
    }
    return {
        isValid: true,
        missing: [],
        errorMessage: ''
    };
}
function validateServerEnv() {
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_GHL_CLIENT_ID',
        'NEXT_PUBLIC_GHL_CLIENT_SECRET',
        'NEXT_PUBLIC_APP_URL',
        'GHL_WEBHOOK_SECRET',
        'ENCRYPTION_KEY'
    ];
    const missing = required.filter((key)=>!process.env[key]);
    if (missing.length > 0) {
        return {
            isValid: false,
            missing,
            errorMessage: `Missing required environment variables: ${missing.join(', ')}. Please configure these in your Vercel project settings.`
        };
    }
    return {
        isValid: true,
        missing: [],
        errorMessage: ''
    };
}
function getEnvOrThrow(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}. Please configure this in your Vercel project settings.`);
    }
    return value;
}
function logEnvStatus() {
    if ("TURBOPACK compile-time truthy", 1) {
        // Server-side
        console.log('Environment Variables Status (Server):');
        const serverValidation = validateServerEnv();
        if (!serverValidation.isValid) {
            console.error('❌', serverValidation.errorMessage);
        } else {
            console.log('✅ All required server environment variables are set');
        }
    } else //TURBOPACK unreachable
    ;
}
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RootLayout,
    "metadata",
    ()=>metadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$5_$40$babel$2b$core$40$7$2e$28$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.5_@babel+core@7.28.6_react-dom@18.3.1_react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_5972bc34$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_5972bc34.js [app-rsc] (ecmascript)");
;
;
;
const metadata = {
    title: 'DropTheFee Residuals',
    description: 'Merchant lifetime value tracking for GoHighLevel'
};
function RootLayout({ children }) {
    // Log environment status on server startup (development only)
    if ("TURBOPACK compile-time truthy", 1) {
        const { logEnvStatus } = __turbopack_context__.r("[project]/lib/env-validation.ts [app-rsc] (ecmascript)");
        logEnvStatus();
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$5_$40$babel$2b$core$40$7$2e$28$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("html", {
        lang: "en",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$5_$40$babel$2b$core$40$7$2e$28$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("body", {
            className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_5972bc34$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].className,
            children: children
        }, void 0, false, {
            fileName: "[project]/app/layout.tsx",
            lineNumber: 25,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/layout.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
}),
"[project]/node_modules/.pnpm/next@16.1.5_@babel+core@7.28.6_react-dom@18.3.1_react@18.3.1/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/.pnpm/next@16.1.5_@babel+core@7.28.6_react-dom@18.3.1_react@18.3.1/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-rsc] (ecmascript)").vendored['react-rsc'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__70da5633._.js.map