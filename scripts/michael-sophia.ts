import YAML from 'yaml';
import { format, addYears, subDays, addHours, isAfter } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

import fs from 'fs';
import path from 'path';

const timeZone = 'Europe/Berlin';
const CHAPTERS_IN_PREVIEW = 0;
const PREVIEW_DATE = '11-12';
const IMAGE_PATH = 'images/sophia/chapter';
const CHAPTER_PATH = 'content/de/story/sophia-';
const WAITING_TEXTS = ['Bald ....', 'Demächst ...', 'In Vorbereitung ......'];

const directoryPath = path.join(__dirname, '../resources/michael-sophia/de');
export const text = fs
    .readdirSync(directoryPath)
    .filter((filename) => path.extname(filename) === '.md')
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
        const year = format(subDays(new Date(), 7), 'yyyy');

        yaml.date = addHours(
            utcToZonedTime(
                `${year}-${
                    i < CHAPTERS_IN_PREVIEW
                        ? PREVIEW_DATE
                        : `12-${`0${i + 1}`.slice(-2)}`
                }`,
                timeZone
            ),
            4
        );

        yaml.expirydate = addHours(
            addYears(utcToZonedTime(`${year}-01-07`, timeZone), 1),
            4
        );

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
