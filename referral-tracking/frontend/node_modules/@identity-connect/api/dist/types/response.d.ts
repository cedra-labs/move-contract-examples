export interface BackendSuccessResponse<T> {
    data: T;
    status: 200;
    success: true;
}
export interface BackendErrorResponse {
    message: string;
    status: 400 | 401 | 500;
    success: false;
}
export type BackendResponse<T> = BackendSuccessResponse<T>;
//# sourceMappingURL=response.d.ts.map