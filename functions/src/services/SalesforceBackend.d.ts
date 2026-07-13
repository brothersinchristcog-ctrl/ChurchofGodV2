/**
 * SalesforceBackend Service (Middleware)
 * Implements the OAuth 2.0 JWT Bearer Flow for server-to-server
 * communication as per the COG Solution Design Document §6.1.1.
 */
export interface SalesforceConfig {
    consumerKey: string;
    username: string;
    loginUrl: string;
    privateKey: string;
}
export declare class SalesforceBackend {
    private config;
    private accessToken;
    private instanceUrl;
    private tokenExpiry;
    constructor(config: SalesforceConfig);
    /**
     * Generates a signed JWT and exchanges it for a Salesforce Access Token.
     * Standard RS256 algorithm used for security.
     */
    private getAccessToken;
    /**
     * Generic SOQL Query execution via REST API
     */
    query(soql: string): Promise<any>;
    /**
     * Fetches the Daily Promise
     */
    getDailyPromise(): Promise<any>;
    /**
     * Fetches Upcoming Events
     */
    getUpcomingEvents(limit?: number): Promise<any>;
    checkContact(phone: string): Promise<{
        exists: boolean;
        member: {
            id: any;
            accountId: any;
            name: string;
            firstName: any;
            lastName: any;
            email: any;
            phone: any;
            userType: any;
            mailingCity: any;
            mailingState: any;
            mailingStreet: any;
            joinDate: any;
        };
    } | {
        exists: boolean;
        member?: never;
    }>;
    /**
     * Fetches today's birthdays from Salesforce
     */
    getTodayBirthdays(): Promise<any[]>;
    /**
     * Fetches today's wedding anniversaries from Salesforce
     */
    getTodayAnniversaries(): Promise<any[]>;
}
//# sourceMappingURL=SalesforceBackend.d.ts.map