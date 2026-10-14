export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

function cleanSpeechForTTS(rawText: string): string {
    return rawText
        .replace(/```[a-z]*\n[\s\S]*?```/g, '')
        .replace(/\\(text|textbf|mathbf|mathit)\{([^}]+)\}/g, '$2')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 upon $2')
        .replace(/\\int/g, 'integral of ')
        .replace(/\\sum/g, 'sum of ')
        .replace(/\\lim/g, 'limit ')
        .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
        .replace(/\\\\[a-zA-Z]+/g, ' ')
        .replace(/\$([^$]+)\$/g, '$1')
        .replace(/[_^{}\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchGoogleTTSChunk(chunk: string): Promise<Buffer> {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(chunk) + '&tl=hi&client=tw-ob';
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/'
        }
    });
    if (!res.ok) {
        throw new Error('Google TTS HTTP error: ' + res.status);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}

async function synthesizeFemaleSpeech(text: string): Promise<Buffer> {
    const cleaned = cleanSpeechForTTS(text);
    if (!cleaned) throw new Error('Text is empty after cleaning');

    const sentences = cleaned.match(/[^.?!,;\n]+[.?!,;\n]?/g) || [cleaned];
    const chunks: string[] = [];
    let current = '';

    for (const s of sentences) {
        const trimmed = s.trim();
        if (!trimmed) continue;
        if ((current + ' ' + trimmed).length <= 180) {
            current = current ? (current + ' ' + trimmed) : trimmed;
        } else {
            if (current) chunks.push(current);
            if (trimmed.length <= 180) {
                current = trimmed;
            } else {
                const words = trimmed.split(' ');
                let sub = '';
                for (const w of words) {
                    if ((sub + ' ' + w).length <= 180) {
                        sub = sub ? (sub + ' ' + w) : w;
                    } else {
                        if (sub) chunks.push(sub);
                        sub = w;
                    }
                }
                current = sub;
            }
        }
    }
    if (current) chunks.push(current);

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
        const buf = await fetchGoogleTTSChunk(chunk);
        buffers.push(buf);
    }
    return Buffer.concat(buffers);
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        const buffer = await synthesizeFemaleSpeech(text);
        
        res.status(200).json({ 
            success: true,
            audio: buffer.toString('base64'),
            audioBase64: buffer.toString('base64')
        });
    } catch (error: any) {
        console.error('Vercel TTS Error:', error);
        res.status(500).json({ error: error.message || 'Speech synthesis failed' });
    }
}
