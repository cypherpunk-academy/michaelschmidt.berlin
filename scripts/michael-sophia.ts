import YAML from 'yaml';
import { format, addYears, addDays, addHours, isAfter } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

import fs from 'fs';
import { text } from 'sophia';

const CHAPTERS_IN_PREVIEW = 3;
const PREVIEW_DATE = '11-09';
const IMAGE_PATH = 'images/sophia/chapter';
const CHAPTER_PATH = 'content/de/story/sophia-';
const WAITING_TEXTS = [
    'Hier musst du noch ein wenig Geduld haben... Bald geht es weiter!',
    'Nur noch eine kurze Zeit, dann erscheint hier der Text.',
    'Er kommt ... er kommt ... Er kommt. Nicht jetzt ... aber bald.'
];
const timeZone = 'Europe/Berlin';

export default (): void => {
    console.log(`Michael Sophia: ${text.length}`);

    for (let i = 0; i < text.length; i++) {
        const chapter = text[i];
        const [yamlText, content] = chapter.split('\n---\n');

        const yaml = YAML.parse(yamlText);
        const year = format(addDays(new Date(), 7), 'yyyy');

        yaml.date = addHours(
            utcToZonedTime(
                `${year}-${
                    i < CHAPTERS_IN_PREVIEW
                        ? PREVIEW_DATE
                        : `12-${`0${i + 1}`.slice(-2)}`
                }`,
                timeZone
            ),
            6
        );

        yaml.expirydate = addHours(
            addYears(utcToZonedTime(`${year}-01-07`, timeZone), 1),
            6
        );

        yaml.type = 'sophia';
        yaml.image = `${IMAGE_PATH}${i + 1}.jpg`;
        yaml.weight = i + 1;
        yaml.next = i + 2;

        const filePath = `${process.cwd()}/${CHAPTER_PATH}${i + 1}.md`;

        const actualContent =
            i < CHAPTERS_IN_PREVIEW && isAfter(new Date(), yaml.date)
                ? WAITING_TEXTS[i]
                : content;

        fs.writeFileSync(
            filePath,
            `---\n${YAML.stringify(yaml)}---\n${actualContent}`
        );

        console.log(i + 1);
    }
};
