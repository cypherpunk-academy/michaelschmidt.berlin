import YAML from 'yaml';
import { isAfter } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

import fs from 'fs';
import path from 'path';

const timeZone = 'Europe/Berlin';
const PUBLISH_HOUR = 6;
const CHAPTERS_IN_PREVIEW = 0;
const PREVIEW_DATE = '11-12';
const IMAGE_PATH = 'images/sophia/chapter';
const CHAPTER_PATH = 'content/de/story/sophia-';
const WAITING_TEXTS = ['Bald ....', 'Demächst ...', 'In Vorbereitung ......'];

const sourceDirectoryPath =
    process.env.MICHAEL_SOPHIA_DE_SOURCE ??
    path.resolve(__dirname, '../../../Bücher/michael-sophia/text/de');
const baseDirectoryPath = path.join(__dirname, '../resources/michael-sophia');
const directoryPath = path.join(baseDirectoryPath, 'de');

const ensureLocalChapters = (): void => {
    if (!fs.existsSync(sourceDirectoryPath)) {
        console.warn(
            `Michael Sophia source directory missing: ${sourceDirectoryPath}. Using existing resources.`
        );
        return;
    }

    if (fs.existsSync(baseDirectoryPath) && fs.lstatSync(baseDirectoryPath).isSymbolicLink()) {
        fs.unlinkSync(baseDirectoryPath);
    }

    fs.mkdirSync(baseDirectoryPath, { recursive: true });
    fs.rmSync(directoryPath, { recursive: true, force: true });
    fs.cpSync(sourceDirectoryPath, directoryPath, { recursive: true });

    console.log(`Copied Michael Sophia chapters from ${sourceDirectoryPath}`);
};

ensureLocalChapters();
const berlinYear = (instant: Date): number =>
    Number(
        new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
        }).format(instant)
    );

const berlinDateTime = (year: number, monthDay: string): Date =>
    zonedTimeToUtc(
        `${year}-${monthDay} ${String(PUBLISH_HOUR).padStart(2, '0')}:00:00`,
        timeZone
    );

/** One calendar day per episode, 06:00 Europe/Berlin, independent of the machine timezone. */
export const chapterWindow = (
    index: number,
    now: Date
): { date: Date; expirydate: Date } => {
    const seasonYear = berlinYear(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const monthDay =
        index < CHAPTERS_IN_PREVIEW
            ? PREVIEW_DATE
            : `12-${String(index + 1).padStart(2, '0')}`;

    return {
        date: berlinDateTime(seasonYear, monthDay),
        expirydate: berlinDateTime(seasonYear + 1, '01-07'),
    };
};

export const text = fs
    .readdirSync(directoryPath)
    .filter((filename) => path.extname(filename) === '.md')
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map((filename) => {
        const filePath = path.join(directoryPath, filename);
        return fs.readFileSync(filePath, 'utf8');
    });

export default (): void => {
    console.log(`Michael Sophia: ${text.length}`);

    for (let i = 0; i < text.length; i++) {
        const chapter = text[i];
        const [yamlText, content] = chapter.split('\n---\n');

        const yaml = YAML.parse(yamlText);
        const schedule = chapterWindow(i, new Date());

        yaml.date = schedule.date;
        yaml.expirydate = schedule.expirydate;

        yaml.type = 'sophia';
        yaml.image = `${IMAGE_PATH}${i + 1}.jpg`;
        yaml.weight = i + 1;
        yaml.next = i + 2;

        const filePath = `${process.cwd()}/${CHAPTER_PATH}${i + 1}.md`;

        const contentWithoutImages = content.replace(/!\[(.*?)\]\((.*?)\)/, '');
        const actualContent =
            i < CHAPTERS_IN_PREVIEW && isAfter(new Date(), yaml.date)
                ? WAITING_TEXTS[i % WAITING_TEXTS.length]
                : contentWithoutImages;

        fs.writeFileSync(
            filePath,
            `---\n${YAML.stringify(yaml)}---\n${actualContent}`
        );

        console.log(i + 1);
    }
};
