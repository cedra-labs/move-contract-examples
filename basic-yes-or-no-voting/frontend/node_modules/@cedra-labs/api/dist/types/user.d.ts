export interface UserData {
    confirmedPrivacyPolicy: boolean;
    confirmedTOS?: boolean;
    createdAt: Date;
    id: string;
    updatedAt: Date;
    username: string;
}
export interface ProjectData {
    adminUserId: string;
    allowPairingsWithoutHostname: boolean;
    createdAt: Date;
    description: string;
    hostname: string;
    iconUrl: string | null;
    id: string;
    isDappHostnameVerified: boolean;
    name: string;
    updatedAt: Date;
}
//# sourceMappingURL=user.d.ts.map