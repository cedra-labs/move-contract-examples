export declare function openPrompt(url: string | URL, size?: {
    height: number;
    width: number;
}): Window;
export interface PromptApproval<TResponseArgs> {
    args: TResponseArgs;
    status: 'approved';
}
export interface PromptDismissal {
    status: 'dismissed';
}
export type PromptResponse<TResponseArgs> = PromptApproval<TResponseArgs> | PromptDismissal;
export declare function waitForPromptResponse<TResponseArgs>(promptWindow: Window): Promise<PromptResponse<TResponseArgs>>;
//# sourceMappingURL=prompt.d.ts.map