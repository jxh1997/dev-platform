export interface paths {
    "/api/v1/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_live"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_ready"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_password"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AuthController_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AuthController_permissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/menus": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AuthController_menus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/demo/records": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["RecordsController_list"];
        put?: never;
        post: operations["RecordsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/demo/records/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["RecordsController_read"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/demo/records/{id}/update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["RecordsController_update"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/demo/records/{id}/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["RecordsController_remove"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        HealthResponse: {
            status: string;
        };
        LoginDto: {
            username: string;
            password: string;
        };
        TokenResponse: {
            accessToken: string;
        };
        SuccessResponse: {
            success: boolean;
        };
        ChangePasswordDto: {
            currentPassword: string;
            /** @description 新密码为 6–12 字符 */
            newPassword: string;
        };
        UserResponse: {
            userId: string;
            username: string;
            realName: string;
            roles: string[];
            homePath: string;
            mustChangePassword: boolean;
        };
        MenuMeta: {
            title: string;
            icon: string;
        };
        MenuResponse: {
            name: string;
            path: string;
            component: string;
            meta: components["schemas"]["MenuMeta"];
        };
        Object: Record<string, never>;
        RecordResponse: {
            id: string;
            code: string;
            name: string;
            /** @enum {string} */
            status: "enabled" | "disabled";
            remark: string | null;
            createdBy: string;
            version: number;
            createdAt: string;
            updatedAt: string;
        };
        RecordsPageResponse: {
            list: components["schemas"]["RecordResponse"][];
            total: number;
            page: number;
            pageSize: number;
        };
        CreateRecordDto: {
            code: string;
            name: string;
            /**
             * @default enabled
             * @enum {string}
             */
            status: "enabled" | "disabled";
            remark?: string | null;
        };
        UpdateRecordDto: {
            version: number;
            name?: string;
            /** @enum {string} */
            status?: "enabled" | "disabled";
            remark?: string | null;
        };
        VersionDto: {
            version: number;
        };
        DeleteRecordResponse: {
            id: string;
            version: number;
            deleted: boolean;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    HealthController_live: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["HealthResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    HealthController_ready: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["HealthResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    AuthController_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["TokenResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    AuthController_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["TokenResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    AuthController_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["SuccessResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    AuthController_password: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["SuccessResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    AuthController_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["UserResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    AuthController_permissions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: string[];
                        requestId: string;
                    };
                };
            };
        };
    };
    AuthController_menus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["MenuResponse"][];
                        requestId: string;
                    };
                };
            };
        };
    };
    RecordsController_list: {
        parameters: {
            query?: {
                page?: components["schemas"]["Object"];
                pageSize?: components["schemas"]["Object"];
                name?: string;
                status?: "enabled" | "disabled";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["RecordsPageResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    RecordsController_create: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRecordDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["RecordResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    RecordsController_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["RecordResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    RecordsController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRecordDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["RecordResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    RecordsController_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VersionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {number} */
                        code: 0;
                        message: string;
                        data: components["schemas"]["DeleteRecordResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
}
