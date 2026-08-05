import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

export interface GlossaryEntry {
    kind: 'planet' | 'sign' | 'house';
    term: string;
    short: { body: string; author: string | null };
    long: { body: string; author: string | null } | null;
}

/**
 * Имена в интерфейсе и в корпусе расходятся: 'Sun' против 'SUN', 'Rahu'
 * против 'NODE', русские названия знаков против английских канонов. Ключ
 * нормализуется здесь, чтобы вызывающий код мог писать как ему удобно.
 */
const ALIASES: Record<string, string> = {
    rahu: 'NODE', 'северный узел': 'NODE', 'восходящий узел': 'NODE',
    ketu: 'SOUTH_NODE', 'южный узел': 'SOUTH_NODE', 'нисходящий узел': 'SOUTH_NODE',
    'чёрная луна': 'LILITH', 'черная луна': 'LILITH',
    овен: 'ARIES', телец: 'TAURUS', близнецы: 'GEMINI', рак: 'CANCER',
    лев: 'LEO', дева: 'VIRGO', весы: 'LIBRA', скорпион: 'SCORPIO',
    стрелец: 'SAGITTARIUS', козерог: 'CAPRICORN', водолей: 'AQUARIUS',
    рыбы: 'PISCES',
    солнце: 'SUN', луна: 'MOON', меркурий: 'MERCURY', венера: 'VENUS',
    марс: 'MARS', юпитер: 'JUPITER', сатурн: 'SATURN', уран: 'URANUS',
    нептун: 'NEPTUNE', плутон: 'PLUTO',
};

function canonical(term: string | number): string {
    const raw = String(term).trim();
    if (/^\d+$/.test(raw)) return raw; // дом задаётся номером
    const lower = raw.toLowerCase();
    return (ALIASES[lower] ?? raw).toUpperCase();
}

interface GlossaryValue {
    ready: boolean;
    lookup: (kind: GlossaryEntry['kind'], term: string | number) => GlossaryEntry | null;
}

const GlossaryContext = createContext<GlossaryValue>({ ready: false, lookup: () => null });

/**
 * Словарь на 37 терминов тянется один раз за сессию и живёт в памяти.
 * Тултип должен появляться мгновенно на наведение; запрос на сервер в этот
 * момент превратил бы его в модалку с задержкой.
 */
export function GlossaryProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<Map<string, GlossaryEntry>>(new Map());

    useEffect(() => {
        let cancelled = false;
        axios
            .get<{ terms: GlossaryEntry[] }>(`${API_BASE_URL}/api/corpus/glossary`)
            .then(({ data }) => {
                if (cancelled) return;
                const map = new Map<string, GlossaryEntry>();
                for (const e of data.terms ?? []) map.set(`${e.kind}:${e.term}`, e);
                setEntries(map);
            })
            .catch(() => {
                // Корпус недоступен — интерфейс работает без подсказок.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const lookup = useCallback(
        (kind: GlossaryEntry['kind'], term: string | number) =>
            entries.get(`${kind}:${canonical(term)}`) ?? null,
        [entries],
    );

    const value = useMemo(() => ({ ready: entries.size > 0, lookup }), [entries.size, lookup]);
    return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

export function useGlossary(): GlossaryValue {
    return useContext(GlossaryContext);
}
