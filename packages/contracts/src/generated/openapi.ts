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
    "/api/v1/auth/captcha/challenge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_challenge"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/captcha/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_verifyCaptcha"];
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
    "/api/v1/system/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SystemController_users"];
        put?: never;
        post: operations["SystemController_createUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}/update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_editUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SystemController_roles"];
        put?: never;
        post: operations["SystemController_createRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/{id}/update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_editRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/{id}/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_deleteRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/menus": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SystemController_menus"];
        put?: never;
        post: operations["SystemController_createMenu"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/menus/{id}/update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_editMenu"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/menus/{id}/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_deleteMenu"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SystemController_user"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}/assign-role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_assignRoles"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_resetPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/roles/{id}/grants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_grants"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SystemController_permissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/page-components": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SystemController_components"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SystemController_sessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/users/{id}/revoke-session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SystemController_revoke"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SessionsController_sessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SessionsController_revoke"];
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
        LoginCaptchaChallengeResponse: {
            challengeId: string;
            /** Format: date-time */
            expiresAt: string;
        };
        VerifyLoginCaptchaDto: {
            challengeId: string;
            progress: number;
        };
        LoginCaptchaVerifyResponse: {
            captchaToken: string;
            /** Format: date-time */
            expiresAt: string;
        };
        LoginDto: {
            username: string;
            password: string;
            /** @description 滑块校验返回的浏览器绑定、一次性登录凭证 */
            captchaToken: string;
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
            isSuperAdmin: boolean;
            userId: string;
            username: string;
            realName: string;
            roles: string[];
            homePath: string;
            mustChangePassword: boolean;
        };
        MenuMeta: {
            order?: number;
            hideInMenu?: boolean;
            link?: string;
            title: string;
            icon: string;
        };
        MenuResponse: {
            children: components["schemas"]["MenuResponse"][];
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
        ManagedUserResponse: {
            id: string;
            username: string;
            realName: string;
            enabled: boolean;
            mustChangePassword: boolean;
            version: number;
            roleIds: string[];
            isSuperAdmin: boolean;
        };
        UsersPageResponse: {
            list: components["schemas"]["ManagedUserResponse"][];
            total: number;
            page: number;
            pageSize: number;
        };
        CreateUserDto: {
            username: string;
            realName: string;
            password: string;
        };
        UpdateUserDto: {
            version: number;
            realName?: string;
            enabled?: boolean;
        };
        GrantDto: {
            code: string;
            /** @enum {string} */
            scope: "ALL" | "SELF";
        };
        ManagedRoleResponse: {
            id: string;
            code: string;
            name: string;
            enabled: boolean;
            isSuperAdmin: boolean;
            version: number;
            permissions: components["schemas"]["GrantDto"][];
            menuIds: string[];
        };
        RolesPageResponse: {
            list: components["schemas"]["ManagedRoleResponse"][];
            total: number;
            page: number;
            pageSize: number;
        };
        CreateRoleDto: {
            code: string;
            name: string;
        };
        UpdateRoleDto: {
            version: number;
            name?: string;
            enabled?: boolean;
        };
        ExpectedVersion: {
            version: number;
        };
        ManagedMenuResponse: {
            /** @default lucide:folder */
            icon: string;
            name: string;
            path: string;
            title: string;
            component: string;
            permission: string;
            parentId: string | null;
            /** @enum {string} */
            type: "directory" | "page" | "button" | "link";
            sort: number;
            visible: boolean;
            enabled: boolean;
            id: string;
            code: string;
            version: number;
        };
        MenusPageResponse: {
            list: components["schemas"]["ManagedMenuResponse"][];
            total: number;
            page: number;
            pageSize: number;
        };
        CreateMenuDto: {
            /** @default lucide:folder */
            icon: string;
            name: string;
            path: string;
            title: string;
            component: string;
            permission: string;
            parentId: string | null;
            /** @enum {string} */
            type: "directory" | "page" | "button" | "link";
            sort: number;
            visible: boolean;
            enabled: boolean;
            code: string;
        };
        UpdateMenuDto: {
            /** @default lucide:folder */
            icon: string;
            name: string;
            path: string;
            title: string;
            component: string;
            permission: string;
            parentId: string | null;
            /** @enum {string} */
            type: "directory" | "page" | "button" | "link";
            sort: number;
            visible: boolean;
            enabled: boolean;
            version: number;
        };
        AssignRolesDto: {
            version: number;
            roleIds: string[];
        };
        ResetPasswordDto: {
            version: number;
            password: string;
        };
        RoleGrantsDto: {
            version: number;
            /** @description 全量替换角色操作权限及各操作范围 */
            permissions: components["schemas"]["GrantDto"][];
            /** @description 全量替换导航，不隐式增加操作权限 */
            menuIds: string[];
        };
        PermissionResponse: {
            code: string;
            title: string;
        };
        PageComponentResponse: {
            component: string;
            path: string;
            permission: string;
        };
        SessionResponse: {
            id: string;
            current: boolean;
            expiresAt: string;
            revokedAt: string | null;
            revokedReason: string | null;
        };
        SessionIdDto: {
            sessionId: string;
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
    AuthController_challenge: {
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
                        data: components["schemas"]["LoginCaptchaChallengeResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    AuthController_verifyCaptcha: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyLoginCaptchaDto"];
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
                        data: components["schemas"]["LoginCaptchaVerifyResponse"];
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
    SystemController_users: {
        parameters: {
            query?: {
                page?: components["schemas"]["Object"];
                pageSize?: components["schemas"]["Object"];
                search?: string;
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
                        data: components["schemas"]["UsersPageResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_createUser: {
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
                "application/json": components["schemas"]["CreateUserDto"];
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
                        data: components["schemas"]["ManagedUserResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_editUser: {
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
                "application/json": components["schemas"]["UpdateUserDto"];
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
                        data: components["schemas"]["ManagedUserResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_roles: {
        parameters: {
            query?: {
                page?: components["schemas"]["Object"];
                pageSize?: components["schemas"]["Object"];
                search?: string;
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
                        data: components["schemas"]["RolesPageResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_createRole: {
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
                "application/json": components["schemas"]["CreateRoleDto"];
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
                        data: components["schemas"]["ManagedRoleResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_editRole: {
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
                "application/json": components["schemas"]["UpdateRoleDto"];
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
                        data: components["schemas"]["ManagedRoleResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_deleteRole: {
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
                "application/json": components["schemas"]["ExpectedVersion"];
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
    SystemController_menus: {
        parameters: {
            query?: {
                page?: components["schemas"]["Object"];
                pageSize?: components["schemas"]["Object"];
                search?: string;
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
                        data: components["schemas"]["MenusPageResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_createMenu: {
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
                "application/json": components["schemas"]["CreateMenuDto"];
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
                        data: components["schemas"]["ManagedMenuResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_editMenu: {
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
                "application/json": components["schemas"]["UpdateMenuDto"];
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
                        data: components["schemas"]["ManagedMenuResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_deleteMenu: {
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
                "application/json": components["schemas"]["ExpectedVersion"];
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
    SystemController_user: {
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
                        data: components["schemas"]["ManagedUserResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_assignRoles: {
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
                "application/json": components["schemas"]["AssignRolesDto"];
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
                        data: components["schemas"]["ManagedUserResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_resetPassword: {
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
                "application/json": components["schemas"]["ResetPasswordDto"];
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
    SystemController_grants: {
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
                "application/json": components["schemas"]["RoleGrantsDto"];
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
                        data: components["schemas"]["ManagedRoleResponse"];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_permissions: {
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
                        data: components["schemas"]["PermissionResponse"][];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_components: {
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
                        data: components["schemas"]["PageComponentResponse"][];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_sessions: {
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
                        data: components["schemas"]["SessionResponse"][];
                        requestId: string;
                    };
                };
            };
        };
    };
    SystemController_revoke: {
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
                "application/json": components["schemas"]["SessionIdDto"];
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
    SessionsController_sessions: {
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
                        data: components["schemas"]["SessionResponse"][];
                        requestId: string;
                    };
                };
            };
        };
    };
    SessionsController_revoke: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SessionIdDto"];
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
}
