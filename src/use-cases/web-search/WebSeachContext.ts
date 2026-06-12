export type WebSearchContext = {
    prompt: string;
    subject: string;
    goals: {
        name: string;
        type: string;
        description: string;
        isRequired: boolean;
    }[];
}
