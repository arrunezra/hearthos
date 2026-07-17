import axios from 'axios';
import { API_BASE_URL_DEV } from '@/src/utils/environment';

const TRANSLATE_API_URL = `${API_BASE_URL_DEV}/chats/translate_text.php`;

/**
 * Translates English text strings dynamically to Tamil ('ta') inside HearthOS layout views
 * @param text The string text you want to translate
 * @param targetLang Defaults to 'ta' (Tamil)
 */
export const translateTextPipeline = async (text: string, targetLang: string = 'ta'): Promise<string> => {
    if (!text.trim()) return '';

    try {
        const response = await axios.post(TRANSLATE_API_URL, {
            text: text,
            target: targetLang
        });

        if (response.data && response.data.success) {
            return response.data.translated_text;
        } else {
            console.warn("Translation fallback warning:", response.data.message);
            return text; // Gracefully fall back to original text layout if pipeline trips
        }
    } catch (error) {
        console.error("Network Translation Error Trace:", error);
        return text; // Graceful structural fallback
    }
};