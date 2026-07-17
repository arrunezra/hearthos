// 🚀 Tells TypeScript to trust the module and allow an open layout signature
declare module 'react-native-share-receiver' {
    export interface SharedItem {
        type: string;
        data: string;
    }

    export function getSharedData(): Promise<SharedItem[]>;
}